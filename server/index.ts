import { createGameServer } from './app.ts';

const port = Number(process.env.PORT) || 5001;
const { server } = createGameServer();

server.listen(port, () => {
  console.log(`NeuraFour multiplayer server running on port ${port}`);
});
