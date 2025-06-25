import mongoose from 'mongoose';

const userCalendarAccountSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Calendar provider
  provider: {
    type: String,
    enum: ['google', 'microsoft', 'apple', 'caldav'],
    required: true
  },
  calendarEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  // OAuth tokens
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    default: null
  },
  tokenExpiry: {
    type: Date,
    required: true
  },
  scope: [{
    type: String
  }],

  // Calendar settings
  isPrimaryCalendar: {
    type: Boolean,
    default: false
  },
  syncStatus: {
    type: String,
    enum: ['active', 'paused', 'error', 'disconnected'],
    default: 'active'
  },
  syncDirection: {
    type: String,
    enum: ['bidirectional', 'import_only', 'export_only'],
    default: 'bidirectional'
  },

  // Sync timestamps
  lastSynced: {
    type: Date,
    default: null
  },
  lastSuccessfulSync: {
    type: Date,
    default: null
  },
  nextSyncAt: {
    type: Date,
    default: null
  },

  // Sync statistics
  totalEventsSynced: {
    type: Number,
    default: 0
  },
  lastSyncEventCount: {
    type: Number,
    default: 0
  },
  syncErrors: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    error: String,
    errorCode: String,
    resolved: {
      type: Boolean,
      default: false
    }
  }],

  // Calendar metadata
  calendarIds: [{
    id: String,
    name: String,
    description: String,
    color: String,
    isEnabled: {
      type: Boolean,
      default: true
    },
    lastModified: Date
  }],

  // Provider-specific settings
  providerSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Sync preferences
  syncPreferences: {
    syncInterval: {
      type: Number,
      default: 15, // minutes
      min: 5,
      max: 1440
    },
    syncPastDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 365
    },
    syncFutureDays: {
      type: Number,
      default: 365,
      min: 1,
      max: 1095
    },
    includeAllDayEvents: {
      type: Boolean,
      default: true
    },
    includeRecurringEvents: {
      type: Boolean,
      default: true
    },
    eventFilters: [{
      type: String
    }]
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.accessToken;
      delete ret.refreshToken;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
userCalendarAccountSchema.index({ userId: 1 });
userCalendarAccountSchema.index({ provider: 1, calendarEmail: 1 });
userCalendarAccountSchema.index({ syncStatus: 1 });
userCalendarAccountSchema.index({ nextSyncAt: 1 });
userCalendarAccountSchema.index({ tokenExpiry: 1 });

// Instance methods
userCalendarAccountSchema.methods.updateTokens = function(accessToken, refreshToken, expiresAt) {
  this.accessToken = accessToken;
  if (refreshToken) this.refreshToken = refreshToken;
  this.tokenExpiry = expiresAt;
  return this.save();
};

userCalendarAccountSchema.methods.updateSyncStatus = function(status, error = null) {
  this.syncStatus = status;
  this.lastSynced = new Date();
  
  if (status === 'active') {
    this.lastSuccessfulSync = new Date();
    this.nextSyncAt = new Date(Date.now() + this.syncPreferences.syncInterval * 60 * 1000);
  } else if (status === 'error' && error) {
    this.syncErrors.push({
      timestamp: new Date(),
      error: error.message || error,
      errorCode: error.code || 'UNKNOWN'
    });
  }
  
  return this.save();
};

userCalendarAccountSchema.methods.incrementEventCount = function(count) {
  this.totalEventsSynced += count;
  this.lastSyncEventCount = count;
  return this.save();
};

userCalendarAccountSchema.methods.addCalendar = function(calendar) {
  const existingIndex = this.calendarIds.findIndex(cal => cal.id === calendar.id);
  if (existingIndex >= 0) {
    this.calendarIds[existingIndex] = { ...this.calendarIds[existingIndex], ...calendar };
  } else {
    this.calendarIds.push(calendar);
  }
  return this.save();
};

userCalendarAccountSchema.methods.removeCalendar = function(calendarId) {
  this.calendarIds = this.calendarIds.filter(cal => cal.id !== calendarId);
  return this.save();
};

userCalendarAccountSchema.methods.setPrimary = function() {
  this.isPrimaryCalendar = true;
  return this.save();
};

// Static methods
userCalendarAccountSchema.statics.findByUserId = function(userId) {
  return this.find({ userId, isActive: true });
};

userCalendarAccountSchema.statics.findPrimaryByUserId = function(userId) {
  return this.findOne({ userId, isPrimaryCalendar: true, isActive: true });
};

userCalendarAccountSchema.statics.findDueForSync = function() {
  return this.find({
    syncStatus: 'active',
    isActive: true,
    nextSyncAt: { $lte: new Date() }
  });
};

userCalendarAccountSchema.statics.findExpiringTokens = function(hoursFromNow = 1) {
  const expiryThreshold = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  return this.find({
    tokenExpiry: { $lte: expiryThreshold },
    isActive: true
  });
};

userCalendarAccountSchema.statics.findByProvider = function(provider, email = null) {
  const query = { provider, isActive: true };
  if (email) {
    query.calendarEmail = email.toLowerCase();
  }
  return this.find(query);
};

// Pre-save middleware
userCalendarAccountSchema.pre('save', function(next) {
  // Set next sync time if not set and status is active
  if (this.syncStatus === 'active' && !this.nextSyncAt) {
    this.nextSyncAt = new Date(Date.now() + this.syncPreferences.syncInterval * 60 * 1000);
  }
  
  // Limit sync errors to last 50
  if (this.syncErrors.length > 50) {
    this.syncErrors = this.syncErrors.slice(-50);
  }
  
  next();
});

const UserCalendarAccount = mongoose.model('UserCalendarAccount', userCalendarAccountSchema);

export default UserCalendarAccount; 