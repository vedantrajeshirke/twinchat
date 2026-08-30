/**
 * Removes the seeded demo community and everything belonging to it, leaving
 * real accounts untouched.
 *
 * Demo accounts are identified by their @twinchat.dev email, which no real
 * signup can hold. Groups they own, threads they took part in, and the
 * messages inside those threads go with them, and any dangling references
 * held by surviving users are cleaned up.
 */
import { User } from '../models/User.js';
import { Group } from '../models/Group.js';
import { ConnectionRequest } from '../models/ConnectionRequest.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { deleteFile } from './storage.js';

export const DEMO_EMAIL = /@twinchat\.dev$/;

export async function removeDemo({ releaseFiles = true } = {}) {
  const demoUsers = await User.find({ email: DEMO_EMAIL }).lean();
  if (demoUsers.length === 0) {
    return { users: 0, groups: 0, conversations: 0, messages: 0, requests: 0, files: 0 };
  }

  const demoIds = demoUsers.map((u) => u._id);

  // Groups owned by a demo account go entirely; groups merely joined by one
  // just lose that member.
  const demoGroups = await Group.find({ owner: { $in: demoIds } }).lean();
  const demoGroupIds = demoGroups.map((g) => g._id);

  const doomed = await Conversation.find({
    $or: [{ participants: { $in: demoIds } }, { group: { $in: demoGroupIds } }],
  }).lean();
  const doomedIds = doomed.map((c) => c._id);

  // Release uploaded files first, so nothing is orphaned in storage.
  const withAttachments = await Message.find({
    conversation: { $in: doomedIds },
    attachment: { $ne: null },
  }).lean();
  if (releaseFiles) {
    for (const m of withAttachments) await deleteFile(m.attachment.publicId);
    for (const u of demoUsers) if (u.avatarPublicId) await deleteFile(u.avatarPublicId);
    for (const g of demoGroups) if (g.picturePublicId) await deleteFile(g.picturePublicId);
  }

  const removed = {
    messages: (await Message.deleteMany({ conversation: { $in: doomedIds } })).deletedCount,
    conversations: (await Conversation.deleteMany({ _id: { $in: doomedIds } })).deletedCount,
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

  return removed;
}
