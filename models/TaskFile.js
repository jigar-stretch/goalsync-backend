import mongoose from 'mongoose';

const taskFileSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  uploaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fileName: {
    type: String,
    trim: true,
    maxlength: 255
  },
  fileUrl: {
    type: String,
    trim: true
  },
  fileType: {
    type: String,
    trim: true
  },
  size: {
    type: Number,
    min: 0
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  previewUrl: {
    type: String,
    trim: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
taskFileSchema.index({ taskId: 1, isDeleted: 1 });
taskFileSchema.index({ uploaderId: 1 });
taskFileSchema.index({ uploadedAt: 1 });

export default mongoose.model('TaskFile', taskFileSchema); 