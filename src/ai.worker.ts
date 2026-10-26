import { runRequest } from './aiRequests';
import type { AIRequest, AIResponse } from './aiRequests';

// Background thread for AI searches; see aiClient.ts for the page side
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<AIRequest>) => void) | null;
  postMessage: (message: AIResponse) => void;
};

scope.onmessage = (event) => {
  try {
    scope.postMessage(runRequest(event.data));
  } catch (err) {
    scope.postMessage({ id: event.data.id, kind: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
