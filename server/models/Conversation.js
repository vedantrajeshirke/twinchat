import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['direct', 'group'], required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  { timestamps: true }
);

// Conversation list is sorted by most recent activity.
conversationSchema.index({ updatedAt: -1 });
// One direct thread per group, one per pair (pair uniqueness enforced in the controller).
conversationSchema.index({ group: 1 }, { unique: true, partialFilterExpression: { type: 'group' } });

export const Conversation = mongoose.model('Conversation', conversationSchema);
