import mongoose from 'mongoose';
import { ConnectionRequest } from '../models/ConnectionRequest.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { userCard } from '../utils/serialize.js';
import { ensureDirectConversation, summarise } from '../utils/conversations.js';
import { getIO } from '../socket/index.js';

const USER_FIELDS = 'firstName lastName username profilePicture bio interests createdAt';

/** Best-effort realtime push; never let a socket failure fail the request. */
function emitTo(userId, event, payload) {
  try {
    getIO().to(`user:${userId}`).emit(event, payload);
  } catch {
    /* socket layer not initialised */
  }
}

export const listRequests = asyncHandler(async (req, res) => {
  const [incoming, outgoing] = await Promise.all([
    ConnectionRequest.find({ to: req.user._id, status: 'pending' })
      .populate('from', USER_FIELDS)
      .sort({ createdAt: -1 })
      .lean(),
    ConnectionRequest.find({ from: req.user._id, status: 'pending' })
      .populate('to', USER_FIELDS)
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  res.json({
    incoming: incoming.map((r) => ({
      _id: r._id,
      createdAt: r.createdAt,
      from: userCard(r.from, req.user.interests, 'request_received'),
    })),
    outgoing: outgoing.map((r) => ({
      _id: r._id,
      createdAt: r.createdAt,
      to: userCard(r.to, req.user.interests, 'request_sent'),
    })),
    incomingCount: incoming.length,
  });
});

export const sendRequest = asyncHandler(async (req, res) => {
  const { toUserId } = req.body;
  if (!mongoose.isValidObjectId(toUserId)) throw ApiError.badRequest('Malformed user id');
  if (String(toUserId) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot connect with yourself');
  }

  const target = await User.findById(toUserId);
  if (!target) throw ApiError.notFound('No such user');

  if (req.user.friends.some((f) => String(f) === String(target._id))) {
    throw ApiError.conflict('You are already connected');
  }

  const existing = await ConnectionRequest.findOne({
    status: 'pending',
    $or: [
      { from: req.user._id, to: target._id },
      { from: target._id, to: req.user._id },
    ],
  });
  if (existing) {
    throw ApiError.conflict(
      String(existing.from) === String(req.user._id)
        ? 'You already sent a request to this person'
        : 'This person has already sent you a request'
    );
  }

  const request = await ConnectionRequest.create({ from: req.user._id, to: target._id });

  emitTo(target._id, 'request:new', {
    request: {
      _id: request._id,
      createdAt: request.createdAt,
      from: userCard(req.user, target.interests, 'request_received'),
    },
  });

  res.status(201).json({ request: { _id: request._id, status: request.status } });
});

export const acceptRequest = asyncHandler(async (req, res) => {
  const request = await ConnectionRequest.findById(req.params.id);
  if (!request || request.status !== 'pending') throw ApiError.notFound('Request not found');
  if (String(request.to) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the recipient can accept this request');
  }

  const sender = await User.findById(request.from);
  if (!sender) throw ApiError.notFound('That account no longer exists');

  request.status = 'accepted';
  await Promise.all([
    request.save(),
    User.updateOne({ _id: req.user._id }, { $addToSet: { friends: sender._id } }),
    User.updateOne({ _id: sender._id }, { $addToSet: { friends: req.user._id } }),
  ]);

  // Keep the in-memory copy in step so the summary below sees the new friend.
  req.user.friends.addToSet(sender._id);

  const conversation = await ensureDirectConversation(req.user._id, sender._id);
  const [forMe, forThem] = await Promise.all([
    summarise(conversation, req.user),
    summarise(conversation, sender),
  ]);

  emitTo(sender._id, 'request:accepted', {
    conversation: forThem,
    friend: userCard(req.user, sender.interests, 'friend'),
  });

  res.json({
    conversation: forMe,
    friend: userCard(sender, req.user.interests, 'friend'),
  });
});

export const declineRequest = asyncHandler(async (req, res) => {
  const request = await ConnectionRequest.findById(req.params.id);
  if (!request || request.status !== 'pending') throw ApiError.notFound('Request not found');
  if (String(request.to) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the recipient can decline this request');
  }

  request.status = 'declined';
  await request.save();
  res.json({ message: 'Request declined' });
});

export const cancelRequest = asyncHandler(async (req, res) => {
  const request = await ConnectionRequest.findById(req.params.id);
  if (!request || request.status !== 'pending') throw ApiError.notFound('Request not found');
  if (String(request.from) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the sender can cancel this request');
  }

  await request.deleteOne();
  emitTo(request.to, 'request:cancelled', { requestId: String(request._id) });
  res.json({ message: 'Request cancelled' });
});
