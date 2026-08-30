import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { storeFile } from '../utils/storage.js';
import { categorise } from '../utils/storage.js';
import { ensureDirectConversation, summarise } from '../utils/conversations.js';
import { assertCanAccessConversation } from '../utils/permissions.js';
import { getIO } from '../socket/index.js';

const SENDER_FIELDS = 'firstName lastName username profilePicture';

const populateMessage = (query) =>
  query
    .populate('sender', SENDER_FIELDS)
    .populate({ path: 'replyTo', select: 'content attachment sender', populate: { path: 'sender', select: SENDER_FIELDS } });

export const listConversations = asyncHandler(async (req, res) => {
  const rows = await Conversation.find({ participants: req.user._id })
    .sort({ updatedAt: -1 })
    .select('_id')
    .lean();

  const conversations = (await Promise.all(rows.map((c) => summarise(c, req.user)))).filter(Boolean);
  res.json({ conversations });
});

export const openDirect = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!mongoose.isValidObjectId(userId)) throw ApiError.badRequest('Malformed user id');

  const isFriend = req.user.friends.some((f) => String(f) === String(userId));
  if (!isFriend) throw ApiError.forbidden('You can only message people you are connected with');

  const other = await User.findById(userId);
  if (!other) throw ApiError.notFound('No such user');

  const conversation = await ensureDirectConversation(req.user._id, other._id);
  res.json({ conversation: await summarise(conversation, req.user) });
});

export const listMessages = asyncHandler(async (req, res) => {
  await assertCanAccessConversation(req.params.id, req.user._id);

  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 30));
  const filter = { conversation: req.params.id };
  // Cursor pagination: `before` is the createdAt of the oldest row on screen.
  if (req.query.before) filter.createdAt = { $lt: new Date(req.query.before) };

  const rows = await populateMessage(
    Message.find(filter).sort({ createdAt: -1 }).limit(limit + 1)
  ).lean();

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  res.json({ messages: page.reverse(), hasMore });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const conversation = await assertCanAccessConversation(req.params.id, req.user._id);

  const content = String(req.body.content ?? '').trim();
  const replyTo = req.body.replyTo || null;

  if (!content && !req.file) throw ApiError.badRequest('Write something or attach a file');
  if (replyTo && !mongoose.isValidObjectId(replyTo)) throw ApiError.badRequest('Malformed reply id');

  if (replyTo) {
    const parent = await Message.exists({ _id: replyTo, conversation: conversation._id });
    if (!parent) throw ApiError.badRequest('You can only reply to a message in this conversation');
  }

  let attachment = null;
  if (req.file) {
    const { url, publicId } = await storeFile(req.file, 'twinchat/messages');
    attachment = {
      url,
      publicId,
      type: categorise(req.file.mimetype),
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    };
  }

  const created = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    content,
    attachment,
    replyTo,
    readBy: [req.user._id], // your own message is read by definition
  });

  conversation.lastMessage = created._id;
  conversation.updatedAt = new Date();
  await conversation.save();

  const message = await populateMessage(Message.findById(created._id)).lean();

  // Broadcast to the room, then refresh each participant's list ordering.
  try {
    const io = getIO();
    io.to(`conversation:${conversation._id}`).emit('message:new', {
      conversationId: String(conversation._id),
      message,
    });

    for (const participantId of conversation.participants) {
      const participant = await User.findById(participantId).select('friends interests').lean();
      if (!participant) continue;
      io.to(`user:${participantId}`).emit('conversation:updated', {
        conversation: await summarise(conversation, { _id: participantId, ...participant }),
      });
    }
  } catch {
    /* socket layer not initialised */
  }

  res.status(201).json({ message });
});

export const markRead = asyncHandler(async (req, res) => {
  await assertCanAccessConversation(req.params.id, req.user._id);

  await Message.updateMany(
    { conversation: req.params.id, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

  try {
    getIO().to(`conversation:${req.params.id}`).emit('message:read', {
      conversationId: String(req.params.id),
      userId: String(req.user._id),
    });
  } catch {
    /* socket layer not initialised */
  }

  res.json({ message: 'Marked as read' });
});
