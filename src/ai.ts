import type { BoardType, CellType, PlayerType, AIDifficulty, MoveAnalysis, MoveGrade } from './types';
import { search } from './engine';

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

// Heuristic scoring (the search itself lives in engine.ts)

// Score window of 4 cells
const evaluateWindow = (window: CellType[], player: PlayerType): number => {
  const opponent: PlayerType = player === 'red' ? 'yellow' : 'red';
  
  const playerCount = window.filter(c => c === player).length;
  const opponentCount = window.filter(c => c === opponent).length;
  const emptyCount = window.filter(c => c === null).length;

  if (playerCount === 4) {
    return 100000;
  } else if (playerCount === 3 && emptyCount === 1) {
    return 100;
  } else if (playerCount === 2 && emptyCount === 2) {
    return 10;
  }

  if (opponentCount === 4) {
    return -1000000; // Heavily penalize letting opponent win
  } else if (opponentCount === 3 && emptyCount === 1) {
    return -80; // Block immediately!
  } else if (opponentCount === 2 && emptyCount === 2) {
    return -8;
  }

  return 0;
};

// Score the entire board from perspective of `player`
export const evaluateBoard = (board: BoardType, player: PlayerType): number => {
  let score = 0;

  // 1. Favor the center column (gives tactical flexibility)
  const centerCol = Math.floor(COLS / 2);
  let centerCount = 0;
  for (let r = 0; r < ROWS; r++) {
    if (board[r][centerCol] === player) centerCount++;
  }
  score += centerCount * 4;

  // 2. Horizontal score
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]];
      score += evaluateWindow(window, player);
    }
  }

  // 3. Vertical score
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS; c++) {
      const window = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
      score += evaluateWindow(window, player);
    }
  }

  // 4. Positive Diagonal
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
      score += evaluateWindow(window, player);
    }
  }

  // 5. Negative Diagonal
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]];
      score += evaluateWindow(window, player);
    }
  }

  return score;
};

// API: Get best move for AI
export const getBestMove = (
  board: BoardType,
  difficulty: AIDifficulty,
  player: PlayerType
): number => {
  // 1. Find immediate winning or blocking moves to act intelligently on easy/medium
  const opponent: PlayerType = player === 'red' ? 'yellow' : 'red';
  
  // Can AI win immediately?
  for (let c = 0; c < COLS; c++) {
    if (isColumnAvailable(board, c)) {
      const r = getAvailableRow(board, c);
      board[r][c] = player;
      const isWin = checkWin(board).winner === player;
      board[r][c] = null;
      if (isWin) return c;
    }
  }

  // Can opponent win immediately? Block it!
  for (let c = 0; c < COLS; c++) {
    if (isColumnAvailable(board, c)) {
      const r = getAvailableRow(board, c);
      board[r][c] = opponent;
      const isWin = checkWin(board).winner === opponent;
      board[r][c] = null;
      if (isWin) return c;
    }
  }

  // Easy mode: 35% random moves, 65% a 2-move search
  if (difficulty === 'easy') {
    if (Math.random() < 0.35) {
      const avails = Array.from({ length: COLS }, (_, idx) => idx).filter(c => isColumnAvailable(board, c));
      return avails[Math.floor(Math.random() * avails.length)];
    }
    return search(board, player, { maxDepth: 2 }).column;
  }

  // Medium mode: looks 4 moves ahead
  if (difficulty === 'medium') {
    return search(board, player, { maxDepth: 4 }).column;
  }

  // Hard mode: looks 6 moves ahead
  if (difficulty === 'hard') {
    return search(board, player, { maxDepth: 6 }).column;
  }

  // Expert mode: searches as deep as it can in 750 ms (usually 14+ moves ahead)
  return search(board, player, { maxDepth: 42, timeMs: 750 }).column;
};

// ----------------------------------------------------
// AI Coach Move-by-Move Analysis Generator
// ----------------------------------------------------

export const analyzeMatch = (
  gameHistory: { player: PlayerType; column: number; boardBefore: BoardType; boardAfter: BoardType }[],
  isPro: boolean
): MoveAnalysis[] => {
  const coachAnalyses: MoveAnalysis[] = [];
  const analysisDepth = isPro ? 6 : 4; // Pro users get the advanced depth evaluation

  gameHistory.forEach((step, turnIdx) => {
    const activePlayer = step.player;
    const oppPlayer = activePlayer === 'red' ? 'yellow' : 'red';

    // 1. Calculate optimal move with the search engine
    const engineResult = search(step.boardBefore, activePlayer, { maxDepth: analysisDepth });
    const recommendedCol = engineResult.column;

    // 2. Evaluate state BEFORE and AFTER the actual move
    const evalBefore = evaluateBoard(step.boardBefore, activePlayer);
    const evalAfter = evaluateBoard(step.boardAfter, activePlayer);

    // 3. Determine Grade
    let grade: MoveGrade;
    let commentaryEn: string;
    let commentaryRu: string;

    // Check immediate tactical outcomes
    const afterCheck = checkWin(step.boardAfter);

    const isWinningMove = afterCheck.winner === activePlayer;
    
    // Check if opponent had an immediate win that player failed to block
    let opponentWinMissedBlock = false;
    let missedBlockCol = -1;
    for (let c = 0; c < COLS; c++) {
      if (isColumnAvailable(step.boardBefore, c)) {
        const r = getAvailableRow(step.boardBefore, c);
        step.boardBefore[r][c] = oppPlayer;
        const isOppWin = checkWin(step.boardBefore).winner === oppPlayer;
        step.boardBefore[r][c] = null;
        if (isOppWin && step.column !== c) {
          opponentWinMissedBlock = true;
          missedBlockCol = c;
          break;
        }
      }
    }

    // Check if player had an immediate win that they missed
    let missedSelfWin = false;
    let selfWinCol = -1;
    for (let c = 0; c < COLS; c++) {
      if (isColumnAvailable(step.boardBefore, c)) {
        const r = getAvailableRow(step.boardBefore, c);
        step.boardBefore[r][c] = activePlayer;
        const isSelfWin = checkWin(step.boardBefore).winner === activePlayer;
        step.boardBefore[r][c] = null;
        if (isSelfWin && step.column !== c) {
          missedSelfWin = true;
          selfWinCol = c;
          break;
        }
      }
    }

    // Check if player's move allowed opponent an immediate win on their next turn
    let allowedOpponentImmediateWin = false;
    let oppWinCol = -1;
    if (!isWinningMove) {
      const boardWithMyMove = JSON.parse(JSON.stringify(step.boardAfter));
      for (let c = 0; c < COLS; c++) {
        if (isColumnAvailable(boardWithMyMove, c)) {
          const r = getAvailableRow(boardWithMyMove, c);
          boardWithMyMove[r][c] = oppPlayer;
          const isOppWin = checkWin(boardWithMyMove).winner === oppPlayer;
          boardWithMyMove[r][c] = null;
          if (isOppWin) {
            allowedOpponentImmediateWin = true;
            oppWinCol = c;
            break;
          }
        }
      }
    }

    // Assigning grades and texts
    if (isWinningMove) {
      grade = 'perfect';
      commentaryEn = "Winning strike! Match set and matched. Fantastic execution.";
      commentaryRu = "Победный удар! Партия завершена. Отличное исполнение.";
    } else if (opponentWinMissedBlock) {
      grade = 'blunder';
      commentaryEn = `Critical Blunder! You failed to block opponent's immediate win in column ${missedBlockCol + 1}.`;
      commentaryRu = `Грубая ошибка! Вы не заблокировали мгновенную победу соперника в колонке ${missedBlockCol + 1}.`;
    } else if (missedSelfWin) {
      grade = 'blunder';
      commentaryEn = `Critical Blunder! You missed a direct win in column ${selfWinCol + 1}.`;
      commentaryRu = `Грубая ошибка! Вы упустили прямую победу в колонке ${selfWinCol + 1}.`;
    } else if (allowedOpponentImmediateWin) {
      grade = 'blunder';
      commentaryEn = `Blunder! Playing column ${step.column + 1} opened up a direct winning spot for opponent in column ${oppWinCol + 1}.`;
      commentaryRu = `Грубая ошибка! Ход в колонку ${step.column + 1} открыл сопернику возможность победить ходом в колонку ${oppWinCol + 1}.`;
    } else if (step.column === recommendedCol) {
      grade = 'perfect';
      commentaryEn = "Absolute perfection. This was mathematically the strongest strategic move.";
      commentaryRu = "Идеально. Это был математически сильнейший стратегический ход.";
    } else {
      // Compare evaluation drops
      const delta = evalAfter - engineResult.score;
      
      if (delta < -300) {
        grade = 'mistake';
        commentaryEn = `Suboptimal move. You conceded strong spatial advantage. Recommended: Column ${recommendedCol + 1}.`;
        commentaryRu = `Неоптимальный ход. Вы уступили пространственное преимущество. Рекомендовалось: колонка ${recommendedCol + 1}.`;
      } else if (delta < -100) {
        grade = 'good';
        commentaryEn = `A cautious play, though column ${recommendedCol + 1} offered slightly better offensive dynamics.`;
        commentaryRu = `Осторожный ход, хотя колонка ${recommendedCol + 1} давала чуть лучшую динамику для атаки.`;
      } else {
        // High evaluation, double threat setups or good holds
        // If our move created a 3-in-a-row with both sides open (fork / double threat)
        // Basic check: did eval score jump significantly?
        if (evalAfter - evalBefore > 200) {
          grade = 'great';
          commentaryEn = "Stellar tactical move! You constructed a major offensive link or blocked a critical diagonal corridor.";
          commentaryRu = "Отличный тактический ход! Вы создали мощную связку или перекрыли диагональный коридор соперника.";
        } else {
          grade = 'good';
          commentaryEn = "A solid strategic placement maintaining active control over the grid.";
          commentaryRu = "Надежный позиционный ход, удерживающий контроль над игровой сеткой.";
        }
      }
    }

    coachAnalyses.push({
      turn: turnIdx + 1,
      player: activePlayer,
      column: step.column,
      evalBefore,
      evalAfter: grade === 'blunder' ? -500 : evalAfter, // visual graph drop for blunders
      grade,
      commentary: { en: commentaryEn, ru: commentaryRu },
      recommendedColumn: recommendedCol,
      boardStateBefore: step.boardBefore,
      boardStateAfter: step.boardAfter,
    });
  });

  return coachAnalyses;
};
