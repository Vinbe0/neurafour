import type { BoardType, PlayerType } from './types';

// Connect Four board rules, shared by the game screen, the AI and the multiplayer server

export const ROWS = 6;
export const COLS = 7;

// Create an empty board
export const createEmptyBoard = (): BoardType => {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
};

// Check if column is not full
export const isColumnAvailable = (board: BoardType, col: number): boolean => {
  return board[0][col] === null;
};

// Get the row where a token will fall in a column
export const getAvailableRow = (board: BoardType, col: number): number => {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) {
      return r;
    }
  }
  return -1;
};

// Check for a win and return winning cells if any
export interface WinResult {
  winner: PlayerType | null;
  cells: [number, number][]; // coordinates of the winning 4 cells [[r, c], ...]
}

export const checkWin = (board: BoardType): WinResult => {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const p = board[r][c];
      if (p && p === board[r][c+1] && p === board[r][c+2] && p === board[r][c+3]) {
        return { winner: p, cells: [[r, c], [r, c+1], [r, c+2], [r, c+3]] };
      }
    }
  }

  // Vertical
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p === board[r+1][c] && p === board[r+2][c] && p === board[r+3][c]) {
        return { winner: p, cells: [[r, c], [r+1, c], [r+2, c], [r+3, c]] };
      }
    }
  }

  // Positive Diagonal (down-right / up-left)
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const p = board[r][c];
      if (p && p === board[r+1][c+1] && p === board[r+2][c+2] && p === board[r+3][c+3]) {
        return { winner: p, cells: [[r, c], [r+1, c+1], [r+2, c+2], [r+3, c+3]] };
      }
    }
  }

  // Negative Diagonal (up-right / down-left)
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const p = board[r][c];
      if (p && p === board[r-1][c+1] && p === board[r-2][c+2] && p === board[r-3][c+3]) {
        return { winner: p, cells: [[r, c], [r-1, c+1], [r-2, c+2], [r-3, c+3]] };
      }
    }
  }

  return { winner: null, cells: [] };
};

// Check if board is completely full
export const isBoardFull = (board: BoardType): boolean => {
  return board[0].every(cell => cell !== null);
};
