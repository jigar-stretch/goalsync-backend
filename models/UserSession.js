import mongoose from 'mongoose';

const userSessionSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Device information
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  deviceName: {
    type: String,
    required: true,
    maxLength: 100
  },
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  browser: {
    type: String,
    maxLength: 50
  },
  os: {
    type: String,
    maxLength: 50
  },

  // Location information
  ipAddress: {
    type: String,
    required: true
  },
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // Session data
  refreshToken: {
    type: String,
    required: true
  },
  refreshTokenExpires: {
    type: Date,
    required: true
  },
  
  // Timestamps
  loginTime: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  logoutTime: {
    type: Date,
    default: null
  },

  // Status
  isCurrentDevice: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isTrusted: {
    type: Boolean,
    default: false
  },

  // Security
  userAgent: {
    type: String,
    maxLength: 500
  },
  fingerprint: {
    type: String,
    maxLength: 100
  },
  
  // Additional metadata
  sessionData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.refreshToken;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
userSessionSchema.index({ userId: 1 });
userSessionSchema.index({ deviceId: 1 }, { unique: true });
userSessionSchema.index({ refreshToken: 1 });
userSessionSchema.index({ isActive: 1 });
userSessionSchema.index({ refreshTokenExpires: 1 });
userSessionSchema.index({ lastActive: 1 });

// Instance methods
userSessionSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save();
};

userSessionSchema.methods.logout = function() {
  this.isActive = false;
  this.logoutTime = new Date();
  this.refreshToken = null;
  return this.save();
};

userSessionSchema.methods.renewRefreshToken = function(newToken, expiresAt) {
  this.refreshToken = newToken;
  this.refreshTokenExpires = expiresAt;
  this.lastActive = new Date();
  return this.save();
};

userSessionSchema.methods.markAsTrusted = function() {
  this.isTrusted = true;
  return this.save();
};

userSessionSchema.methods.setAsCurrent = function() {
  this.isCurrentDevice = true;
  this.lastActive = new Date();
  return this.save();
};

// Static methods
userSessionSchema.statics.findActiveByUserId = function(userId) {
  return this.find({ 
    userId, 
    isActive: true,
    refreshTokenExpires: { $gt: new Date() }
  }).sort({ lastActive: -1 });
};

userSessionSchema.statics.findByDeviceId = function(deviceId) {
  return this.findOne({ deviceId, isActive: true });
};

userSessionSchema.statics.findByRefreshToken = function(refreshToken) {
  return this.findOne({ 
    refreshToken, 
    isActive: true,
    refreshTokenExpires: { $gt: new Date() }
  });
};

userSessionSchema.statics.revokeAllUserSessions = function(userId, exceptDeviceId = null) {
  const query = { userId, isActive: true };
  if (exceptDeviceId) {
    query.deviceId = { $ne: exceptDeviceId };
  }
  return this.updateMany(query, { 
    isActive: false, 
    logoutTime: new Date(),
    refreshToken: null 
  });
};

userSessionSchema.statics.cleanupExpiredSessions = function() {
  return this.updateMany(
    { 
      refreshTokenExpires: { $lt: new Date() },
      isActive: true 
    },
    { 
      isActive: false,
      logoutTime: new Date(),
      refreshToken: null
    }
  );
};

// Pre-save middleware
userSessionSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set default expiry if not provided
    if (!this.refreshTokenExpires) {
      this.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }
  next();
});

const UserSession = mongoose.model('UserSession', userSessionSchema);

export default UserSession; 