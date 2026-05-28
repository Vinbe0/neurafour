import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import { createServer } from 'http';

const app = express();
const port = process.env.PORT || 5001;

// Lightweight HTTP checkup
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: Object.keys(rooms).length });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Memory ledger of active rooms
// roomCode -> { players: [{ ws, username, avatar, side }, ...], board, turn, chat: [] }
const rooms = {};

function createEmptyBoard() {
  return Array(6).fill(null).map(() => Array(7).fill(null));
}

function getAvailableRow(board, column) {
  for (let row = 5; row >= 0; row -= 1) {
    if (board[row][column] === null) return row;
  }
  return -1;
}

function checkWin(board) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [-1, 1],
  ];

  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const player = board[row][col];
      if (!player) continue;

      for (const [dr, dc] of directions) {
        const cells = [[row, col]];
        for (let step = 1; step < 4; step += 1) {
          const nextRow = row + dr * step;
          const nextCol = col + dc * step;
          if (
            nextRow < 0 ||
            nextRow >= 6 ||
            nextCol < 0 ||
            nextCol >= 7 ||
            board[nextRow][nextCol] !== player
          ) {
            break;
          }
          cells.push([nextRow, nextCol]);
        }
        if (cells.length === 4) return { winner: player, cells };
      }
    }
  }

  return { winner: null, cells: [] };
}

function isBoardFull(board) {
  return board[0].every((cell) => cell !== null);
}

// Helper: Generate unique lobby code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

wss.on('connection', (ws) => {
  let userRoomCode = null;
  let userSide = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'create_room': {
          const roomCode = generateRoomCode();
          userRoomCode = roomCode;
          userSide = 'red';

          rooms[roomCode] = {
            code: roomCode,
            players: [
              {
                ws,
                username: data.username,
                avatar: data.avatar,
                side: 'red',
              }
            ],
            board: createEmptyBoard(),
            turn: 'red',
            status: 'playing',
            chat: [],
          };

          ws.send(JSON.stringify({
            type: 'room_created',
            roomCode,
            side: 'red',
          }));
          break;
        }

        case 'join_room': {
          const { roomCode, username, avatar } = data;
          const room = rooms[roomCode];

          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Комната не найдена / Room not found.' }));
            return;
          }

          if (room.players.length >= 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'Комната заполнена / Room is full.' }));
            return;
          }

          userRoomCode = roomCode;
          userSide = 'yellow';

          room.players.push({
            ws,
            username,
            avatar,
            side: 'yellow',
          });

          // Join success response
          ws.send(JSON.stringify({
            type: 'room_joined',
            roomCode,
            side: 'yellow',
            opponent: {
              username: room.players[0].username,
              avatar: room.players[0].avatar,
            },
            chatHistory: room.chat,
          }));

          // Notify Player 1
          room.players[0].ws.send(JSON.stringify({
            type: 'opponent_joined',
            opponent: {
              username,
              avatar,
            }
          }));

          // Broadcast initial game start signal
          broadcast(roomCode, {
            type: 'game_start',
            turn: 'red',
          });
          break;
        }

        case 'make_move': {
          const { column } = data;
          const room = rooms[userRoomCode];
          if (!room) return;

          if (room.turn !== userSide) {
            ws.send(JSON.stringify({ type: 'error', message: 'Не ваш ход / Not your turn.' }));
            return;
          }

          if (room.status !== 'playing') {
            ws.send(JSON.stringify({ type: 'error', message: 'Партия уже завершена / Game is already over.' }));
            return;
          }

          if (!Number.isInteger(column) || column < 0 || column > 6) {
            ws.send(JSON.stringify({ type: 'error', message: 'Некорректная колонка / Invalid column.' }));
            return;
          }

          const row = getAvailableRow(room.board, column);
          if (row === -1) {
            ws.send(JSON.stringify({ type: 'error', message: 'Колонка заполнена / Column is full.' }));
            return;
          }

          room.board[row][column] = userSide;
          const winState = checkWin(room.board);
          const isDraw = !winState.winner && isBoardFull(room.board);
          if (winState.winner || isDraw) {
            room.status = 'finished';
          }

          broadcast(userRoomCode, {
            type: 'move_made',
            column,
            row,
            player: userSide,
            winner: winState.winner,
            winningCells: winState.cells,
            isDraw,
          });

          if (!winState.winner && !isDraw) {
            room.turn = userSide === 'red' ? 'yellow' : 'red';
          }
          break;
        }

        case 'chat': {
          const room = rooms[userRoomCode];
          if (!room) return;

          const chatMessage = {
            id: Date.now().toString(),
            username: data.username,
            avatar: data.avatar,
            text: data.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          room.chat.push(chatMessage);
          // Limit chat history
          if (room.chat.length > 50) room.chat.shift();

          broadcast(userRoomCode, {
            type: 'chat_received',
            message: chatMessage,
          });
          break;
        }

        case 'restart_request': {
          const room = rooms[userRoomCode];
          if (!room) return;

          // Notify other player that opponent wants restart
          const otherPlayer = room.players.find(p => p.side !== userSide);
          if (otherPlayer) {
            otherPlayer.ws.send(JSON.stringify({ type: 'opponent_wants_restart' }));
          }
          break;
        }

        case 'restart_confirm': {
          const room = rooms[userRoomCode];
          if (!room) return;

          // Reset server board state
          room.board = createEmptyBoard();
          room.turn = 'red';
          room.status = 'playing';

          broadcast(userRoomCode, {
            type: 'game_restarted',
            turn: 'red',
          });
          break;
        }
      }
    } catch (e) {
      console.error('Failed to process incoming WebSocket message', e);
    }
  });

  ws.on('close', () => {
    if (userRoomCode && rooms[userRoomCode]) {
      const room = rooms[userRoomCode];
      
      // Notify remaining players
      room.players.forEach(p => {
        if (p.ws !== ws && p.ws.readyState === WebSocket.OPEN) {
          p.ws.send(JSON.stringify({
            type: 'opponent_left',
            message: 'Оппонент покинул бой. / Opponent disconnected.'
          }));
        }
      });

      // Cleanup room
      delete rooms[userRoomCode];
      console.log(`Lobby ${userRoomCode} closed due to player exit.`);
    }
  });
});

// Helper: Broadcast payload to all room participants
function broadcast(roomCode, payload) {
  const room = rooms[roomCode];
  if (!room) return;

  const msg = JSON.stringify(payload);
  room.players.forEach(p => {
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(msg);
    }
  });
}

server.listen(port, () => {
  console.log(`NeuraFour WebSocket Lobby server running on port ${port}`);
});
