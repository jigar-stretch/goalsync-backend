import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'updated', 'completed', 'uncompleted', 'assigned', 'deleted'],
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
  }
}, { _id: false });

const checklistItemSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  label: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Checklist item label cannot exceed 200 characters'],
    validate: {
      validator: function(v) {
        return v && v.trim().length >= 1;
      },
      message: 'Checklist item label must be at least 1 character long'
    }
  },
  completed: {
    type: Boolean,
    default: false
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
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  position: {
    type: Number,
    required: true,
    min: [0, 'Position cannot be negative'],
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Position must be a whole number'
    }
  },
  dueDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        const now = new Date();
        const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        return v >= now && v <= oneYearFromNow;
      },
      message: 'Due date must be between now and one year from now'
    }
  },
  assigneeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date,
    default: function() {
      return this.assigneeId ? new Date() : null;
    }
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: 'Priority must be low, medium, or high'
    },
    default: 'medium'
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

// Ensure unique position within a task
checklistItemSchema.index({ taskId: 1, position: 1 }, { unique: true });

// Indexes for performance
checklistItemSchema.index({ taskId: 1, deletedAt: 1 });
checklistItemSchema.index({ assigneeId: 1 });
checklistItemSchema.index({ completed: 1 });
checklistItemSchema.index({ dueDate: 1 });
checklistItemSchema.index({ priority: 1 });
checklistItemSchema.index({ schemaVersion: 1 });

// Text search index
checklistItemSchema.index({ 
  label: 'text', 
  notes: 'text' 
});

// Virtuals
checklistItemSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.completed) return false;
  return new Date() > this.dueDate;
});

checklistItemSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const now = new Date();
  const diffTime = this.dueDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance methods
checklistItemSchema.methods.addAuditLog = function(action, by, changes = {}) {
  this.auditLog.push({
    action,
    by,
    changes,
    at: new Date()
  });
  
  // Keep only last 20 audit entries for checklist items
  if (this.auditLog.length > 20) {
    this.auditLog = this.auditLog.slice(-20);
  }
  
  return this;
};

checklistItemSchema.methods.complete = function(completedBy) {
  this.completed = true;
  this.completedAt = new Date();
  this.completedBy = completedBy;
  this.addAuditLog('completed', completedBy);
  return this.save();
};

checklistItemSchema.methods.uncomplete = function(uncompletedBy) {
  this.completed = false;
  this.completedAt = null;
  this.completedBy = null;
  this.addAuditLog('uncompleted', uncompletedBy);
  return this.save();
};

checklistItemSchema.methods.assign = function(assigneeId, assignedBy) {
  this.assigneeId = assigneeId;
  this.assignedAt = new Date();
  this.assignedBy = assignedBy;
  this.addAuditLog('assigned', assignedBy, { assigneeId });
  return this.save();
};

checklistItemSchema.methods.unassign = function(unassignedBy) {
  const previousAssigneeId = this.assigneeId;
  this.assigneeId = null;
  this.assignedAt = null;
  this.assignedBy = null;
  this.addAuditLog('unassigned', unassignedBy, { previousAssigneeId });
  return this.save();
};

checklistItemSchema.methods.softDelete = function(deletedBy) {
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.addAuditLog('deleted', deletedBy);
  return this.save();
};

// Static methods
checklistItemSchema.statics.findActive = function() {
  return this.find({ deletedAt: null });
};

checklistItemSchema.statics.findByTask = function(taskId, includeCompleted = true) {
  const query = { taskId, deletedAt: null };
  if (!includeCompleted) {
    query.completed = false;
  }
  return this.find(query).sort({ position: 1 });
};

checklistItemSchema.statics.findByAssignee = function(assigneeId, completed = null) {
  const query = { assigneeId, deletedAt: null };
  if (completed !== null) {
    query.completed = completed;
  }
  return this.find(query);
};

checklistItemSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    completed: false,
    deletedAt: null
  });
};

// Pre-save middleware
checklistItemSchema.pre('save', function(next) {
  // Auto-set completion data when completed status changes
  if (this.isModified('completed')) {
    if (this.completed && !this.completedAt) {
      this.completedAt = new Date();
    } else if (!this.completed) {
      this.completedAt = null;
      this.completedBy = null;
    }
  }
  
  // Set assignment data when assignee changes
  if (this.isModified('assigneeId') && this.assigneeId && !this.assignedAt) {
    this.assignedAt = new Date();
  }
  
  // Clear assignment data when assignee is removed
  if (this.isModified('assigneeId') && !this.assigneeId) {
    this.assignedAt = null;
    this.assignedBy = null;
  }
  
  next();
});

// Post-save middleware to update parent task checklist progress
checklistItemSchema.post('save', async function(doc) {
  try {
    const Task = mongoose.model('Task');
    const task = await Task.findById(doc.taskId);
    if (task) {
      const allItems = await ChecklistItem.find({ taskId: doc.taskId, deletedAt: null });
      const completedItems = allItems.filter(item => item.completed);
      const progress = allItems.length > 0 ? Math.round((completedItems.length / allItems.length) * 100) : 0;
      
      await Task.findByIdAndUpdate(doc.taskId, { checklistProgress: progress });
    }
  } catch (error) {
    console.error('Error updating task checklist progress:', error);
  }
});

const ChecklistItem = mongoose.model('ChecklistItem', checklistItemSchema);

export default ChecklistItem; 