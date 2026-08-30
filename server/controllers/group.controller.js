import mongoose from 'mongoose';
import { Group } from '../models/Group.js';
import { User } from '../models/User.js';
import { Interest } from '../models/Interest.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { storeFile, deleteFile } from '../utils/storage.js';
import { groupCard, userCards } from '../utils/serialize.js';
import { ensureGroupConversation } from '../utils/conversations.js';
import { getIO } from '../socket/index.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const parseList = (v) => String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

async function assertInterestExists(name) {
  const exists = await Interest.exists({ name, isActive: true });
  if (!exists) throw ApiError.badRequest(`"${name}" is not on the interest list`);
}

function emitToRoom(room, event, payload) {
  try {
    getIO().to(room).emit(event, payload);
  } catch {
    /* socket layer not initialised */
  }
}

export const searchGroups = asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const interests = parseList(req.query.interests);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { description: rx }, { mainInterest: rx }];
  }
  if (interests.length) filter.mainInterest = { $in: interests };

  const [rows, total] = await Promise.all([
    Group.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Group.countDocuments(filter),
  ]);

  res.json({
    results: rows.map((g) => groupCard(g, req.user)),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

/** Groups matching what the viewer is into, that they have not joined (§10). */
export const suggestedGroups = asyncHandler(async (req, res) => {
  const rows = await Group.find({
    mainInterest: { $in: req.user.interests },
    members: { $ne: req.user._id },
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(20, Number(req.query.limit) || 6))
    .lean();

  res.json({ results: rows.map((g) => groupCard(g, req.user)) });
});

export const myGroups = asyncHandler(async (req, res) => {
  const rows = await Group.find({ members: req.user._id }).sort({ name: 1 }).lean();
  res.json({ results: rows.map((g) => groupCard(g, req.user)) });
});

export const createGroup = asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const mainInterest = String(req.body.mainInterest ?? '').trim();
  const description = String(req.body.description ?? '').trim();

  if (!name) throw ApiError.badRequest('Give your group a name');
  if (!mainInterest) throw ApiError.badRequest('Pick a main interest for the group');
  await assertInterestExists(mainInterest);

  let picture = { url: '', publicId: '' };
  if (req.file) picture = await storeFile(req.file, 'twinchat/groups');

  const group = await Group.create({
    name,
    description,
    mainInterest,
    groupPicture: picture.url,
    picturePublicId: picture.publicId,
    owner: req.user._id,
    members: [req.user._id],
  });

  await Promise.all([
    ensureGroupConversation(group),
    User.updateOne({ _id: req.user._id }, { $addToSet: { groups: group._id } }),
  ]);

  const conversation = await Conversation.findOne({ type: 'group', group: group._id }).lean();
  res.status(201).json({ group: groupCard(group, req.user), conversationId: conversation?._id });
});

export const getGroup = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Malformed id');

  const group = await Group.findById(req.params.id).lean();
  if (!group) throw ApiError.notFound('Group not found');

  const members = await User.find({ _id: { $in: group.members } }).sort({ firstName: 1 }).lean();
  const conversation = await Conversation.findOne({ type: 'group', group: group._id }).lean();

  res.json({
    group: groupCard(group, req.user),
    members: await userCards(members, req.user),
    // Only members get the thread id: non-members cannot open the chat (§6).
    conversationId: groupCard(group, req.user).isMember ? (conversation?._id ?? null) : null,
  });
});

export const updateGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) throw ApiError.notFound('Group not found');
  if (!group.isOwner(req.user._id)) throw ApiError.forbidden('Only the group owner can edit this');

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) throw ApiError.badRequest('Group name cannot be empty');
    group.name = name;
  }
  if (req.body.description !== undefined) group.description = String(req.body.description).trim();
  if (req.body.mainInterest !== undefined) {
    const mainInterest = String(req.body.mainInterest).trim();
    await assertInterestExists(mainInterest);
    group.mainInterest = mainInterest;
  }

  if (req.file) {
    const previous = group.picturePublicId;
    const { url, publicId } = await storeFile(req.file, 'twinchat/groups');
    group.groupPicture = url;
    group.picturePublicId = publicId;
    if (previous) await deleteFile(previous);
  }

  await group.save();

  const card = groupCard(group, req.user);
  emitToRoom(`group:${group._id}`, 'group:updated', { group: card });
  res.json({ group: card });
});

export const joinGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) throw ApiError.notFound('Group not found');

  if (!group.isMember(req.user._id)) {
    group.members.push(req.user._id);
    await group.save();
    await Promise.all([
      User.updateOne({ _id: req.user._id }, { $addToSet: { groups: group._id } }),
      Conversation.updateOne(
        { type: 'group', group: group._id },
        { $addToSet: { participants: req.user._id } }
      ),
    ]);
  }

  const conversation = await ensureGroupConversation(group);
  const card = groupCard(group, req.user);

  emitToRoom(`group:${group._id}`, 'group:member-joined', {
    groupId: String(group._id),
    userId: String(req.user._id),
  });

  res.json({ group: card, conversationId: conversation._id });
});

export const leaveGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) throw ApiError.notFound('Group not found');

  if (group.isOwner(req.user._id)) {
    throw ApiError.badRequest(
      'You own this group. Delete it instead, or transfer ownership first.'
    );
  }
  if (!group.isMember(req.user._id)) throw ApiError.badRequest('You are not a member of this group');

  await Promise.all([
    Group.updateOne({ _id: group._id }, { $pull: { members: req.user._id } }),
    User.updateOne({ _id: req.user._id }, { $pull: { groups: group._id } }),
    Conversation.updateOne({ type: 'group', group: group._id }, { $pull: { participants: req.user._id } }),
  ]);

  emitToRoom(`group:${group._id}`, 'group:member-left', {
    groupId: String(group._id),
    userId: String(req.user._id),
  });

  res.json({ message: `You left ${group.name}` });
});

export const deleteGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) throw ApiError.notFound('Group not found');
  if (!group.isOwner(req.user._id)) throw ApiError.forbidden('Only the group owner can delete this');

  const conversation = await Conversation.findOne({ type: 'group', group: group._id });

  await Promise.all([
    conversation ? Message.deleteMany({ conversation: conversation._id }) : null,
    conversation ? conversation.deleteOne() : null,
    User.updateMany({ groups: group._id }, { $pull: { groups: group._id } }),
    group.deleteOne(),
  ]);

  if (group.picturePublicId) await deleteFile(group.picturePublicId);

  emitToRoom(`group:${group._id}`, 'group:deleted', { groupId: String(group._id) });
  res.json({ message: 'Group deleted' });
});
