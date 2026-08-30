import { Conversation } from '../models/Conversation.js';
import { Group } from '../models/Group.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * The messaging rules from PROJECT_PLAN §6, enforced server-side on every
 * read and every send:
 *   • direct  → both parties must still be accepted friends
 *   • group   → any current member may post, friendship irrelevant
 * Returns the conversation document.
 */
export async function assertCanAccessConversation(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw ApiError.notFound('Conversation not found');

  const isParticipant = conversation.participants.some((p) => String(p) === String(userId));

  if (conversation.type === 'group') {
    const group = await Group.findById(conversation.group).select('members').lean();
    if (!group) throw ApiError.notFound('Group no longer exists');
    const isMember = group.members.some((m) => String(m) === String(userId));
    if (!isMember) throw ApiError.forbidden('Join the group to see this conversation');
    return conversation;
  }

  if (!isParticipant) throw ApiError.forbidden('This conversation is not yours');

  const other = conversation.participants.find((p) => String(p) !== String(userId));
  const me = await User.findById(userId).select('friends').lean();
  const stillFriends = me?.friends.some((f) => String(f) === String(other));
  if (!stillFriends) {
    throw ApiError.forbidden('You can only message people you are connected with');
  }

  return conversation;
}
