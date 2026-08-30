import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 24,
      match: [/^[a-z0-9_]+$/, 'Username may only contain letters, numbers and underscores'],
    },
    // PRIVATE: excluded from every public serialization (PROJECT_PLAN §9).
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, select: false },
    bio: { type: String, trim: true, maxlength: 300, default: '' },
    profilePicture: { type: String, default: '' },
    avatarPublicId: { type: String, default: '' }, // storage handle, for replacing the old file
    interests: {
      type: [String],
      default: [],
      validate: [(v) => v.length >= 3, 'Pick at least 3 interests'],
    },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
    // Reserved for a future blocking feature (PROJECT_PLAN §10).
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    theme: { type: String, default: 'ocean' },
    mode: { type: String, enum: ['light', 'dark'], default: 'light' },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.index({ interests: 1 });
userSchema.index({ firstName: 'text', lastName: 'text', username: 'text' });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

/** Safe shape for anyone: never includes email or password. */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    _id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    username: this.username,
    bio: this.bio,
    profilePicture: this.profilePicture,
    interests: this.interests,
    createdAt: this.createdAt,
  };
};

/** Shape for the account owner only: adds email and preferences. */
userSchema.methods.toPrivateJSON = function toPrivateJSON() {
  return {
    ...this.toPublicJSON(),
    email: this.email,
    theme: this.theme,
    mode: this.mode,
    friends: this.friends,
    groups: this.groups,
  };
};

export const User = mongoose.model('User', userSchema);
