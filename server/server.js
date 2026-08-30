import http from 'node:http';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { seedInterests } from './utils/seedInterests.js';
import { initSocket } from './socket/index.js';

async function start() {
  await connectDB();
  await seedInterests({ quiet: true });

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.port, () => {
    console.log(`✔ TwinChat API listening on http://localhost:${env.port}`);
    console.log(`  CORS origin: ${env.clientUrl}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down`);
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('✖ Failed to start server:', err);
  process.exit(1);
});
