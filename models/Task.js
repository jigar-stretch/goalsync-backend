import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'updated', 'assigned', 'unassigned', 'status_changed', 'completed', 'blocked', 'unblocked', 'deleted'],
    required: true
  },
  by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  at: {
    type: Date,
    default: Date.now
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const assigneeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    enum: {
      values: ['owner', 'contributor', 'observer'],
      message: 'Role must be owner, contributor, or observer'
    },
    default: 'contributor'
  },
  status: {
    type: String,
    enum: {
      values: ['not_started', 'in_progress', 'done'],
      message: 'Status must be not_started, in_progress, or done'
    },
    default: 'not_started'
  }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  },
  listId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List'
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters'],
    validate: {
      validator: function(v) {
        return v && v.trim().length >= 2;
      },
      message: 'Task title must be at least 2 characters long'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'in_progress', 'completed', 'archived'],
      message: 'Status must be pending, in_progress, completed, or archived'
    },
    default: 'pending'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: 'Priority must be low, medium, high, or critical'
    },
    default: 'medium'
  },
  startDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v || !this.dueDate) return true;
        return v <= this.dueDate;
      },
      message: 'Start date must be before due date'
    }
  },
  dueDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        const now = new Date();
        const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        return v <= oneYearFromNow;
      },
      message: 'Due date cannot be more than one year in the future'
    }
  },
  completedAt: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v <= new Date();
      },
      message: 'Completion date cannot be in the future'
    }
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative'],
    max: [999, 'Estimated hours cannot exceed 999'],
    validate: {
      validator: function(v) {
        return !v || (Number.isFinite(v) && v >= 0);
      },
      message: 'Estimated hours must be a valid positive number'
    }
  },
  assignees: {
    type: [assigneeSchema],
    validate: {
      validator: function(v) {
        // Ensure no duplicate user assignments
        const userIds = v.map(a => a.userId.toString());
        return userIds.length === new Set(userIds).size;
      },
      message: 'Cannot assign the same user multiple times'
    }
  },
  watchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GoalLabel'
  }],
  checklistProgress: {
    type: Number,
    min: [0, 'Checklist progress cannot be negative'],
    max: [100, 'Checklist progress cannot exceed 100%'],
    default: 0,
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Checklist progress must be a whole number'
    }
  },
  commentsCount: {
    type: Number,
    min: [0, 'Comments count cannot be negative'],
    default: 0
  },
  attachmentsCount: {
    type: Number,
    min: [0, 'Attachments count cannot be negative'],
    default: 0
  },
  repeat: {
    type: String,
    enum: {
      values: ['none', 'daily', 'weekly', 'custom'],
      message: 'Repeat must be none, daily, weekly, or custom'
    },
    default: 'none'
  },
  recurrencePattern: {
    type: String,
    trim: true,
    maxlength: [100, 'Recurrence pattern cannot exceed 100 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true;
        // Basic RRULE validation (simplified)
        return /^(FREQ=|INTERVAL=|COUNT=|UNTIL=|BYDAY=|BYMONTH=)/.test(v.toUpperCase());
      },
      message: 'Invalid recurrence pattern format'
    }
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockingReason: {
    type: String,
    trim: true,
    maxlength: [300, 'Blocking reason cannot exceed 300 characters'],
    validate: {
      validator: function(v) {
        if (!this.isBlocked) return !v; // Must be empty if not blocked
        return v && v.trim().length > 0; // Must have reason if blocked
      },
      message: 'Blocking reason is required when task is blocked'
    }
  },
  isSubtask: {
    type: Boolean,
    default: false
  },
  parentTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v.toString() !== this._id?.toString(); // Cannot be parent of itself
      },
      message: 'Task cannot be its own parent'
    }
  },
  archived: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Schema versioning
  schemaVersion: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Audit trail
  auditLog: [auditLogSchema],
  
  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Time tracking
  timeSpent: {
    type: Number,
    default: 0,
    min: [0, 'Time spent cannot be negative']
  },
  
  // Position for ordering within lists
  position: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.auditLog; // Hide audit log from API responses
      return ret;
    }
  }
});

// Indexes for performance
taskSchema.index({ goalId: 1, archived: 1, deletedAt: 1 });
taskSchema.index({ listId: 1, position: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ 'assignees.userId': 1 });
taskSchema.index({ parentTaskId: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ isBlocked: 1 });
taskSchema.index({ completedAt: -1 });
taskSchema.index({ schemaVersion: 1 });

// Text search index
taskSchema.index({ 
  title: 'text', 
  description: 'text' 
});

// Compound indexes for complex queries
taskSchema.index({ goalId: 1, status: 1, priority: -1 });
taskSchema.index({ 'assignees.userId': 1, status: 1, dueDate: 1 });

// Virtuals
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed') return false;
  return new Date() > this.dueDate;
});

taskSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const now = new Date();
  const diffTime = this.dueDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

taskSchema.virtual('subtaskCount').get(function() {
  return this.model('Task').countDocuments({ 
    parentTaskId: this._id, 
    deletedAt: null 
  });
});

// Instance methods
taskSchema.methods.addAuditLog = function(action, by, changes = {}, metadata = {}) {
  this.auditLog.push({
    action,
    by,
    changes,
    metadata,
    at: new Date()
  });
  
  // Keep only last 100 audit entries for tasks (more than goals due to more activity)
  if (this.auditLog.length > 100) {
    this.auditLog = this.auditLog.slice(-100);
  }
  
  return this;
};

taskSchema.methods.assignUser = function(userId, assignedBy, role = 'contributor') {
  const existingAssignee = this.assignees.find(a => a.userId.toString() === userId.toString());
  if (existingAssignee) {
    throw new Error('User is already assigned to this task');
  }
  
  this.assignees.push({
    userId,
    assignedBy,
    role,
    assignedAt: new Date()
  });
  
  this.addAuditLog('assigned', assignedBy, { userId, role });
  return this.save();
};

taskSchema.methods.unassignUser = function(userId, unassignedBy) {
  this.assignees = this.assignees.filter(a => a.userId.toString() !== userId.toString());
  this.addAuditLog('unassigned', unassignedBy, { userId });
  return this.save();
};

taskSchema.methods.complete = function(completedBy) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.addAuditLog('completed', completedBy);
  return this.save();
};

taskSchema.methods.block = function(reason, blockedBy) {
  this.isBlocked = true;
  this.blockingReason = reason;
  this.addAuditLog('blocked', blockedBy, { reason });
  return this.save();
};

taskSchema.methods.unblock = function(unblockedBy) {
  this.isBlocked = false;
  this.blockingReason = '';
  this.addAuditLog('unblocked', unblockedBy);
  return this.save();
};

taskSchema.methods.softDelete = function(deletedBy) {
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.archived = true;
  this.addAuditLog('deleted', deletedBy);
  return this.save();
};

// Static methods
taskSchema.statics.findActive = function() {
  return this.find({ deletedAt: null, archived: false });
};

taskSchema.statics.findByAssignee = function(userId, status = null) {
  const query = { 
    'assignees.userId': userId, 
    deletedAt: null, 
    archived: false 
  };
  if (status) query.status = status;
  return this.find(query);
};

taskSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $ne: 'completed' },
    deletedAt: null,
    archived: false
  });
};

taskSchema.statics.findByGoal = function(goalId, includeSubtasks = true) {
  const query = { goalId, deletedAt: null };
  if (!includeSubtasks) {
    query.isSubtask = false;
  }
  return this.find(query);
};

// Pre-save middleware
taskSchema.pre('save', function(next) {
  // Auto-set completion date when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Clear completion date if status changes from completed
  if (this.isModified('status') && this.status !== 'completed' && this.completedAt) {
    this.completedAt = null;
  }
  
  // Validate blocking reason
  if (this.isBlocked && !this.blockingReason) {
    return next(new Error('Blocking reason is required when task is blocked'));
  }
  
  // Clear blocking reason if not blocked
  if (!this.isBlocked && this.blockingReason) {
    this.blockingReason = '';
  }
  
  next();
});

export default mongoose.model('Task', taskSchema); 