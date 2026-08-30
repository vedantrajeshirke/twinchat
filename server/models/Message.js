import mongoose from 'mongoose';
import { MAX_UPLOAD_BYTES } from '../config/env.js';

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video', 'document'], required: true },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, required: true, max: MAX_UPLOAD_BYTES },
    publicId: { type: String, default: '' }, // Cloudinary handle, for later deletion
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true, maxlength: 4000, default: '' },
    attachment: { type: attachmentSchema, default: null },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

// A message must carry text, an attachment, or both (PROJECT_PLAN §3.6).
messageSchema.pre('validate', function requireBody(next) {
  if (!this.content?.trim() && !this.attachment) {
    return next(new Error('A message needs either text or an attachment'));
  }
  next();
});

export const Message = mongoose.model('Message', messageSchema);
