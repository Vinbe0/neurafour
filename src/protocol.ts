// Shared between the browser and the multiplayer server

// Errors the server can report. The server sends the code; the app shows the
// matching `error.<code>` translation.
export const ERROR_MESSAGES = {
  room_not_found: 'Room not found.',
  room_full: 'Room is full.',
  not_your_turn: 'Not your turn.',
  game_over: 'Game is already over.',
  invalid_column: 'Invalid column.',
  column_full: 'Column is full.',
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export const isErrorCode = (value: unknown): value is ErrorCode =>
  typeof value === 'string' && Object.hasOwn(ERROR_MESSAGES, value);
