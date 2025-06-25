import mongoose from 'mongoose';

const userAccountSchema = new mongoose.Schema({
  // Reference to main user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Provider information
  provider: {
    type: String,
    enum: ['google', 'microsoft', 'local'],
    required: true
  },
  providerId: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  // Local authentication (for email/password)
  passwordHash: {
    type: String,
    default: null // Only for local provider
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },

  // OAuth tokens (for google/microsoft)
  accessToken: {
    type: String,
    default: null
  },
  refreshToken: {
    type: String,
    default: null
  },
  tokenExpires: {
    type: Date,
    default: null
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Usage tracking
  lastUsed: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },

  // Additional provider data
  providerData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.passwordHash;
      delete ret.accessToken;
      delete ret.refreshToken;
      delete ret.passwordResetToken;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
userAccountSchema.index({ userId: 1 });
userAccountSchema.index({ provider: 1, providerId: 1 }, { unique: true });
userAccountSchema.index({ email: 1, provider: 1 });
userAccountSchema.index({ passwordResetToken: 1 });

// Instance methods
userAccountSchema.methods.incrementLoginCount = function() {
  this.loginCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

userAccountSchema.methods.updateTokens = function(accessToken, refreshToken, expires) {
  this.accessToken = accessToken;
  this.refreshToken = refreshToken;
  this.tokenExpires = expires;
  this.lastUsed = new Date();
  return this.save();
};

userAccountSchema.methods.clearPasswordReset = function() {
  this.passwordResetToken = null;
  this.passwordResetExpires = null;
  return this.save();
};

// Static methods
userAccountSchema.statics.findByProvider = function(provider, providerId) {
  return this.findOne({ provider, providerId });
};

userAccountSchema.statics.findByEmail = function(email, provider = null) {
  const query = { email: email.toLowerCase() };
  if (provider) {
    query.provider = provider;
  }
  return this.findOne(query);
};

userAccountSchema.statics.findByUserId = function(userId) {
  return this.find({ userId });
};

// Pre-save middleware
userAccountSchema.pre('save', function(next) {
  if (this.provider === 'google' || this.provider === 'microsoft') {
    this.isVerified = true; // OAuth accounts are pre-verified
  }
  next();
});

const UserAccount = mongoose.model('UserAccount', userAccountSchema);

export default UserAccount; 