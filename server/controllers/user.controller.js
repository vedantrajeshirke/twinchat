import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Group } from '../models/Group.js';
import { Interest } from '../models/Interest.js';
import { Conversation } from '../models/Conversation.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { storeFile, deleteFile } from '../utils/storage.js';
import { userCard, userCards, groupCard, relationshipMap } from '../utils/serialize.js';
import { getIO } from '../socket/index.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const parseList = (v) =>
  String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

/**
 * People discovery (§5.5). Matches on name/username, optionally narrowed by
 * interests, then ranks by how many interests the viewer has in common, the
 * core value prop, so it drives the ordering rather than sitting in a badge.
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const viewer = req.user;
  const q = String(req.query.q ?? '').trim();
  const interests = parseList(req.query.interests);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

  const filter = { _id: { $ne: viewer._id } };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ firstName: rx }, { lastName: rx }, { username: rx }];
  }
  if (interests.length) filter.interests = { $all: interests };

  const [rows, total] = await Promise.all([
    User.find(filter).lean(),
    User.countDocuments(filter),
  ]);

  const mine = new Set(viewer.interests);
  rows.sort((a, b) => {
    const diff =
      b.interests.filter((i) => mine.has(i)).length -
      a.interests.filter((i) => mine.has(i)).length;
    return diff !== 0 ? diff : a.firstName.localeCompare(b.firstName);
  });

  const pageRows = rows.slice((page - 1) * limit, page * limit);
  const results = await userCards(pageRows, viewer);

  res.json({ results, page, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

/** Non-friends with the most overlap: keeps a new account from feeling empty (§10). */
export const suggestedUsers = asyncHandler(async (req, res) => {
  const viewer = req.user;
  const limit = Math.min(20, Number(req.query.limit) || 6);

  const rows = await User.aggregate([
    { $match: { _id: { $nin: [viewer._id, ...viewer.friends] } } },
    {
      $addFields: {
        sharedCount: { $size: { $setIntersection: ['$interests', viewer.interests] } },
      },
    },
    { $match: { sharedCount: { $gt: 0 } } },
    { $sort: { sharedCount: -1, createdAt: -1 } },
    { $limit: limit },
  ]);

  res.json({ results: await userCards(rows, viewer) });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() }).lean();
  if (!user) throw ApiError.notFound('No such user');

  const rels = await relationshipMap(req.user, [user._id]);
  const groups = await Group.find({ members: user._id }).lean();

  res.json({
    user: userCard(user, req.user.interests, rels.get(String(user._id))),
    groups: groups.map((g) => groupCard(g, req.user)),
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = req.user;
  const { firstName, lastName, bio, interests, theme, mode } = req.body;

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (bio !== undefined) user.bio = bio;
  if (theme !== undefined) user.theme = theme;
  if (mode !== undefined) user.mode = mode;

  if (interests !== undefined) {
    const valid = await Interest.find({ name: { $in: interests }, isActive: true })
      .select('name')
      .lean();
    const allowed = new Set(valid.map((i) => i.name));
    const chosen = [...new Set(interests.filter((n) => allowed.has(n)))];
    if (chosen.length < 3) throw ApiError.badRequest('Keep at least 3 interests');
    user.interests = chosen;
  }

  await user.save();
  res.json({ user: user.toPrivateJSON() });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image was uploaded');

  const previous = req.user.avatarPublicId;
  const { url, publicId } = await storeFile(req.file, 'twinchat/avatars');

  req.user.profilePicture = url;
  req.user.avatarPublicId = publicId;
  await req.user.save();

  if (previous) await deleteFile(previous);
  res.json({ user: req.user.toPrivateJSON() });
});

export const listFriends = asyncHandler(async (req, res) => {
  const friends = await User.find({ _id: { $in: req.user.friends } })
    .sort({ firstName: 1 })
    .lean();
  res.json({ friends: await userCards(friends, req.user) });
});

export const unfriend = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) throw ApiError.badRequest('Malformed id');

  const other = await User.findById(userId);
  if (!other) throw ApiError.notFound('No such user');

  await Promise.all([
    User.updateOne({ _id: req.user._id }, { $pull: { friends: other._id } }),
    User.updateOne({ _id: other._id }, { $pull: { friends: req.user._id } }),
  ]);

  // The thread stays in the database, but neither side can post to it again
  // until they reconnect: checked on every send.
  const conversation = await Conversation.findOne({
    type: 'direct',
    participants: { $all: [req.user._id, other._id] },
  }).lean();

  try {
    getIO().to(`user:${other._id}`).emit('friend:removed', { userId: String(req.user._id) });
  } catch {
    // Socket layer not up (e.g. during tests), the REST result still stands.
  }

  res.json({ message: 'Removed from your connections', conversationId: conversation?._id ?? null });
});
