import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;

/**
 * Connects to MongoDB.
 * - If MONGO_URI is set, uses it (Atlas or any real instance).
 * - Otherwise, in development only, spins up an in-process MongoDB so the app
 *   runs with zero configuration. Data is lost on restart.
 */
export async function connectDB() {
  let uri = env.mongoUri;

  if (!uri) {
    if (env.isProd) throw new Error('MONGO_URI is required in production');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'twinchat' } });
    uri = memoryServer.getUri('twinchat');
    console.log('⚠  No MONGO_URI set, started in-memory MongoDB (data resets on restart)');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });

  const { host, name } = mongoose.connection;
  console.log(`✔ MongoDB connected → ${memoryServer ? 'in-memory' : host}/${name}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

export const usingMemoryDB = () => Boolean(memoryServer);
