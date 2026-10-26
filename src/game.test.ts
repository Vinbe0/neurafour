import { describe, expect, it } from 'vitest';
import { isGameOver, newGame, playMove, undo, undoTarget } from './game';
import type { GameState } from './game';

// Plays columns in order for whoever is to move; fails the test on an illegal move
const playAll = (columns: number[], start: GameState = newGame()) =>
  columns.reduce((state, col) => {
    const outcome = playMove(state, col);
    if (!outcome) throw new Error(`illegal move in column ${col}`);
    return outcome.state;
  }, start);

describe('newGame', () => {
  it('starts empty with the chosen first player', () => {
    const game = newGame('yellow');
    expect(game.currentPlayer).toBe('yellow');
    expect(game.history).toEqual([]);
    expect(game.board.flat().every((cell) => cell === null)).toBe(true);
    expect(isGameOver(game)).toBe(false);
  });
});

describe('playMove', () => {
  it('drops the token, alternates turns and records history', () => {
    const outcome = playMove(newGame(), 3);
    expect(outcome?.row).toBe(5);
    const state = outcome!.state;
    expect(state.board[5][3]).toBe('red');
    expect(state.currentPlayer).toBe('yellow');
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toMatchObject({ player: 'red', column: 3 });
    expect(state.history[0].boardBefore[5][3]).toBeNull();
    expect(state.history[0].boardAfter[5][3]).toBe('red');
  });

  it('does not modify the previous state', () => {
    const before = newGame();
    playMove(before, 3);
    expect(before.board[5][3]).toBeNull();
    expect(before.history).toEqual([]);
  });

  it('can play for a given player (online moves come from the server)', () => {
    const state = playMove(newGame(), 0, 'yellow')!.state;
    expect(state.board[5][0]).toBe('yellow');
    expect(state.currentPlayer).toBe('red');
  });

  it('rejects a move into a full column', () => {
    const state = playAll([0, 0, 0, 0, 0, 0]);
    expect(playMove(state, 0)).toBeNull();
  });

  it('detects a win and stops the game', () => {
    const state = playAll([0, 6, 1, 6, 2, 6, 3]);
    expect(state.winner).toBe('red');
    expect(state.winningCells).toEqual([[5, 0], [5, 1], [5, 2], [5, 3]]);
    expect(state.currentPlayer).toBe('red');
    expect(isGameOver(state)).toBe(true);
    expect(playMove(state, 4)).toBeNull();
  });

  it('detects a draw on a full board', () => {
    // Fills the board column pairs in an order that never makes four in a row
    const order = [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0,
      2, 3, 2, 3, 2, 3, 3, 2, 3, 2, 3, 2,
      4, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 4,
      6, 6, 6, 6, 6, 6];
    const state = playAll(order);
    expect(state.winner).toBeNull();
    expect(state.isDraw).toBe(true);
  });
});

describe('undo', () => {
  it('removes one move in a local game', () => {
    const state = playAll([3, 4]);
    expect(undoTarget(state, 'local')).toBe(1);
    const undone = undo(state, 'local');
    expect(undone.history).toHaveLength(1);
    expect(undone.board[5][4]).toBeNull();
    expect(undone.currentPlayer).toBe('yellow');
  });

  it('takes back your move and the AI reply against the AI', () => {
    const state = playAll([3, 4, 2, 5]);
    const undone = undo(state, 'ai');
    expect(undone.history).toHaveLength(2);
    expect(undone.board[5][2]).toBeNull();
    expect(undone.board[5][5]).toBeNull();
    expect(undone.currentPlayer).toBe('red');
  });

  it('keeps the AI opening move when the AI went first', () => {
    const state = playAll([3, 4], newGame('yellow')); // AI (yellow) 3, you (red) 4
    const undone = undo(state, 'ai');
    expect(undone.history).toHaveLength(1);
    expect(undone.board[5][3]).toBe('yellow');
    expect(undone.currentPlayer).toBe('red');
  });

  it('is not allowed online, after the game ends, or before any move', () => {
    expect(undoTarget(playAll([3, 4]), 'multiplayer')).toBe(-1);
    expect(undoTarget(playAll([0, 6, 1, 6, 2, 6, 3]), 'local')).toBe(-1);
    expect(undoTarget(newGame(), 'local')).toBe(-1);
    expect(undoTarget(playAll([3], newGame('yellow')), 'ai')).toBe(-1);
  });
});
