/**
 * Deletes the demo community, keeping real accounts.
 *
 *   npm run remove:demo
 */
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { removeDemo } from '../utils/removeDemo.js';
import { User } from '../models/User.js';

await connectDB();

const removed = await removeDemo();
if (removed.users === 0) {
  console.log('\n✔ No demo accounts found. Nothing to remove.\n');
} else {
  console.log('\n✔ Removed');
  console.table(removed);
}

const left = await User.find({}).select('username email').lean();
console.log(`Accounts remaining (${left.length}):`);
left.forEach((u) => console.log(`  ${u.username.padEnd(22)} ${u.email}`));
console.log('');

await disconnectDB();
await mongoose.connection.close();
process.exit(0);
