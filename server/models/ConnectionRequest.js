import mongoose from 'mongoose';

const connectionRequestSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

// At most one live request per ordered pair; resolved ones are kept for history.
connectionRequestSchema.index(
  { from: 1, to: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export const ConnectionRequest = mongoose.model('ConnectionRequest', connectionRequestSchema);
