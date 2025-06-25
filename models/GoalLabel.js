import mongoose from 'mongoose';

const goalLabelSchema = new mongoose.Schema({
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  color: {
    type: String,
    trim: true,
    default: '#6B7280'
  },
  icon: {
    type: String,
    trim: true,
    default: 'tag'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure unique label names within a goal
goalLabelSchema.index({ goalId: 1, name: 1 }, { unique: true });

// Indexes for performance
goalLabelSchema.index({ goalId: 1 });
goalLabelSchema.index({ createdBy: 1 });

export default mongoose.model('GoalLabel', goalLabelSchema); 