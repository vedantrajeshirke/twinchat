/**
 * Removes the seeded demo community and everything belonging to it, leaving
 * real accounts untouched.
 *
 *   npm run remove:demo
 *
 * Demo accounts are identified by their @twinchat.dev email, which no real
 * signup can hold. Groups they own, threads they took part in, and the
 * messages inside those threads go with them, and any dangling references
 * held by surviving users are cleaned up.
 */
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Group } from '../models/Group.js';
import { ConnectionRequest } from '../models/ConnectionRequest.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { deleteFile } from '../utils/storage.js';

const DEMO_EMAIL = /@twinchat\.dev$/;

await connectDB();

const demoUsers = await User.find({ email: DEMO_EMAIL }).lean();
if (demoUsers.length === 0) {
  console.log('\n✔ No demo accounts found. Nothing to remove.\n');
  await disconnectDB();
  await mongoose.connection.close();
  process.exit(0);
}

const demoIds = demoUsers.map((u) => u._id);
const survivors = await User.countDocuments({ email: { $not: DEMO_EMAIL } });

console.log(`\nRemoving ${demoUsers.length} demo accounts: ${demoUsers.map((u) => u.username).join(', ')}`);
console.log(`Keeping ${survivors} real account${survivors === 1 ? '' : 's'}.\n`);

// Groups owned by a demo account go entirely; groups merely joined by one
// just lose that member.
const demoGroups = await Group.find({ owner: { $in: demoIds } }).lean();
const demoGroupIds = demoGroups.map((g) => g._id);

// Every thread a demo account took part in, plus its messages.
const doomedConversations = await Conversation.find({
  $or: [{ participants: { $in: demoIds } }, { group: { $in: demoGroupIds } }],
}).lean();
const doomedConversationIds = doomedConversations.map((c) => c._id);

// Release any uploaded files first, so nothing is orphaned in storage.
const withAttachments = await Message.find({
  conversation: { $in: doomedConversationIds },
  attachment: { $ne: null },
}).lean();
for (const m of withAttachments) await deleteFile(m.attachment.publicId);
for (const u of demoUsers) if (u.avatarPublicId) await deleteFile(u.avatarPublicId);
for (const g of demoGroups) if (g.picturePublicId) await deleteFile(g.picturePublicId);

const removed = {
  messages: (await Message.deleteMany({ conversation: { $in: doomedConversationIds } })).deletedCount,
  conversations: (await Conversation.deleteMany({ _id: { $in: doomedConversationIds } })).deletedCount,
  groups: (await Group.deleteMany({ _id: { $in: demoGroupIds } })).deletedCount,
  requests: (await ConnectionRequest.deleteMany({
    $or: [{ from: { $in: demoIds } }, { to: { $in: demoIds } }],
  })).deletedCount,
  users: (await User.deleteMany({ _id: { $in: demoIds } })).deletedCount,
  files: withAttachments.length,
};

// Surviving users may still point at what was just deleted.
await User.updateMany({}, { $pull: { friends: { $in: demoIds }, groups: { $in: demoGroupIds } } });
await Group.updateMany({}, { $pull: { members: { $in: demoIds } } });
await Conversation.updateMany({}, { $pull: { participants: { $in: demoIds } } });

console.log('✔ Removed');
console.table(removed);

const left = await User.find({}).select('username email').lean();
console.log(`\nAccounts remaining (${left.length}):`);
left.forEach((u) => console.log(`  ${u.username.padEnd(22)} ${u.email}`));
console.log('');

await disconnectDB();
await mongoose.connection.close();
process.exit(0);
