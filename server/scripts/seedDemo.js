/**
 * Seeds the demo community against whatever MONGO_URI points at.
 *
 * With no MONGO_URI the server runs an in-process database that this separate
 * process cannot reach: use `npm run dev:demo` instead, which seeds on boot.
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDemo } from '../utils/seedDemo.js';

if (!env.mongoUri) {
  console.error(
    '\n✖ No MONGO_URI set.\n' +
      '  The in-memory database lives inside the server process, so a separate\n' +
      '  seed run cannot reach it. Use:  npm run dev:demo\n'
  );
  process.exit(1);
}

if (process.env.SEED_DEMO !== 'wipe-remote') {
  console.error(
    '\n✖ This DELETES every document in the database at MONGO_URI.\n' +
      '  Re-run as:  npm run seed:demo:remote\n'
  );
  process.exit(1);
}

await connectDB();
console.log(`⚠  Wiping and reseeding ${new URL(env.mongoUri.replace('mongodb+srv', 'https')).host}`);
await seedDemo();
await disconnectDB();
await mongoose.connection.close();
process.exit(0);
