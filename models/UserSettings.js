import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // UI/UX preferences
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'system'
  },
  language: {
    type: String,
    default: 'en',
    maxLength: 5
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  dateFormat: {
    type: String,
    enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
    default: 'MM/DD/YYYY'
  },
  timeFormat: {
    type: String,
    enum: ['12h', '24h'],
    default: '12h'
  },
  weekStartsOn: {
    type: Number,
    enum: [0, 1], // 0 = Sunday, 1 = Monday
    default: 1
  },

  // AI preferences
  aiTone: {
    type: String,
    enum: ['professional', 'casual', 'friendly', 'motivational', 'direct'],
    default: 'friendly'
  },
  enableAISuggestions: {
    type: Boolean,
    default: true
  },
  aiPersonality: {
    type: String,
    enum: ['coach', 'assistant', 'mentor', 'colleague'],
    default: 'assistant'
  },

  // View preferences
  preferredView: {
    dashboard: {
      type: String,
      enum: ['overview', 'detailed', 'minimal'],
      default: 'overview'
    },
    calendar: {
      type: String,
      enum: ['month', 'week', 'day'],
      default: 'month'
    },
    tasks: {
      type: String,
      enum: ['list', 'board', 'timeline'],
      default: 'list'
    },
    goals: {
      type: String,
      enum: ['grid', 'list', 'cards'],
      default: 'grid'
    }
  },

  // Notification preferences
  notificationPrefs: {
    // General notifications
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      frequency: {
        type: String,
        enum: ['immediate', 'daily', 'weekly', 'never'],
        default: 'daily'
      }
    },
    push: {
      enabled: {
        type: Boolean,
        default: true
      },
      sound: {
        type: Boolean,
        default: true
      },
      vibration: {
        type: Boolean,
        default: true
      }
    },
    
    // Specific notification types
    reminders: {
      enabled: {
        type: Boolean,
        default: true
      },
      beforeMinutes: {
        type: Number,
        default: 15,
        min: 0,
        max: 1440
      }
    },
    weeklyReview: {
      enabled: {
        type: Boolean,
        default: true
      },
      dayOfWeek: {
        type: Number,
        enum: [0, 1, 2, 3, 4, 5, 6], // 0 = Sunday
        default: 0
      },
      time: {
        type: String,
        default: '09:00'
      }
    },
    quotes: {
      enabled: {
        type: Boolean,
        default: true
      },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'never'],
        default: 'daily'
      }
    },
    deviceLoginAlerts: {
      enabled: {
        type: Boolean,
        default: true
      }
    },
    teamUpdates: {
      enabled: {
        type: Boolean,
        default: true
      }
    },
    goalMilestones: {
      enabled: {
        type: Boolean,
        default: true
      }
    }
  },

  // Push notification token
  pushToken: {
    type: String,
    default: null
  },
  pushTokenExpiry: {
    type: Date,
    default: null
  },

  // Privacy settings
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'friends'
    },
    shareProgress: {
      type: Boolean,
      default: false
    },
    allowAnalytics: {
      type: Boolean,
      default: true
    },
    shareUsageData: {
      type: Boolean,
      default: true
    }
  },

  // Productivity settings
  productivity: {
    workingHours: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '17:00'
      }
    },
    workingDays: [{
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6]
    }],
    breakReminders: {
      enabled: {
        type: Boolean,
        default: false
      },
      interval: {
        type: Number,
        default: 60, // minutes
        min: 15,
        max: 240
      }
    },
    focusMode: {
      enabled: {
        type: Boolean,
        default: false
      },
      duration: {
        type: Number,
        default: 25, // minutes
        min: 5,
        max: 120
      }
    }
  },

  // Integration settings
  integrations: {
    calendar: {
      syncEnabled: {
        type: Boolean,
        default: true
      },
      syncInterval: {
        type: Number,
        default: 15, // minutes
        min: 5,
        max: 1440
      }
    },
    email: {
      enabled: {
        type: Boolean,
        default: false
      }
    }
  },

  // Advanced settings
  advanced: {
    debugMode: {
      type: Boolean,
      default: false
    },
    betaFeatures: {
      type: Boolean,
      default: false
    },
    dataRetention: {
      type: Number,
      default: 365, // days
      min: 30,
      max: 1095
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
userSettingsSchema.index({ userId: 1 }, { unique: true });

// Default working days (Monday to Friday)
userSettingsSchema.path('productivity.workingDays').default([1, 2, 3, 4, 5]);

// Instance methods
userSettingsSchema.methods.updateTheme = function(theme) {
  this.theme = theme;
  return this.save();
};

userSettingsSchema.methods.updateNotificationPreference = function(type, preference) {
  if (this.notificationPrefs[type]) {
    Object.assign(this.notificationPrefs[type], preference);
    this.markModified('notificationPrefs');
    return this.save();
  }
  throw new Error(`Invalid notification type: ${type}`);
};

userSettingsSchema.methods.updatePushToken = function(token, expiryDays = 30) {
  this.pushToken = token;
  this.pushTokenExpiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  return this.save();
};

userSettingsSchema.methods.clearPushToken = function() {
  this.pushToken = null;
  this.pushTokenExpiry = null;
  return this.save();
};

userSettingsSchema.methods.updateWorkingHours = function(start, end) {
  this.productivity.workingHours.start = start;
  this.productivity.workingHours.end = end;
  this.markModified('productivity');
  return this.save();
};

userSettingsSchema.methods.toggleBetaFeatures = function() {
  this.advanced.betaFeatures = !this.advanced.betaFeatures;
  this.markModified('advanced');
  return this.save();
};

// Static methods
userSettingsSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId });
};

userSettingsSchema.statics.findOrCreateByUserId = async function(userId) {
  let settings = await this.findOne({ userId });
  if (!settings) {
    settings = new this({ userId });
    await settings.save();
  }
  return settings;
};

userSettingsSchema.statics.findUsersWithPushNotifications = function() {
  return this.find({
    'notificationPrefs.push.enabled': true,
    pushToken: { $ne: null },
    pushTokenExpiry: { $gt: new Date() }
  }).populate('userId', 'name email');
};

userSettingsSchema.statics.findUsersForWeeklyReview = function(dayOfWeek, hour) {
  return this.find({
    'notificationPrefs.weeklyReview.enabled': true,
    'notificationPrefs.weeklyReview.dayOfWeek': dayOfWeek,
    'notificationPrefs.weeklyReview.time': { $regex: `^${hour.toString().padStart(2, '0')}:` }
  }).populate('userId', 'name email timezone');
};

// Pre-save middleware
userSettingsSchema.pre('save', function(next) {
  // Validate working hours
  if (this.productivity && this.productivity.workingHours) {
    const { start, end } = this.productivity.workingHours;
    if (start >= end) {
      return next(new Error('Working start time must be before end time'));
    }
  }
  
  // Clean up expired push tokens
  if (this.pushTokenExpiry && this.pushTokenExpiry < new Date()) {
    this.pushToken = null;
    this.pushTokenExpiry = null;
  }
  
  next();
});

const UserSettings = mongoose.model('UserSettings', userSettingsSchema);

export default UserSettings; 