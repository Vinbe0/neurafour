import { checkWin, createEmptyBoard, getAvailableRow, isBoardFull } from './rules';
import type { HistoryStep } from './aiRequests';
import type { BoardType, GameMode, PlayerType } from './types';

// State of one Connect Four game, updated only through the pure functions below
// so the game screen stays a thin layer of rendering and side effects.

export interface GameState {
  board: BoardType;
  currentPlayer: PlayerType;
  winner: PlayerType | null;
  winningCells: [number, number][];
  isDraw: boolean;
  history: HistoryStep[];
}

export interface MoveOutcome {
  state: GameState;
  // Row the token landed in (used for the drop sound and animation)
  row: number;
}

const copyBoard = (board: BoardType): BoardType => board.map((row) => [...row]);

export const newGame = (firstPlayer: PlayerType = 'red'): GameState => ({
  board: createEmptyBoard(),
  currentPlayer: firstPlayer,
  winner: null,
  winningCells: [],
  isDraw: false,
  history: [],
});

export const isGameOver = (state: GameState) => !!state.winner || state.isDraw;

// Drops a token for `player` (the player to move by default).
// Returns null when the move is not allowed: the game is over or the column is full.
export const playMove = (state: GameState, column: number, player: PlayerType = state.currentPlayer): MoveOutcome | null => {
  if (isGameOver(state)) return null;
  const row = getAvailableRow(state.board, column);
  if (row === -1) return null;

  const board = copyBoard(state.board);
  board[row][column] = player;
  const { winner, cells } = checkWin(board);
  const isDraw = !winner && isBoardFull(board);

  return {
    row,
    state: {
      board,
      currentPlayer: winner || isDraw ? player : player === 'red' ? 'yellow' : 'red',
      winner,
      winningCells: cells,
      isDraw,
      history: [...state.history, { player, column, boardBefore: copyBoard(state.board), boardAfter: copyBoard(board) }],
    },
  };
};

// Index of the history step that undo rewinds to, or -1 when undo is not allowed.
// Locally it removes one move; against the AI it goes back to before your (Red's)
// last move, which also removes the AI's reply. Online games cannot be undone.
export const undoTarget = (state: GameState, mode: GameMode): number => {
  if (mode === 'multiplayer' || isGameOver(state) || state.history.length === 0) return -1;
  if (mode === 'local') return state.history.length - 1;
  for (let i = state.history.length - 1; i >= 0; i--) {
    if (state.history[i].player === 'red') return i;
  }
  return -1;
};

export const undo = (state: GameState, mode: GameMode): GameState => {
  const target = undoTarget(state, mode);
  if (target === -1) return state;
  const step = state.history[target];
  return {
    ...state,
    board: copyBoard(step.boardBefore),
    currentPlayer: step.player,
    history: state.history.slice(0, target),
  };
};
