import { createGameServer } from './app.ts';

const port = Number(process.env.PORT) || 5001;

// Comma-separated list of web pages allowed to connect, e.g. https://vinbe0.github.io
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);

const { server } = createGameServer({
  allowedOrigins: allowedOrigins?.length ? allowedOrigins : undefined,
  // Hosts like Render put the real client address in X-Forwarded-For
  trustProxy: process.env.TRUST_PROXY === 'true',
});

server.listen(port, () => {
  console.log(`NeuraFour multiplayer server running on port ${port}`);
  if (!allowedOrigins?.length) console.log('ALLOWED_ORIGINS is not set: accepting connections from any website');
});
