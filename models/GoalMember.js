import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['invited', 'joined', 'role_changed', 'left', 'removed', 'suspended', 'reactivated'],
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

const goalMemberSchema = new mongoose.Schema({
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: {
      values: ['owner', 'admin', 'member', 'viewer'],
      message: 'Role must be owner, admin, member, or viewer'
    },
    default: 'member'
  },
  permissions: {
    canEdit: {
      type: Boolean,
      default: function() {
        return ['owner', 'admin', 'member'].includes(this.role);
      }
    },
    canDelete: {
      type: Boolean,
      default: function() {
        return ['owner', 'admin'].includes(this.role);
      }
    },
    canInvite: {
      type: Boolean,
      default: function() {
        return ['owner', 'admin'].includes(this.role);
      }
    },
    canManageMembers: {
      type: Boolean,
      default: function() {
        return ['owner', 'admin'].includes(this.role);
      }
    },
    canViewReports: {
      type: Boolean,
      default: function() {
        return ['owner', 'admin', 'member'].includes(this.role);
      }
    }
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'suspended', 'left'],
      message: 'Status must be active, suspended, or left'
    },
    default: 'active'
  },
  joinedAt: {
    type: Date,
    default: Date.now,
    validate: {
      validator: function(v) {
        return v <= new Date();
      },
      message: 'Join date cannot be in the future'
    }
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  leftAt: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v >= this.joinedAt && v <= new Date();
      },
      message: 'Left date must be after join date and not in the future'
    }
  },
  customTitle: {
    type: String,
    trim: true,
    maxlength: [50, 'Custom title cannot exceed 50 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[a-zA-Z0-9\s\-_]+$/.test(v);
      },
      message: 'Custom title can only contain letters, numbers, spaces, hyphens, and underscores'
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  contributionScore: {
    type: Number,
    default: 0,
    min: [0, 'Contribution score cannot be negative'],
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Contribution score must be a whole number'
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    validate: {
      validator: function(v) {
        return v <= new Date();
      },
      message: 'Last activity cannot be in the future'
    }
  },
  
  // Notification preferences for this goal
  notifications: {
    taskAssigned: {
      type: Boolean,
      default: true
    },
    taskCompleted: {
      type: Boolean,
      default: true
    },
    goalUpdated: {
      type: Boolean,
      default: true
    },
    newMember: {
      type: Boolean,
      default: true
    },
    mentions: {
      type: Boolean,
      default: true
    }
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

// Ensure unique membership per goal-user combination
goalMemberSchema.index({ goalId: 1, userId: 1 }, { unique: true });

// Indexes for performance
goalMemberSchema.index({ goalId: 1, status: 1 });
goalMemberSchema.index({ userId: 1, status: 1 });
goalMemberSchema.index({ role: 1 });
goalMemberSchema.index({ invitedBy: 1 });
goalMemberSchema.index({ joinedAt: -1 });
goalMemberSchema.index({ lastActivity: -1 });
goalMemberSchema.index({ contributionScore: -1 });
goalMemberSchema.index({ deletedAt: 1 });
goalMemberSchema.index({ schemaVersion: 1 });

// Compound indexes for complex queries
goalMemberSchema.index({ goalId: 1, role: 1, status: 1 });
goalMemberSchema.index({ userId: 1, role: 1, status: 1 });

// Text search index
goalMemberSchema.index({
  customTitle: 'text',
  notes: 'text'
});

// Virtuals
goalMemberSchema.virtual('isActive').get(function() {
  return this.status === 'active' && !this.deletedAt;
});

goalMemberSchema.virtual('daysAsMember').get(function() {
  const endDate = this.leftAt || new Date();
  const diffTime = endDate - this.joinedAt;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

goalMemberSchema.virtual('canManageGoal').get(function() {
  return ['owner', 'admin'].includes(this.role) && this.status === 'active';
});

goalMemberSchema.virtual('isOwner').get(function() {
  return this.role === 'owner';
});

// Instance methods
goalMemberSchema.methods.addAuditLog = function(action, by, changes = {}, metadata = {}) {
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

goalMemberSchema.methods.changeRole = function(newRole, changedBy) {
  const oldRole = this.role;
  this.role = newRole;
  
  // Update permissions based on new role
  this.permissions.canEdit = ['owner', 'admin', 'member'].includes(newRole);
  this.permissions.canDelete = ['owner', 'admin'].includes(newRole);
  this.permissions.canInvite = ['owner', 'admin'].includes(newRole);
  this.permissions.canManageMembers = ['owner', 'admin'].includes(newRole);
  this.permissions.canViewReports = ['owner', 'admin', 'member'].includes(newRole);
  
  this.addAuditLog('role_changed', changedBy, { from: oldRole, to: newRole });
  return this.save();
};

goalMemberSchema.methods.suspend = function(suspendedBy, reason = '') {
  this.status = 'suspended';
  this.addAuditLog('suspended', suspendedBy, { reason });
  return this.save();
};

goalMemberSchema.methods.reactivate = function(reactivatedBy) {
  this.status = 'active';
  this.addAuditLog('reactivated', reactivatedBy);
  return this.save();
};

goalMemberSchema.methods.leave = function(leftBy = null) {
  this.status = 'left';
  this.leftAt = new Date();
  this.addAuditLog('left', leftBy || this.userId);
  return this.save();
};

goalMemberSchema.methods.remove = function(removedBy) {
  this.deletedAt = new Date();
  this.addAuditLog('removed', removedBy);
  return this.save();
};

goalMemberSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

goalMemberSchema.methods.incrementContribution = function(points = 1) {
  this.contributionScore += points;
  this.lastActivity = new Date();
  return this.save();
};

// Static methods
goalMemberSchema.statics.findActive = function() {
  return this.find({ deletedAt: null, status: 'active' });
};

goalMemberSchema.statics.findByGoal = function(goalId, includeInactive = false) {
  const query = { goalId, deletedAt: null };
  if (!includeInactive) {
    query.status = 'active';
  }
  return this.find(query).populate('userId', 'firstName lastName email avatar');
};

goalMemberSchema.statics.findByUser = function(userId, includeInactive = false) {
  const query = { userId, deletedAt: null };
  if (!includeInactive) {
    query.status = 'active';
  }
  return this.find(query).populate('goalId', 'title description status');
};

goalMemberSchema.statics.findOwners = function(goalId) {
  return this.find({
    goalId,
    role: 'owner',
    status: 'active',
    deletedAt: null
  }).populate('userId');
};

goalMemberSchema.statics.findAdmins = function(goalId) {
  return this.find({
    goalId,
    role: { $in: ['owner', 'admin'] },
    status: 'active',
    deletedAt: null
  }).populate('userId');
};

goalMemberSchema.statics.getMembershipStats = function(goalId) {
  return this.aggregate([
    { $match: { goalId: mongoose.Types.ObjectId(goalId), deletedAt: null } },
    {
      $group: {
        _id: null,
        totalMembers: { $sum: 1 },
        activeMembers: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        roleDistribution: {
          $push: '$role'
        },
        avgContributionScore: { $avg: '$contributionScore' }
      }
    }
  ]);
};

// Pre-save middleware
goalMemberSchema.pre('save', function(next) {
  // Ensure only one owner per goal (if changing to owner)
  if (this.isModified('role') && this.role === 'owner') {
    this.constructor.findOne({
      goalId: this.goalId,
      role: 'owner',
      _id: { $ne: this._id },
      deletedAt: null
    }).then(existingOwner => {
      if (existingOwner) {
        return next(new Error('A goal can only have one owner'));
      }
      next();
    }).catch(next);
  } else {
    next();
  }
});

// Pre-remove middleware to prevent removing the last owner
goalMemberSchema.pre('remove', async function(next) {
  if (this.role === 'owner') {
    const otherMembers = await this.constructor.find({
      goalId: this.goalId,
      _id: { $ne: this._id },
      deletedAt: null,
      status: 'active'
    });
    
    if (otherMembers.length === 0) {
      return next(new Error('Cannot remove the last member of a goal'));
    }
    
    // Check if there's another owner or admin who can take over
    const hasAdminOrOwner = otherMembers.some(member => 
      ['owner', 'admin'].includes(member.role)
    );
    
    if (!hasAdminOrOwner) {
      return next(new Error('Cannot remove owner without another admin to take over'));
    }
  }
  
  next();
});

export default mongoose.model('GoalMember', goalMemberSchema); 