import { createServer } from 'node:http';
import type { Server } from 'node:http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { checkWin, createEmptyBoard, getAvailableRow, isBoardFull, COLS } from '../src/rules.ts';
import type { BoardType, PlayerType } from '../src/types.ts';

// NeuraFour multiplayer server: private rooms of two players. The server owns the
// board and turn order and validates every move with the same rules as the client.

interface Player {
  ws: WebSocket;
  username: string;
  avatar: string;
  side: PlayerType;
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
  turn: PlayerType;
  status: 'playing' | 'finished';
  chat: ChatMessage[];
}

const MAX_NAME = 18;
const MAX_AVATAR = 8;
const MAX_CHAT = 300;
const CHAT_HISTORY = 50;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O, 1/I

// Messages are sent as "Russian / English"; the client shows the half matching its language
const ERRORS = {
  roomNotFound: 'Комната не найдена / Room not found.',
  roomFull: 'Комната заполнена / Room is full.',
  notYourTurn: 'Не ваш ход / Not your turn.',
  gameOver: 'Партия уже завершена / Game is already over.',
  invalidColumn: 'Некорректная колонка / Invalid column.',
  columnFull: 'Колонка заполнена / Column is full.',
  opponentLeft: 'Оппонент покинул бой. / Opponent disconnected.',
};

// Untrusted text from clients: trimmed, length-limited, with a fallback when empty
const cleanText = (value: unknown, max: number, fallback: string) => {
  const text = typeof value === 'string' ? value.trim().slice(0, max) : '';
  return text || fallback;
};

const send = (ws: WebSocket, payload: object) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
};

export interface GameServer {
  server: Server;
  rooms: Map<string, Room>;
}

export const createGameServer = (): GameServer => {
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
          room = {
            code,
            players: [{ ws, username: cleanText(data.username, MAX_NAME, 'Player'), avatar: cleanText(data.avatar, MAX_AVATAR, '🤖'), side: 'red' }],
            board: createEmptyBoard(),
            turn: 'red',
            status: 'playing',
            chat: [],
          };
          side = 'red';
          rooms.set(code, room);
          send(ws, { type: 'room_created', roomCode: code, side });
          break;
        }

        case 'join_room': {
          const code = cleanText(data.roomCode, 5, '').toUpperCase();
          const target = rooms.get(code);
          if (!target) {
            send(ws, { type: 'error', message: ERRORS.roomNotFound });
            return;
          }
          if (target.players.length >= 2) {
            send(ws, { type: 'error', message: ERRORS.roomFull });
            return;
          }

          const username = cleanText(data.username, MAX_NAME, 'Player');
          const avatar = cleanText(data.avatar, MAX_AVATAR, '🤖');
          room = target;
          side = 'yellow';
          room.players.push({ ws, username, avatar, side });

          const host = room.players[0];
          send(ws, {
            type: 'room_joined',
            roomCode: code,
            side,
            opponent: { username: host.username, avatar: host.avatar },
            chatHistory: room.chat,
          });
          send(host.ws, { type: 'opponent_joined', opponent: { username, avatar } });
          broadcast(room, { type: 'game_start', turn: 'red' });
          break;
        }

        case 'make_move': {
          if (!room || !side) return;
          const column = data.column;

          if (room.status !== 'playing') {
            send(ws, { type: 'error', message: ERRORS.gameOver });
            return;
          }
          if (room.turn !== side) {
            send(ws, { type: 'error', message: ERRORS.notYourTurn });
            return;
          }
          if (typeof column !== 'number' || !Number.isInteger(column) || column < 0 || column >= COLS) {
            send(ws, { type: 'error', message: ERRORS.invalidColumn });
            return;
          }
          const row = getAvailableRow(room.board, column);
          if (row === -1) {
            send(ws, { type: 'error', message: ERRORS.columnFull });
            return;
          }

          room.board[row][column] = side;
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
          room.turn = 'red';
          room.status = 'playing';
          broadcast(room, { type: 'game_restarted', turn: 'red' });
          break;
        }
      }
    });

    ws.on('close', () => {
      if (!room || rooms.get(room.code) !== room) return;
      for (const player of room.players) {
        if (player.ws !== ws) send(player.ws, { type: 'opponent_left', message: ERRORS.opponentLeft });
      }
      rooms.delete(room.code);
    });
  });

  return { server, rooms };
};
