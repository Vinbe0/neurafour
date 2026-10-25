import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COLS,
  ROWS,
  analyzeMatch,
  checkWin,
  createEmptyBoard,
  getAvailableRow,
  getBestMove,
  isBoardFull,
  isColumnAvailable,
} from './ai';
import type { BoardType, PlayerType } from './types';

// Build a board by dropping tokens into the given columns, alternating turns.
const play = (columns: number[], first: PlayerType = 'red'): BoardType => {
  const board = createEmptyBoard();
  let player = first;
  for (const c of columns) {
    board[getAvailableRow(board, c)][c] = player;
    player = player === 'red' ? 'yellow' : 'red';
  }
  return board;
};

const clone = (board: BoardType): BoardType => board.map(row => [...row]);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('board rules', () => {
  it('creates an empty 6x7 board', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(ROWS);
    board.forEach(row => expect(row).toEqual(Array(COLS).fill(null)));
  });

  it('drops tokens to the lowest free row', () => {
    const board = play([3, 3]);
    expect(board[5][3]).toBe('red');
    expect(board[4][3]).toBe('yellow');
    expect(getAvailableRow(board, 3)).toBe(3);
    expect(getAvailableRow(board, 0)).toBe(5);
  });

  it('reports full columns as unavailable', () => {
    const board = play([0, 0, 0, 0, 0, 0]);
    expect(isColumnAvailable(board, 0)).toBe(false);
    expect(getAvailableRow(board, 0)).toBe(-1);
    expect(isColumnAvailable(board, 1)).toBe(true);
  });

  it('detects a full board', () => {
    const board: BoardType = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => ((r + Math.floor(c / 2)) % 2 ? 'red' : 'yellow'))
    );
    expect(isBoardFull(board)).toBe(true);
    expect(isBoardFull(play([3]))).toBe(false);
  });
});

describe('checkWin', () => {
  it('finds no winner on an empty board', () => {
    expect(checkWin(createEmptyBoard())).toEqual({ winner: null, cells: [] });
  });

  it('detects a horizontal win and its cells', () => {
    // red: 0,1,2,3 on the bottom row; yellow stacks on top
    const result = checkWin(play([0, 0, 1, 1, 2, 2, 3]));
    expect(result.winner).toBe('red');
    expect(result.cells).toEqual([[5, 0], [5, 1], [5, 2], [5, 3]]);
  });

  it('detects a vertical win', () => {
    const result = checkWin(play([4, 5, 4, 5, 4, 5, 4]));
    expect(result.winner).toBe('red');
    expect(result.cells).toEqual([[2, 4], [3, 4], [4, 4], [5, 4]]);
  });

  it('detects a rising diagonal win', () => {
    // red ends on (5,0), (4,1), (3,2), (2,3)
    const result = checkWin(play([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]));
    expect(result.winner).toBe('red');
    expect(result.cells).toHaveLength(4);
  });

  it('detects a falling diagonal win', () => {
    // mirror of the rising case: red on (5,6), (4,5), (3,4), (2,3)
    const result = checkWin(play([6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3]));
    expect(result.winner).toBe('red');
  });

  it('does not count three in a row', () => {
    expect(checkWin(play([0, 0, 1, 1, 2, 2])).winner).toBeNull();
  });
});

describe('getBestMove', () => {
  const difficulties = ['easy', 'medium', 'hard'] as const;

  it.each(difficulties)('%s takes an immediate win', difficulty => {
    // red has 0,1,2 on the bottom row and moves next
    const board = play([0, 0, 1, 1, 2, 2]);
    expect(getBestMove(board, difficulty, 'red')).toBe(3);
  });

  it.each(difficulties)('%s blocks an immediate loss', difficulty => {
    // yellow has a vertical three in column 6; red must block
    const board = play([0, 6, 1, 6, 0, 6]);
    expect(getBestMove(board, difficulty, 'red')).toBe(6);
  });

  it('prefers winning over blocking', () => {
    // red threatens column 0 and yellow threatens column 6; red should win
    const board = play([0, 6, 0, 6, 0, 6]);
    expect(getBestMove(board, 'hard', 'red')).toBe(0);
  });

  it('hard builds an unstoppable double threat', () => {
    // red on (5,2), (5,3); yellow on top of them. Playing 1 or 4 makes
    // an open three on the bottom row that yellow cannot block twice.
    const board = play([2, 2, 3, 3]);
    expect([1, 4]).toContain(getBestMove(board, 'hard', 'red'));
  });

  it('never plays into a full column', () => {
    const board = play([3, 3, 3, 3, 3, 3]);
    for (const difficulty of difficulties) {
      expect(getBestMove(board, difficulty, 'red')).not.toBe(3);
    }
  });

  it('easy random moves stay legal', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const board = play([0, 0, 0, 0, 0, 0]);
    const move = getBestMove(board, 'easy', 'red');
    expect(isColumnAvailable(board, move)).toBe(true);
  });

  it('leaves the input board unchanged', () => {
    const board = play([3, 2, 4]);
    const before = clone(board);
    getBestMove(board, 'hard', 'yellow');
    expect(board).toEqual(before);
  });

  it('hard answers quickly on an empty board', () => {
    const start = performance.now();
    getBestMove(createEmptyBoard(), 'hard', 'red');
    expect(performance.now() - start).toBeLessThan(2000);
  });
});

describe('analyzeMatch (AI Coach)', () => {
  const step = (columns: number[], column: number) => {
    const boardBefore = play(columns);
    const player: PlayerType = columns.length % 2 === 0 ? 'red' : 'yellow';
    const boardAfter = clone(boardBefore);
    boardAfter[getAvailableRow(boardAfter, column)][column] = player;
    return { player, column, boardBefore, boardAfter };
  };

  it('grades a winning move as perfect', () => {
    const [analysis] = analyzeMatch([step([0, 0, 1, 1, 2, 2], 3)], false);
    expect(analysis.grade).toBe('perfect');
  });

  it('flags a missed block as a blunder and recommends the block', () => {
    // yellow threatens column 6; red plays 3 instead
    const [analysis] = analyzeMatch([step([0, 6, 1, 6, 0, 6], 3)], false);
    expect(analysis.grade).toBe('blunder');
    expect(analysis.recommendedColumn).toBe(6);
  });

  it('flags a missed win as a blunder', () => {
    const [analysis] = analyzeMatch([step([0, 0, 1, 1, 2, 2], 6)], false);
    expect(analysis.grade).toBe('blunder');
    expect(analysis.recommendedColumn).toBe(3);
  });

  it('returns one analysis per move with legal recommendations', () => {
    const history = [step([], 3), step([3], 2), step([3, 2], 4)];
    const analyses = analyzeMatch(history, true);
    expect(analyses.map(a => a.turn)).toEqual([1, 2, 3]);
    analyses.forEach((a, i) => {
      expect(isColumnAvailable(history[i].boardBefore, a.recommendedColumn)).toBe(true);
    });
  });
});
