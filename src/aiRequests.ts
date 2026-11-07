import { analyzeMatch, evaluatePosition, getBestMove } from './ai';
import type { Evaluation } from './ai';
import type { AIDifficulty, BoardType, MoveAnalysis, PlayerType } from './types';

// Messages exchanged with the AI worker, and the work each one asks for

export interface HistoryStep {
  player: PlayerType;
  column: number;
  boardBefore: BoardType;
  boardAfter: BoardType;
}

export type AIRequest =
  | { id: number; kind: 'bestMove'; board: BoardType; difficulty: AIDifficulty; player: PlayerType }
  | { id: number; kind: 'analyze'; history: HistoryStep[]; isPro: boolean }
  | { id: number; kind: 'evaluate'; board: BoardType; toMove: PlayerType };

export type AIResponse =
  | { id: number; kind: 'bestMove'; column: number }
  | { id: number; kind: 'analyze'; analyses: MoveAnalysis[] }
  | { id: number; kind: 'evaluate'; evaluation: Evaluation }
  | { id: number; kind: 'error'; message: string };

// Runs one request; called inside the worker, or on the main thread as a fallback
export const runRequest = (request: AIRequest): AIResponse => {
  if (request.kind === 'bestMove') {
    return { id: request.id, kind: 'bestMove', column: getBestMove(request.board, request.difficulty, request.player) };
  }
  if (request.kind === 'evaluate') {
    return { id: request.id, kind: 'evaluate', evaluation: evaluatePosition(request.board, request.toMove) };
  }
  return { id: request.id, kind: 'analyze', analyses: analyzeMatch(request.history, request.isPro) };
};
