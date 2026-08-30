import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;

/**
 * Connects to MongoDB.
 * - If MONGO_URI is set, uses it (Atlas or any real instance).
 * - Otherwise, in development only, spins up an in-process MongoDB so the app
 *   runs with zero configuration. Data is lost on restart.
 */
async function startMemoryServer() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'twinchat' } });
  return memoryServer.getUri('twinchat');
}

export async function connectDB() {
  mongoose.set('strictQuery', true);

  if (env.mongoUri) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 15000 });
      const { host, name } = mongoose.connection;
      console.log(`✔ MongoDB connected → ${host}/${name}`);
      return mongoose.connection;
    } catch (err) {
      // In production a bad connection string is fatal: never silently serve
      // a throwaway database. In development, fall back loudly so a typo in
      // MONGO_URI doesn't leave you with no app at all.
      if (env.isProd) throw err;

      const cause = /bad auth|Authentication failed/i.test(err.message)
        ? 'the username or password in MONGO_URI was rejected'
        : /ENOTFOUND|querySrv|ETIMEDOUT|ServerSelection/i.test(err.message)
          ? 'the host was unreachable. Check the address and your Atlas Network Access list'
          : err.message.split('\n')[0];

      console.warn(
        `\n⚠  Could not reach the database in MONGO_URI: ${cause}.\n` +
          '   Falling back to the in-memory database so you can keep working.\n' +
          '   Fix MONGO_URI in server/.env and restart to use the real one.\n'
      );
    }
  } else if (env.isProd) {
    throw new Error('MONGO_URI is required in production');
  }

  const uri = await startMemoryServer();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log(
    `✔ MongoDB connected → in-memory/${mongoose.connection.name} (data resets on restart)`
  );
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

export const usingMemoryDB = () => Boolean(memoryServer);
