import mongoose from 'mongoose';

const goalInviteSchema = new mongoose.Schema({
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true
  },
  inviteeEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  inviterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'member', 'viewer'],
    default: 'member'
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  accepted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
goalInviteSchema.index({ goalId: 1 });
goalInviteSchema.index({ inviteeEmail: 1 });
goalInviteSchema.index({ token: 1 });
goalInviteSchema.index({ expiresAt: 1 });

// TTL index to automatically delete expired invites
goalInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('GoalInvite', goalInviteSchema); 