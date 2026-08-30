import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    mainInterest: { type: String, required: true, trim: true, index: true },
    groupPicture: { type: String, default: '' },
    picturePublicId: { type: String, default: '' }, // storage handle, for replacing the old file
    // Single admin for v1; the shape allows an admins array later (PROJECT_PLAN §10).
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

groupSchema.index({ name: 'text', description: 'text' });

groupSchema.methods.isMember = function isMember(userId) {
  return this.members.some((m) => String(m._id ?? m) === String(userId));
};

groupSchema.methods.isOwner = function isOwner(userId) {
  return String(this.owner._id ?? this.owner) === String(userId);
};

export const Group = mongoose.model('Group', groupSchema);
