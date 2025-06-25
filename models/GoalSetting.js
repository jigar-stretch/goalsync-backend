import mongoose from 'mongoose';

const goalSettingSchema = new mongoose.Schema({
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true,
    unique: true
  },
  remindersEnabled: {
    type: Boolean,
    default: true
  },
  reminderTime: {
    type: String,
    default: '09:00'
  },
  dailySummary: {
    type: Boolean,
    default: false
  },
  calendarSync: {
    type: Boolean,
    default: false
  },
  visibility: {
    type: String,
    enum: ['private', 'shared', 'public'],
    default: 'private'
  },
  defaultAssignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  defaultPriority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  autoArchiveDoneTasks: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
goalSettingSchema.index({ goalId: 1 });

export default mongoose.model('GoalSetting', goalSettingSchema); 