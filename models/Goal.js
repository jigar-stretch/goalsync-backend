import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'updated', 'deleted', 'archived', 'shared', 'member_added', 'member_removed'],
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

const goalSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Goal title cannot exceed 200 characters'],
    validate: {
      validator: function(v) {
        return v && v.trim().length >= 3;
      },
      message: 'Goal title must be at least 3 characters long'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  why: {
    type: String,
    trim: true,
    maxlength: [1000, 'Why section cannot exceed 1000 characters']
  },
  category: {
    type: String,
    trim: true,
    maxlength: 100,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[a-zA-Z0-9\s\-_]+$/.test(v);
      },
      message: 'Category can only contain letters, numbers, spaces, hyphens, and underscores'
    }
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: 'Priority must be low, medium, or high'
    },
    default: 'medium'
  },
  status: {
    type: String,
    enum: {
      values: ['on_track', 'behind', 'completed', 'archived'],
      message: 'Status must be on_track, behind, completed, or archived'
    },
    default: 'on_track'
  },
  mode: {
    type: String,
    enum: {
      values: ['solo', 'team'],
      message: 'Mode must be solo or team'
    },
    default: 'solo'
  },
  visibility: {
    type: String,
    enum: {
      values: ['private', 'shared'],
      message: 'Visibility must be private or shared'
    },
    default: 'private'
  },
  startDate: {
    type: Date,
    default: Date.now,
    validate: {
      validator: function(v) {
        return !v || v <= new Date();
      },
      message: 'Start date cannot be in the future'
    }
  },
  deadline: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v > this.startDate;
      },
      message: 'Deadline must be after start date'
    }
  },
  weeklyTimeCommitment: {
    type: Number,
    min: [0, 'Weekly time commitment cannot be negative'],
    max: [168, 'Weekly time commitment cannot exceed 168 hours'],
    validate: {
      validator: function(v) {
        return !v || (Number.isInteger(v * 4)); // Allow quarter hours
      },
      message: 'Time commitment must be in quarter-hour increments'
    }
  },
  progress: {
    type: Number,
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100%'],
    default: 0,
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Progress must be a whole number'
    }
  },
  color: {
    type: String,
    trim: true,
    default: '#3B82F6',
    validate: {
      validator: function(v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Color must be a valid hex color code'
    }
  },
  icon: {
    type: String,
    trim: true,
    default: 'target',
    maxlength: [50, 'Icon name cannot exceed 50 characters']
  },
  backgroundImageUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Background image must be a valid image URL'
    }
  },
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GoalLabel'
  }],
  archived: {
    type: Boolean,
    default: false
  },
  starred: {
    type: Boolean,
    default: false
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

// Indexes for performance
goalSchema.index({ ownerId: 1, archived: 1, deletedAt: 1 });
goalSchema.index({ status: 1 });
goalSchema.index({ deadline: 1 });
goalSchema.index({ priority: 1 });
goalSchema.index({ mode: 1 });
goalSchema.index({ visibility: 1 });
goalSchema.index({ createdAt: -1 });
goalSchema.index({ schemaVersion: 1 });

// Text search index
goalSchema.index({ 
  title: 'text', 
  description: 'text', 
  why: 'text', 
  category: 'text' 
});

// Virtual for calculating days until deadline
goalSchema.virtual('daysUntilDeadline').get(function() {
  if (!this.deadline) return null;
  const now = new Date();
  const diffTime = this.deadline - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance methods
goalSchema.methods.addAuditLog = function(action, by, changes = {}, metadata = {}) {
  this.auditLog.push({
    action,
    by,
    changes,
    metadata,
    at: new Date()
  });
  
  // Keep only last 50 audit entries
  if (this.auditLog.length > 50) {
    this.auditLog = this.auditLog.slice(-50);
  }
  
  return this;
};

goalSchema.methods.softDelete = function(deletedBy) {
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.archived = true;
  this.addAuditLog('deleted', deletedBy);
  return this.save();
};

goalSchema.methods.restore = function(restoredBy) {
  this.deletedAt = null;
  this.deletedBy = null;
  this.archived = false;
  this.addAuditLog('restored', restoredBy);
  return this.save();
};

// Static methods
goalSchema.statics.findActive = function() {
  return this.find({ deletedAt: null, archived: false });
};

goalSchema.statics.findByOwner = function(ownerId, includeArchived = false) {
  const query = { ownerId, deletedAt: null };
  if (!includeArchived) {
    query.archived = false;
  }
  return this.find(query);
};

// Pre-save middleware
goalSchema.pre('save', function(next) {
  // Auto-complete goal if progress reaches 100%
  if (this.progress === 100 && this.status !== 'completed') {
    this.status = 'completed';
  }
  
  // Auto-archive completed goals after 30 days
  if (this.status === 'completed' && this.isModified('status')) {
    const completedDate = new Date();
    setTimeout(() => {
      this.archived = true;
      this.save();
    }, 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  
  next();
});

export default mongoose.model('Goal', goalSchema); 