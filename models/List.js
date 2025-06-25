import mongoose from 'mongoose';

const listSchema = new mongoose.Schema({
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  position: {
    type: Number,
    required: true,
    min: 0
  },
  archived: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    trim: true,
    default: '#F3F4F6'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure unique position within a goal
listSchema.index({ goalId: 1, position: 1 }, { unique: true });

// Indexes for performance
listSchema.index({ goalId: 1, archived: 1 });
listSchema.index({ createdBy: 1 });

export default mongoose.model('List', listSchema); 