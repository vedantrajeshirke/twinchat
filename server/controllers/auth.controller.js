import { User } from '../models/User.js';
import { Interest } from '../models/Interest.js';
import { signToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Keeps only interests that exist and are active, preserving user order. */
async function sanitiseInterests(names) {
  const valid = await Interest.find({ name: { $in: names }, isActive: true })
    .select('name')
    .lean();
  const allowed = new Set(valid.map((i) => i.name));
  return [...new Set(names.filter((n) => allowed.has(n)))];
}

export const signup = asyncHandler(async (req, res) => {
  const { firstName, lastName, username, email, password, interests, bio } = req.body;

  const clash = await User.findOne({ $or: [{ email }, { username }] }).lean();
  if (clash) {
    throw ApiError.conflict(
      clash.email === email ? 'That email is already registered' : 'That username is taken'
    );
  }

  const chosen = await sanitiseInterests(interests);
  if (chosen.length < 3) throw ApiError.badRequest('Pick at least 3 interests from the list');

  const user = await User.create({
    firstName, lastName, username, email, password, interests: chosen, bio,
  });

  res.status(201).json({ token: signToken(user._id), user: user.toPrivateJSON() });
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const key = identifier.toLowerCase();

  const user = await User.findOne({ $or: [{ email: key }, { username: key }] }).select('+password');

  // One generic message either way: never reveal which field was wrong (§5.3).
  const invalid = ApiError.unauthorized('Incorrect username/email or password');
  if (!user) throw invalid;
  if (!(await user.comparePassword(password))) throw invalid;

  res.json({ token: signToken(user._id), user: user.toPrivateJSON() });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toPrivateJSON() });
});

export const checkUsername = asyncHandler(async (req, res) => {
  const username = String(req.query.username || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return res.json({ available: false, reason: 'invalid' });
  }
  const taken = await User.exists({ username });
  res.json({ available: !taken });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Your current password is incorrect');
  }

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
});
