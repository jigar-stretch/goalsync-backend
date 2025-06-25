import mongoose from 'mongoose';

const taskCommentSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  content: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskFile'
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
taskCommentSchema.index({ taskId: 1, createdAt: -1 });
taskCommentSchema.index({ authorId: 1 });
taskCommentSchema.index({ 'mentions': 1 });

export default mongoose.model('TaskComment', taskCommentSchema); 