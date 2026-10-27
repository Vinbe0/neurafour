import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { checkWin, createEmptyBoard, getAvailableRow, isBoardFull, COLS } from '../src/rules.ts';
import type { BoardType, PlayerType } from '../src/types.ts';
import { ERROR_MESSAGES } from '../src/protocol.ts';
import type { ErrorCode } from '../src/protocol.ts';

// NeuraFour multiplayer server: private rooms of two players. The server owns the
// board and turn order and validates every move with the same rules as the client.

interface Player {
  ws: WebSocket;
  username: string;
  avatar: string;
  side: PlayerType;
  // Secret the browser keeps so it can take this seat back after a page reload
  token: string;
  connected: boolean;
  leaveTimer?: ReturnType<typeof setTimeout>;
}

interface ChatMessage {
  id: string;
  username: string;
  avatar: string;
  text: string;
  time: string;
}

interface Room {
  code: string;
  players: Player[];
  board: BoardType;
  // Every move so far, so a reconnecting player can rebuild the game
  moves: { column: number; player: PlayerType }[];
  turn: PlayerType;
  status: 'playing' | 'finished';
  chat: ChatMessage[];
}

const MAX_NAME = 18;
const MAX_AVATAR = 8;
const MAX_CHAT = 300;
const CHAT_HISTORY = 50;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O, 1/I


// Untrusted text from clients: trimmed, length-limited, with a fallback when empty
const cleanText = (value: unknown, max: number, fallback: string) => {
  const text = typeof value === 'string' ? value.trim().slice(0, max) : '';
  return text || fallback;
};

const send = (ws: WebSocket, payload: object) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
};

// The code is translated by the app; the English text is for logs and older clients
const sendError = (ws: WebSocket, code: ErrorCode) => send(ws, { type: 'error', code, message: ERROR_MESSAGES[code] });

export interface GameServer {
  server: Server;
  rooms: Map<string, Room>;
}

export interface GameServerOptions {
  // How long a disconnected player's seat is kept for them to reconnect
  reconnectGraceMs?: number;
}

export const createGameServer = ({ reconnectGraceMs = 30_000 }: GameServerOptions = {}): GameServer => {
  const rooms = new Map<string, Room>();
  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  const broadcast = (room: Room, payload: object) => {
    for (const player of room.players) send(player.ws, payload);
  };

  const opponentOf = (room: Room, player: Player) => room.players.find((p) => p !== player);

  const closeRoom = (room: Room, leaving: Player) => {
    const other = opponentOf(room, leaving);
    if (other) send(other.ws, { type: 'opponent_left' });
    for (const player of room.players) clearTimeout(player.leaveTimer);
    rooms.delete(room.code);
  };

  const generateRoomCode = () => {
    let code: string;
    do {
      code = Array.from({ length: 5 }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join('');
    } while (rooms.has(code));
    return code;
  };

  wss.on('connection', (ws) => {
    let room: Room | null = null;
    let side: PlayerType | null = null;

    ws.on('message', (raw) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return; // ignore malformed messages
      }

      switch (data.type) {
        case 'create_room': {
          const code = generateRoomCode();
          const token = randomUUID();
          room = {
            code,
            players: [{
              ws,
              username: cleanText(data.username, MAX_NAME, 'Player'),
              avatar: cleanText(data.avatar, MAX_AVATAR, '🤖'),
              side: 'red',
              token,
              connected: true,
            }],
            board: createEmptyBoard(),
            moves: [],
            turn: 'red',
            status: 'playing',
            chat: [],
          };
          side = 'red';
          rooms.set(code, room);
          send(ws, { type: 'room_created', roomCode: code, side, token });
          break;
        }

        case 'join_room': {
          const code = cleanText(data.roomCode, 5, '').toUpperCase();
          const target = rooms.get(code);
          if (!target) {
            sendError(ws, 'room_not_found');
            return;
          }
          if (target.players.length >= 2) {
            sendError(ws, 'room_full');
            return;
          }

          const username = cleanText(data.username, MAX_NAME, 'Player');
          const avatar = cleanText(data.avatar, MAX_AVATAR, '🤖');
          const token = randomUUID();
          room = target;
          side = 'yellow';
          room.players.push({ ws, username, avatar, side, token, connected: true });

          const host = room.players[0];
          send(ws, {
            type: 'room_joined',
            roomCode: code,
            side,
            token,
            opponent: { username: host.username, avatar: host.avatar },
            chatHistory: room.chat,
          });
          send(host.ws, { type: 'opponent_joined', opponent: { username, avatar } });
          broadcast(room, { type: 'game_start', turn: 'red' });
          break;
        }

        case 'rejoin_room': {
          const code = cleanText(data.roomCode, 5, '').toUpperCase();
          const target = rooms.get(code);
          const player = target?.players.find((p) => p.token === data.token);
          if (!target || !player) {
            sendError(ws, 'room_not_found');
            return;
          }

          clearTimeout(player.leaveTimer);
          player.ws = ws;
          player.connected = true;
          room = target;
          side = player.side;

          const other = opponentOf(target, player);
          send(ws, {
            type: 'room_rejoined',
            roomCode: code,
            side,
            opponent: other ? { username: other.username, avatar: other.avatar } : null,
            moves: target.moves,
            chatHistory: target.chat,
          });
          if (other) send(other.ws, { type: 'opponent_reconnected' });
          break;
        }

        case 'leave_room': {
          if (!room) return;
          const player = room.players.find((p) => p.ws === ws);
          if (player) closeRoom(room, player);
          room = null;
          side = null;
          break;
        }

        case 'make_move': {
          if (!room || !side) return;
          const column = data.column;

          if (room.status !== 'playing') {
            sendError(ws, 'game_over');
            return;
          }
          if (room.turn !== side) {
            sendError(ws, 'not_your_turn');
            return;
          }
          if (typeof column !== 'number' || !Number.isInteger(column) || column < 0 || column >= COLS) {
            sendError(ws, 'invalid_column');
            return;
          }
          const row = getAvailableRow(room.board, column);
          if (row === -1) {
            sendError(ws, 'column_full');
            return;
          }

          room.board[row][column] = side;
          room.moves.push({ column, player: side });
          const { winner, cells } = checkWin(room.board);
          const isDraw = !winner && isBoardFull(room.board);
          if (winner || isDraw) room.status = 'finished';
          else room.turn = side === 'red' ? 'yellow' : 'red';

          broadcast(room, { type: 'move_made', column, row, player: side, winner, winningCells: cells, isDraw });
          break;
        }

        case 'chat': {
          if (!room || !side) return;
          const text = cleanText(data.text, MAX_CHAT, '');
          if (!text) return;
          const sender = room.players.find((p) => p.ws === ws);
          const message: ChatMessage = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            username: sender?.username ?? 'Player',
            avatar: sender?.avatar ?? '🤖',
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          room.chat.push(message);
          if (room.chat.length > CHAT_HISTORY) room.chat.shift();
          broadcast(room, { type: 'chat_received', message });
          break;
        }

        case 'restart_request': {
          if (!room) return;
          const other = room.players.find((p) => p.ws !== ws);
          if (other) send(other.ws, { type: 'opponent_wants_restart' });
          break;
        }

        case 'restart_confirm': {
          if (!room) return;
          room.board = createEmptyBoard();
          room.moves = [];
          room.turn = 'red';
          room.status = 'playing';
          broadcast(room, { type: 'game_restarted', turn: 'red' });
          break;
        }
      }
    });

    // A dropped connection (often just a page reload) keeps the seat for a while;
    // the room closes only if the player does not come back in time
    ws.on('close', () => {
      const current = room;
      if (!current || rooms.get(current.code) !== current) return;
      const player = current.players.find((p) => p.ws === ws);
      if (!player) return;

      player.connected = false;
      const other = opponentOf(current, player);
      if (other) send(other.ws, { type: 'opponent_disconnected', graceSeconds: Math.round(reconnectGraceMs / 1000) });
      player.leaveTimer = setTimeout(() => {
        if (!player.connected && rooms.get(current.code) === current) closeRoom(current, player);
      }, reconnectGraceMs);
    });
  });

  return { server, rooms };
};
