import { describe, expect, it } from 'vitest';
import { search, staticEvaluate, WIN_SCORE } from './engine';
import { checkWin, createEmptyBoard, evaluateBoard, getAvailableRow, isBoardFull, isColumnAvailable } from './ai';
import type { BoardType, PlayerType } from './types';

const other = (p: PlayerType): PlayerType => (p === 'red' ? 'yellow' : 'red');

// Deterministic pseudo-random generator so failures are reproducible
const rng = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

// A random game of up to `maxMoves` moves that stops before anyone wins
const randomPosition = (random: () => number, maxMoves: number) => {
  const board = createEmptyBoard();
  let player: PlayerType = 'red';
  const moves = Math.floor(random() * maxMoves);
  for (let i = 0; i < moves; i++) {
    const cols = [0, 1, 2, 3, 4, 5, 6].filter((c) => isColumnAvailable(board, c));
    const col = cols[Math.floor(random() * cols.length)];
    const row = getAvailableRow(board, col);
    board[row][col] = player;
    if (checkWin(board).winner) {
      board[row][col] = null;
      break;
    }
    player = other(player);
  }
  return { board, player };
};

// The plain minimax the engine replaced, kept here as a reference implementation
const ORDER = [3, 2, 4, 1, 5, 0, 6];
const referenceMinimax = (
  board: BoardType, depth: number, alpha: number, beta: number, maximizing: boolean, player: PlayerType,
): number => {
  const winner = checkWin(board).winner;
  if (winner === player) return WIN_SCORE;
  if (winner) return -WIN_SCORE;
  if (isBoardFull(board) || depth === 0) return evaluateBoard(board, player);

  let best = maximizing ? -Infinity : Infinity;
  for (const c of ORDER) {
    if (!isColumnAvailable(board, c)) continue;
    const r = getAvailableRow(board, c);
    board[r][c] = maximizing ? player : other(player);
    const score = referenceMinimax(board, depth - 1, alpha, beta, !maximizing, player);
    board[r][c] = null;
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }
  return best;
};

// Collapse win scores to their sign: the reference does not prefer faster wins
const normalize = (score: number) => (Math.abs(score) > WIN_SCORE - 1000 ? Math.sign(score) * WIN_SCORE : score);

describe('engine evaluation', () => {
  it('incremental evaluation matches evaluateBoard', () => {
    const random = rng(7);
    for (let i = 0; i < 200; i++) {
      const { board } = randomPosition(random, 40);
      for (const p of ['red', 'yellow'] as const) {
        expect(staticEvaluate(board, p)).toBe(evaluateBoard(board, p));
      }
    }
  });
});

describe('engine search', () => {
  it('returns the same score as plain minimax at every depth', () => {
    const random = rng(42);
    for (let i = 0; i < 60; i++) {
      const { board, player } = randomPosition(random, 30);
      for (const depth of [1, 2, 3, 4, 5, 6, 7]) {
        const engine = search(board, player, { maxDepth: depth });
        expect(normalize(engine.score)).toBe(normalize(referenceMinimax(board, depth, -Infinity, Infinity, true, player)));
      }
    }
    // ~3 s locally; slower CI runners need more than Vitest's 5 s default
  }, 30_000);

  it('leaves the input board unchanged', () => {
    const { board, player } = randomPosition(rng(3), 20);
    const before = board.map((row) => [...row]);
    search(board, player, { maxDepth: 8 });
    expect(board).toEqual(before);
  });

  it('proves a forced win and plays into it', () => {
    // Red on the bottom row at columns 2 and 3, Yellow stacked on top: Red wins by force
    const board = createEmptyBoard();
    board[5][2] = 'red';
    board[5][3] = 'red';
    board[4][2] = 'yellow';
    board[4][3] = 'yellow';
    const result = search(board, 'red', { maxDepth: 6 });
    expect(result.score).toBeGreaterThan(WIN_SCORE - 1000);
    expect([1, 4]).toContain(result.column);
  });

  it('prefers the fastest win', () => {
    // Red can win immediately in column 0, or later elsewhere
    const board = createEmptyBoard();
    for (const r of [5, 4, 3]) board[r][0] = 'red';
    for (const r of [5, 4, 3]) board[r][6] = 'yellow';
    const result = search(board, 'red', { maxDepth: 8 });
    expect(result.column).toBe(0);
    expect(result.score).toBe(WIN_SCORE - 1);
  });

  it('stops at the time limit and still returns a legal move', () => {
    const start = performance.now();
    const result = search(createEmptyBoard(), 'red', { maxDepth: 42, timeMs: 100 });
    expect(performance.now() - start).toBeLessThan(400);
    expect(result.timedOut).toBe(true);
    expect(result.column).toBe(3);
  });

  it('searches at least 12 moves ahead within half a second', () => {
    const result = search(createEmptyBoard(), 'red', { maxDepth: 42, timeMs: 500 });
    expect(result.depth).toBeGreaterThanOrEqual(12);
  });

  it('plays the only legal move on a nearly full board', () => {
    const board: BoardType = createEmptyBoard().map((row, r) =>
      row.map((_, c) => (c === 6 && r === 0 ? null : (r + Math.floor(c / 2)) % 2 ? 'red' : 'yellow')),
    );
    expect(search(board, 'red', { maxDepth: 4 }).column).toBe(6);
  });
});
