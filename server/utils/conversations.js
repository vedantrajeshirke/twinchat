import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { publicUser, groupCard } from './serialize.js';

/** Finds or creates the single direct thread between two users. */
export async function ensureDirectConversation(userA, userB) {
  const participants = [userA, userB];
  const existing = await Conversation.findOne({ type: 'direct', participants: { $all: participants } });
  if (existing) return existing;

  return Conversation.create({ type: 'direct', participants });
}

export async function ensureGroupConversation(group) {
  const existing = await Conversation.findOne({ type: 'group', group: group._id });
  if (existing) return existing;

  return Conversation.create({ type: 'group', group: group._id, participants: group.members });
}

/**
 * The row shape the conversation list renders: title/avatar already resolved
 * from the other participant or the group, plus the viewer's unread count.
 */
export async function summarise(conversation, viewer) {
  const populated = await Conversation.findById(conversation._id)
    .populate('participants', 'firstName lastName username profilePicture interests')
    .populate({ path: 'group', select: 'name groupPicture mainInterest members owner description' })
    .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'firstName username' } })
    .lean();

  if (!populated) return null;

  const isGroup = populated.type === 'group';
  const other = isGroup
    ? null
    : populated.participants.find((p) => String(p._id) !== String(viewer._id));

  const unreadCount = await Message.countDocuments({
    conversation: populated._id,
    sender: { $ne: viewer._id },
    readBy: { $ne: viewer._id },
  });

  return {
    _id: populated._id,
    type: populated.type,
    title: isGroup ? populated.group?.name ?? 'Group' : other ? `${other.firstName} ${other.lastName}` : 'Unknown',
    avatar: isGroup ? populated.group?.groupPicture ?? '' : other?.profilePicture ?? '',
    otherUser: other ? publicUser(other) : null,
    group: populated.group ? groupCard(populated.group, viewer) : null,
    lastMessage: populated.lastMessage ?? null,
    unreadCount,
    updatedAt: populated.updatedAt,
  };
}
