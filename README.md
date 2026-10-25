# NeuraFour

[![Deploy](https://github.com/Vinbe0/neurafour/actions/workflows/deploy.yml/badge.svg)](https://github.com/Vinbe0/neurafour/actions/workflows/deploy.yml)

**Connect Four with a minimax AI, real-time online play, and a coach that reviews your game.**

**▶ Play it: [vinbe0.github.io/neurafour](https://vinbe0.github.io/neurafour/)**  ·  [Русская версия](README.ru.md)

![NeuraFour gameplay](docs/screenshot.png)

## Features

- **AI opponent, three levels.** Minimax search with alpha-beta pruning. Easy looks 2 moves ahead (with some random play), Medium looks 4 moves ahead, and Hard looks 6.
- **Online multiplayer.** Create a room, share the 5-letter code, and play a friend in real time over WebSockets, with in-game chat and rematches.
- **AI Coach.** After each game, every move is graded (perfect / great / good / mistake / blunder) against the engine's best move. The coach points out missed wins, missed blocks and moves that handed your opponent a win.
- **Accounts and leaderboard.** Supabase auth, with a global and per-city leaderboard and match history. It works offline too, using a localStorage cache.
- **Progression.** Levels, CyberPoints, a skin shop, and a PRO tier prototype.
- Dark/light theme, responsive layout, sound effects, and a highlighted winning line.

## How the AI works

[`src/ai.ts`](src/ai.ts) does three things:

1. **Tactical checks first.** If the AI can win this move, it plays it. If the opponent can win next move, it blocks.
2. **Minimax with alpha-beta pruning.** It searches the game tree to a depth set by the difficulty. It tries center columns first (`3, 2, 4, 1, 5, 0, 6`), which makes pruning cut far more branches. A win found sooner scores higher than a win found later.
3. **Heuristic evaluation.** When the search stops, it scores the board by counting every 4-cell window: open threes and twos for each side, plus a bonus for center control.

The AI Coach reuses the same engine. For every move in your game, it compares the move you played with the engine's recommendation and with the position's score before and after.

## Multiplayer architecture

```
Browser ──WebSocket──▶ Node server (Express + ws)
                        • rooms keyed by 5-letter code
                        • server owns the board and turn order
                        • validates every move, detects the winner
```

The server is authoritative. It rejects moves made out of turn, moves into full or invalid columns, and moves after the game ends, so a modified client can't cheat. `GET /health` reports how many rooms are active.

## Tech stack

React 19 · TypeScript · Vite · Node.js · Express · `ws` · Supabase (Postgres + Auth, row-level security) · Vitest · GitHub Actions

## Testing

```bash
npm test
```

There are 26 unit tests for the game engine and AI, in [`src/ai.test.ts`](src/ai.test.ts). They cover:

- win detection in all four directions
- the AI taking wins, blocking losses, and preferring a win over a block
- the Hard AI setting up a double threat
- never playing into a full column
- search speed
- the AI Coach's move grades

CI runs the tests before every deploy.

## Running locally

```bash
npm install
npm run dev        # Vite client + WebSocket server on :5001
```

Optional settings in `.env.local`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_WS_URL=wss://your-server.example.com   # defaults to ws://<host>:5001
```

To turn on the real leaderboard, run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.

## Deployment

- **Frontend:** GitHub Pages, deployed by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to `main`. The workflow reads the `VITE_*` values from the repo's Actions variables.
- **Multiplayer server:** Render, defined in [`render.yaml`](render.yaml) (free web service, health check on `/health`).
