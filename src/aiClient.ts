import { runRequest } from './aiRequests';
import type { AIRequest, AIResponse, HistoryStep } from './aiRequests';
import type { AIDifficulty, BoardType, PlayerType } from './types';

// Runs AI searches in a Web Worker so the page stays responsive while the engine
// thinks. Falls back to running on the main thread if workers are unavailable.

// A request before it is given an id (Omit applied to each member of the union)
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;
type RequestBody = WithoutId<AIRequest>;

let worker: Worker | null | undefined;
let nextId = 1;
// Each pending request knows how to finish itself: with the worker's answer, or on the main thread
const pending = new Map<number, { resolve: (value: AIResponse) => void; fallback: () => void }>();

const getWorker = () => {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<AIResponse>) => {
      const handlers = pending.get(event.data.id);
      if (!handlers) return;
      pending.delete(event.data.id);
      if (event.data.kind === 'error') {
        console.error('AI worker error, retrying on the main thread', event.data.message);
        handlers.fallback();
      } else {
        handlers.resolve(event.data);
      }
    };
    worker.onerror = (event) => {
      console.error('AI worker failed, falling back to the main thread', event.message);
      for (const { fallback } of pending.values()) fallback();
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  } catch (err) {
    console.warn('Web Workers unavailable, running the AI on the main thread', err);
    worker = null;
  }
  return worker;
};

const send = (body: RequestBody): Promise<AIResponse> => {
  const request = { ...body, id: nextId++ } as AIRequest;
  const target = getWorker();
  if (!target) {
    // Yield first so the UI can paint "thinking" before the search blocks
    return new Promise((resolve) => setTimeout(() => resolve(runRequest(request)), 0));
  }
  return new Promise((resolve) => {
    pending.set(request.id, { resolve, fallback: () => resolve(runRequest(request)) });
    target.postMessage(request);
  });
};

export const requestBestMove = async (board: BoardType, difficulty: AIDifficulty, player: PlayerType) => {
  const response = await send({ kind: 'bestMove', board, difficulty, player });
  return response.kind === 'bestMove' ? response.column : -1;
};

export const requestAnalysis = async (history: HistoryStep[], isPro: boolean) => {
  const response = await send({ kind: 'analyze', history, isPro });
  return response.kind === 'analyze' ? response.analyses : [];
};
