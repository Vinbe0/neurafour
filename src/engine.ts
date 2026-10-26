import type { BoardType, PlayerType } from './types';

// Search engine: negamax with alpha-beta pruning, a transposition table keyed by
// Zobrist hashes, and iterative deepening under a time budget.
//
// The position lives in flat typed arrays and is updated in place (make/unmake),
// so a search allocates almost nothing. The evaluation is the same window
// heuristic as evaluateBoard in ai.ts, but kept up to date incrementally: a move
// only touches the (at most 13) four-cell windows that contain its cell.

const ROWS = 6;
const COLS = 7;
const SIZE = ROWS * COLS;
const CENTER_COL = 3;

export const WIN_SCORE = 100_000_000;
const WIN_THRESHOLD = WIN_SCORE - 1000;
const MAX_DEPTH = SIZE;

// Center-first ordering gives alpha-beta the most cutoffs
const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6];

// --- Precomputed tables ---------------------------------------------------

// Every line of four cells on the board (69 in total) and, per cell, the lines through it
const WINDOWS: number[][] = [];
const CELL_WINDOWS: number[][] = Array.from({ length: SIZE }, () => []);
{
  const add = (cells: [number, number][]) => {
    const id = WINDOWS.length;
    WINDOWS.push(cells.map(([r, c]) => r * COLS + c));
    for (const [r, c] of cells) CELL_WINDOWS[r * COLS + c].push(id);
  };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 3 < COLS) add([[r, c], [r, c + 1], [r, c + 2], [r, c + 3]]);
      if (r + 3 < ROWS) add([[r, c], [r + 1, c], [r + 2, c], [r + 3, c]]);
      if (r + 3 < ROWS && c + 3 < COLS) add([[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]]);
      if (r - 3 >= 0 && c + 3 < COLS) add([[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]]);
    }
  }
}
const WINDOW_COUNT = WINDOWS.length;

// WINDOW_SCORE[mine * 5 + theirs]: value of one window for "me" (matches evaluateWindow in ai.ts)
const WINDOW_SCORE = new Int32Array(25);
for (let mine = 0; mine <= 4; mine++) {
  for (let theirs = 0; mine + theirs <= 4; theirs++) {
    let score = 0;
    if (theirs === 0) {
      score = mine === 4 ? 100000 : mine === 3 ? 100 : mine === 2 ? 10 : 0;
    } else if (mine === 0) {
      score = theirs === 4 ? -1000000 : theirs === 3 ? -80 : theirs === 2 ? -8 : 0;
    }
    WINDOW_SCORE[mine * 5 + theirs] = score;
  }
}

// Zobrist keys: 53 usable bits split into a 21-bit high and a 32-bit low part,
// so the combined key is an exact JavaScript number usable as a Map key.
// A fixed-seed generator keeps searches reproducible.
const ZOBRIST_HI = new Int32Array(SIZE * 2);
const ZOBRIST_LO = new Int32Array(SIZE * 2);
{
  let seed = 0x9e3779b9;
  const next = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed | 0;
  };
  for (let i = 0; i < SIZE * 2; i++) {
    ZOBRIST_HI[i] = next() & 0x1fffff;
    ZOBRIST_LO[i] = next();
  }
}

// --- Position -------------------------------------------------------------

// How a stored score relates to the true value of the position
const Flag = { Exact: 0, Lower: 1, Upper: 2 } as const;
type Flag = (typeof Flag)[keyof typeof Flag];

interface TTEntry {
  depth: number;
  score: number;
  flag: Flag;
  move: number;
}

class Position {
  cells = new Int8Array(SIZE); // 0 empty, 1 red, 2 yellow
  heights = new Int8Array(COLS); // tokens already in each column
  windowCounts = new Int8Array(WINDOW_COUNT * 2); // [w*2 + side] tokens of each side in window w
  evalTotals = new Int32Array(2); // window score sum from each side's point of view
  centerCounts = new Int8Array(2);
  hashHi = 0;
  hashLo = 0;
  moves = 0;

  constructor(board: BoardType) {
    for (let r = ROWS - 1; r >= 0; r--) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (cell) this.place(r * COLS + c, cell === 'red' ? 0 : 1);
      }
    }
    for (let c = 0; c < COLS; c++) {
      let h = 0;
      while (h < ROWS && board[ROWS - 1 - h][c] !== null) h++;
      this.heights[c] = h;
    }
  }

  canPlay(col: number) {
    return this.heights[col] < ROWS;
  }

  // Index of the cell a token dropped in `col` would land on
  landing(col: number) {
    return (ROWS - 1 - this.heights[col]) * COLS + col;
  }

  // Drops a token for `side` and reports whether it completes four in a row
  play(col: number, side: number): boolean {
    const cell = this.landing(col);
    this.heights[col]++;
    return this.place(cell, side);
  }

  undo(col: number, side: number) {
    this.heights[col]--;
    this.remove(this.landing(col), side);
  }

  private place(cell: number, side: number): boolean {
    this.cells[cell] = side + 1;
    this.moves++;
    this.hashHi ^= ZOBRIST_HI[cell * 2 + side];
    this.hashLo ^= ZOBRIST_LO[cell * 2 + side];
    if (cell % COLS === CENTER_COL) this.centerCounts[side]++;

    let won = false;
    for (const w of CELL_WINDOWS[cell]) {
      const red = this.windowCounts[w * 2];
      const yellow = this.windowCounts[w * 2 + 1];
      this.evalTotals[0] -= WINDOW_SCORE[red * 5 + yellow];
      this.evalTotals[1] -= WINDOW_SCORE[yellow * 5 + red];
      const updated = ++this.windowCounts[w * 2 + side];
      if (updated === 4) won = true;
      const r2 = this.windowCounts[w * 2];
      const y2 = this.windowCounts[w * 2 + 1];
      this.evalTotals[0] += WINDOW_SCORE[r2 * 5 + y2];
      this.evalTotals[1] += WINDOW_SCORE[y2 * 5 + r2];
    }
    return won;
  }

  private remove(cell: number, side: number) {
    this.cells[cell] = 0;
    this.moves--;
    this.hashHi ^= ZOBRIST_HI[cell * 2 + side];
    this.hashLo ^= ZOBRIST_LO[cell * 2 + side];
    if (cell % COLS === CENTER_COL) this.centerCounts[side]--;

    for (const w of CELL_WINDOWS[cell]) {
      const red = this.windowCounts[w * 2];
      const yellow = this.windowCounts[w * 2 + 1];
      this.evalTotals[0] -= WINDOW_SCORE[red * 5 + yellow];
      this.evalTotals[1] -= WINDOW_SCORE[yellow * 5 + red];
      this.windowCounts[w * 2 + side]--;
      const r2 = this.windowCounts[w * 2];
      const y2 = this.windowCounts[w * 2 + 1];
      this.evalTotals[0] += WINDOW_SCORE[r2 * 5 + y2];
      this.evalTotals[1] += WINDOW_SCORE[y2 * 5 + r2];
    }
  }

  // Static score from `side`'s point of view (same value as evaluateBoard in ai.ts)
  evaluate(side: number) {
    return this.evalTotals[side] + this.centerCounts[side] * 4;
  }

  key() {
    return this.hashHi * 4294967296 + (this.hashLo >>> 0);
  }
}

// --- Search ---------------------------------------------------------------

export interface SearchOptions {
  // Deepest iteration to run (plies)
  maxDepth: number;
  // Stop after this many milliseconds and return the last finished iteration
  timeMs?: number;
}

export interface SearchResult {
  column: number;
  score: number;
  depth: number;
  nodes: number;
  timedOut: boolean;
}

class SearchAborted extends Error {}

export const search = (board: BoardType, player: PlayerType, options: SearchOptions): SearchResult => {
  const pos = new Position(board);
  const rootSide = player === 'red' ? 0 : 1;
  const tt = new Map<number, TTEntry>();
  const deadline = options.timeMs !== undefined ? performance.now() + options.timeMs : Infinity;
  let nodes = 0;

  // Mate scores are stored relative to the node so they stay valid at any ply
  const toTT = (score: number, ply: number) =>
    score > WIN_THRESHOLD ? score + ply : score < -WIN_THRESHOLD ? score - ply : score;
  const fromTT = (score: number, ply: number) =>
    score > WIN_THRESHOLD ? score - ply : score < -WIN_THRESHOLD ? score + ply : score;

  // Score from the point of view of `side`, the player to move.
  // Leaves use the root player's evaluation (negated for the opponent), exactly like
  // the plain minimax this engine replaced, so scores stay comparable for the AI Coach.
  const negamax = (depth: number, alpha: number, beta: number, side: number, ply: number): number => {
    nodes++;
    if ((nodes & 2047) === 0 && performance.now() > deadline) throw new SearchAborted();

    const leaf = () => (side === rootSide ? 1 : -1) * pos.evaluate(rootSide);
    if (depth === 0 || pos.moves === SIZE) return leaf();

    const key = pos.key();
    const entry = tt.get(key);
    let ttMove = -1;
    const alphaStart = alpha;
    if (entry) {
      ttMove = entry.move;
      if (entry.depth >= depth) {
        const score = fromTT(entry.score, ply);
        if (entry.flag === Flag.Exact) return score;
        if (entry.flag === Flag.Lower && score >= beta) return score;
        if (entry.flag === Flag.Upper && score <= alpha) return score;
      }
    }

    let best = -Infinity;
    let bestMove = -1;
    for (let i = -1; i < COLS; i++) {
      const col = i === -1 ? ttMove : COLUMN_ORDER[i];
      if (col === -1 || (i !== -1 && col === ttMove) || !pos.canPlay(col)) continue;

      const won = pos.play(col, side);
      const score = won ? WIN_SCORE - (ply + 1) : -negamax(depth - 1, -beta, -alpha, side ^ 1, ply + 1);
      pos.undo(col, side);

      if (score > best) {
        best = score;
        bestMove = col;
      }
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }

    const flag = best <= alphaStart ? Flag.Upper : best >= beta ? Flag.Lower : Flag.Exact;
    tt.set(key, { depth, score: toTT(best, ply), flag, move: bestMove });
    return best;
  };

  let result: SearchResult = { column: -1, score: 0, depth: 0, nodes: 0, timedOut: false };
  const depthLimit = Math.min(options.maxDepth, MAX_DEPTH - pos.moves);

  for (let depth = 1; depth <= Math.max(1, depthLimit); depth++) {
    try {
      const score = negamax(depth, -Infinity, Infinity, rootSide, 0);
      const column = tt.get(pos.key())?.move ?? -1;
      result = { column, score, depth, nodes, timedOut: false };
      // A forced win or loss has been found: searching deeper cannot change the move
      if (Math.abs(score) > WIN_THRESHOLD) break;
    } catch (err) {
      if (!(err instanceof SearchAborted)) throw err;
      result = { ...result, nodes, timedOut: true };
      break;
    }
  }

  // Fallback for a board with a single legal move searched at depth 0
  if (result.column === -1) {
    result.column = COLUMN_ORDER.find((c) => pos.canPlay(c)) ?? -1;
  }
  return result;
};

// Static evaluation of a board for `player` (used by tests to check the incremental evaluation)
export const staticEvaluate = (board: BoardType, player: PlayerType) =>
  new Position(board).evaluate(player === 'red' ? 0 : 1);
