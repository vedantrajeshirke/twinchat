import mongoose from 'mongoose';

/** Stored in the DB so the list is editable without a code change (PROJECT_PLAN §3.2). */
const interestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Interest = mongoose.model('Interest', interestSchema);
