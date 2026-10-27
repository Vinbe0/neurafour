import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { WebSocket } from 'ws';
import { createGameServer } from './app.ts';
import type { GameServer } from './app.ts';

type Message = Record<string, unknown> & { type: string };

// A test client that queues incoming messages so tests can await them in order
interface Client {
  ws: WebSocket;
  send: (payload: object) => void;
  next: (type: string) => Promise<Message>;
  close: () => Promise<void>;
}

// Short grace period so tests about leaving do not wait 30 seconds
const GRACE_MS = 200;

let game: GameServer;
let port: number;
const clients: Client[] = [];

beforeEach(async () => {
  game = createGameServer({ reconnectGraceMs: GRACE_MS });
  await new Promise<void>((resolve) => game.server.listen(0, resolve));
  port = (game.server.address() as AddressInfo).port;
});

afterEach(async () => {
  await Promise.all(clients.splice(0).map((c) => c.close()));
  await new Promise((resolve) => game.server.close(resolve));
});

const connect = async (): Promise<Client> => {
  const ws = new WebSocket(`ws://localhost:${port}`);
  const inbox: Message[] = [];
  const waiting: { type: string; resolve: (m: Message) => void }[] = [];

  ws.on('message', (raw) => {
    const message = JSON.parse(raw.toString()) as Message;
    const index = waiting.findIndex((w) => w.type === message.type);
    if (index !== -1) waiting.splice(index, 1)[0].resolve(message);
    else inbox.push(message);
  });
  await new Promise((resolve) => ws.once('open', resolve));

  const client: Client = {
    ws,
    send: (payload) => ws.send(JSON.stringify(payload)),
    next: (type) => {
      const index = inbox.findIndex((m) => m.type === type);
      if (index !== -1) return Promise.resolve(inbox.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timed out waiting for "${type}"`)), 2000);
        waiting.push({ type, resolve: (m) => { clearTimeout(timer); resolve(m); } });
      });
    },
    close: () => new Promise((resolve) => {
      if (ws.readyState === WebSocket.CLOSED) return resolve();
      ws.once('close', () => resolve());
      ws.close();
    }),
  };
  clients.push(client);
  return client;
};

// Host creates a room and a guest joins it; returns both clients and the code
const startMatch = async () => {
  const host = await connect();
  host.send({ type: 'create_room', username: 'Host', avatar: '🧠' });
  const { roomCode, token: hostToken } = await host.next('room_created');
  const guest = await connect();
  guest.send({ type: 'join_room', roomCode, username: 'Guest', avatar: '👾' });
  const { token: guestToken } = await guest.next('room_joined');
  await host.next('opponent_joined');
  await Promise.all([host.next('game_start'), guest.next('game_start')]);
  return { host, guest, roomCode: roomCode as string, hostToken, guestToken };
};

const move = async (player: Client, others: Client[], column: number) => {
  player.send({ type: 'make_move', column });
  const [made] = await Promise.all([player, ...others].map((c) => c.next('move_made')));
  return made;
};

describe('rooms', () => {
  it('reports health and the number of active rooms', async () => {
    await startMatch();
    const res = await fetch(`http://localhost:${port}/health`);
    expect(await res.json()).toEqual({ status: 'ok', activeRooms: 1 });
  });

  it('creates a room and lets a second player join it', async () => {
    const host = await connect();
    host.send({ type: 'create_room', username: '  Host  ', avatar: '🧠' });
    const created = await host.next('room_created');
    expect(created.roomCode).toMatch(/^[A-Z2-9]{5}$/);
    expect(created.side).toBe('red');

    const guest = await connect();
    guest.send({ type: 'join_room', roomCode: String(created.roomCode).toLowerCase(), username: 'Guest', avatar: '👾' });
    const joined = await guest.next('room_joined');
    expect(joined).toMatchObject({ side: 'yellow', opponent: { username: 'Host', avatar: '🧠' } });
    expect(await host.next('opponent_joined')).toMatchObject({ opponent: { username: 'Guest' } });
  });

  it('rejects unknown and full rooms', async () => {
    const stranger = await connect();
    stranger.send({ type: 'join_room', roomCode: 'ZZZZZ', username: 'X' });
    // A code for the app to translate, plus English text for older clients
    expect(await stranger.next('error')).toMatchObject({ code: 'room_not_found', message: 'Room not found.' });

    const { roomCode } = await startMatch();
    const third = await connect();
    third.send({ type: 'join_room', roomCode, username: 'Third' });
    expect((await third.next('error')).code).toBe('room_full');
  });

  it('closes the room at once when a player leaves on purpose', async () => {
    const { host, guest } = await startMatch();
    host.send({ type: 'leave_room' });
    expect(await guest.next('opponent_left')).toMatchObject({ type: 'opponent_left' });
    expect(game.rooms.size).toBe(0);
  });

  it('closes the room if a disconnected player does not come back in time', async () => {
    const { host, guest } = await startMatch();
    await host.close();
    expect(await guest.next('opponent_disconnected')).toMatchObject({ graceSeconds: 0 });
    expect(game.rooms.size).toBe(1);
    expect(await guest.next('opponent_left')).toMatchObject({ type: 'opponent_left' });
    expect(game.rooms.size).toBe(0);
  });
});

describe('moves', () => {
  it('broadcasts accepted moves to both players and alternates turns', async () => {
    const { host, guest } = await startMatch();
    expect(await move(host, [guest], 3)).toMatchObject({ column: 3, row: 5, player: 'red', winner: null });
    expect(await move(guest, [host], 3)).toMatchObject({ column: 3, row: 4, player: 'yellow' });
  });

  it('rejects moves out of turn, invalid columns and full columns', async () => {
    const { host, guest } = await startMatch();
    guest.send({ type: 'make_move', column: 0 });
    expect((await guest.next('error')).code).toBe('not_your_turn');

    for (const column of [-1, 7, 2.5, '3']) {
      host.send({ type: 'make_move', column });
      expect((await host.next('error')).code).toBe('invalid_column');
    }

    for (let i = 0; i < 3; i++) {
      await move(host, [guest], 0);
      await move(guest, [host], 0);
    }
    host.send({ type: 'make_move', column: 0 });
    expect((await host.next('error')).code).toBe('column_full');
  });

  it('detects a win and refuses further moves', async () => {
    const { host, guest } = await startMatch();
    for (const column of [0, 1, 2]) {
      await move(host, [guest], column);
      await move(guest, [host], 6);
    }
    const winning = await move(host, [guest], 3);
    expect(winning).toMatchObject({ winner: 'red', winningCells: [[5, 0], [5, 1], [5, 2], [5, 3]] });

    guest.send({ type: 'make_move', column: 4 });
    expect((await guest.next('error')).code).toBe('game_over');
  });

  it('starts a fresh game after a rematch is accepted', async () => {
    const { host, guest } = await startMatch();
    await move(host, [guest], 3);
    host.send({ type: 'restart_request' });
    await guest.next('opponent_wants_restart');
    guest.send({ type: 'restart_confirm' });
    await Promise.all([host.next('game_restarted'), guest.next('game_restarted')]);
    expect(await move(host, [guest], 3)).toMatchObject({ row: 5, player: 'red' });
  });
});

describe('chat', () => {
  it('relays trimmed messages under the sender name the server stored', async () => {
    const { host, guest } = await startMatch();
    guest.send({ type: 'chat', username: 'Host', text: '  gl hf  ' });
    const [toHost] = await Promise.all([host.next('chat_received'), guest.next('chat_received')]);
    expect(toHost.message).toMatchObject({ username: 'Guest', text: 'gl hf' });
  });

  it('limits message length and ignores empty messages', async () => {
    const { host, guest } = await startMatch();
    host.send({ type: 'chat', text: '   ' });
    host.send({ type: 'chat', text: 'x'.repeat(1000) });
    const received = await guest.next('chat_received');
    expect((received.message as { text: string }).text).toHaveLength(300);
  });
});

describe('reconnecting', () => {
  it('lets a player who reloaded take their seat back with the full game', async () => {
    const { host, guest, roomCode, guestToken } = await startMatch();
    await move(host, [guest], 3);
    await move(guest, [host], 4);
    host.send({ type: 'chat', text: 'still there?' });
    await Promise.all([host.next('chat_received'), guest.next('chat_received')]);

    // The guest's page reloads: old connection drops, a new one rejoins
    await guest.close();
    await host.next('opponent_disconnected');
    const reloaded = await connect();
    reloaded.send({ type: 'rejoin_room', roomCode, token: guestToken });

    const rejoined = await reloaded.next('room_rejoined');
    expect(rejoined).toMatchObject({
      roomCode,
      side: 'yellow',
      opponent: { username: 'Host' },
      moves: [{ column: 3, player: 'red' }, { column: 4, player: 'yellow' }],
    });
    expect(rejoined.chatHistory).toHaveLength(1);
    await host.next('opponent_reconnected');

    // The game carries on, and the room is not closed when the old grace period ends
    expect(await move(host, [reloaded], 3)).toMatchObject({ row: 4, player: 'red' });
    await new Promise((resolve) => setTimeout(resolve, GRACE_MS + 100));
    expect(game.rooms.size).toBe(1);
    expect(await move(reloaded, [host], 0)).toMatchObject({ player: 'yellow' });
  });

  it('refuses a rejoin with the wrong token', async () => {
    const { roomCode } = await startMatch();
    const intruder = await connect();
    intruder.send({ type: 'rejoin_room', roomCode, token: 'not-the-token' });
    expect((await intruder.next('error')).code).toBe('room_not_found');
  });
});
