import http from 'node:http';
import { env } from './config/env.js';
import { connectDB, disconnectDB, usingMemoryDB } from './config/db.js';
import { createApp } from './app.js';
import { seedInterests } from './utils/seedInterests.js';
import { seedDemo } from './utils/seedDemo.js';
import { initSocket } from './socket/index.js';

async function start() {
  await connectDB();
  await seedInterests({ quiet: true });

  // `npm run dev:demo`: the in-memory database lives in this process, so the
  // demo community has to be seeded here rather than by a separate script.
  if (process.env.SEED_DEMO) {
    if (env.isProd) throw new Error('SEED_DEMO wipes the database. Refusing to run in production.');

    // Seeding DROPS every collection. That is harmless against the throwaway
    // in-memory database, but a real one may hold real accounts, so that case
    // needs to be asked for explicitly. Keyed off the database we actually
    // connected to, not the configured URI: an unreachable MONGO_URI falls
    // back to in-memory, and seeding that is still safe.
    if (!usingMemoryDB() && process.env.SEED_DEMO !== 'wipe-remote') {
      throw new Error(
        'SEED_DEMO would DELETE every document in the database at MONGO_URI.\n' +
          '  If that is what you want, run:  npm run seed:demo:remote\n' +
          '  To seed the throwaway in-memory database instead, clear MONGO_URI first.'
      );
    }

    await seedDemo();
  }

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
