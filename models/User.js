import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic user information
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [254, 'Email cannot exceed 254 characters'],
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  avatarUrl: {
    type: String,
    default: null
  },

  // Goal-related fields
  finalGoal: {
    type: String,
    maxLength: 500,
    default: null
  },
  goalReason: {
    type: String,
    maxLength: 1000,
    default: null
  },
  personalMotto: {
    type: String,
    maxLength: 200,
    default: null
  },
  majorLifeThemes: [{
    type: String,
    maxLength: 100
  }],

  // Authentication
  authProvider: {
    type: String,
    enum: ['google', 'microsoft', 'local'],
    required: true
  },
  mainProviderAccountId: {
    type: String,
    required: true
  },

  // Subscription & billing
  subscriptionPlan: {
    type: String,
    enum: ['free', 'premium', 'enterprise'],
    default: 'free'
  },
  planExpiry: {
    type: Date,
    default: null
  },
  credits: {
    type: Number,
    default: 0,
    min: 0
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },

  // Timestamps
  lastActive: {
    type: Date,
    default: Date.now
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  onboardingStep: {
    type: Number,
    default: 0
  },

  // New fields from the code block
  username: {
    type: String,
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^[a-zA-Z0-9_-]+$/.test(v);
      },
      message: 'Username can only contain letters, numbers, hyphens, and underscores'
    }
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[a-zA-Z\s'.-]+$/.test(v);
      },
      message: 'First name can only contain letters, spaces, apostrophes, periods, and hyphens'
    }
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[a-zA-Z\s'.-]+$/.test(v);
      },
      message: 'Last name can only contain letters, spaces, apostrophes, periods, and hyphens'
    }
  },
  password: {
    type: String,
    minlength: [8, 'Password must be at least 8 characters long'],
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow null for OAuth users
        // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v);
      },
      message: 'Password must contain at least 8 characters with 1 uppercase, 1 lowercase, and 1 number'
    }
  },
  avatar: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v) || v.startsWith('data:image/');
      },
      message: 'Avatar must be a valid image URL or data URI'
    }
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'admin', 'moderator'],
      message: 'Role must be user, admin, or moderator'
    },
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    trim: true
  },
  resetPasswordToken: {
    type: String,
    trim: true
  },
  resetPasswordExpires: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v > new Date();
      },
      message: 'Reset password expiry must be in the future'
    }
  },
  lastLogin: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v <= new Date();
      },
      message: 'Last login cannot be in the future'
    }
  },
  timezone: {
    type: String,
    default: 'UTC',
    validate: {
      validator: function(v) {
        if (!v) return true;
        // Basic timezone validation - checks for common timezone formats
        return /^[A-Za-z_\/]+$/.test(v) && v.length <= 50;
      },
      message: 'Invalid timezone format'
    }
  },
  language: {
    type: String,
    default: 'en',
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[a-z]{2}(-[A-Z]{2})?$/.test(v);
      },
      message: 'Language must be in ISO 639-1 format (e.g., en, en-US)'
    }
  },
  dateFormat: {
    type: String,
    enum: {
      values: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
      message: 'Date format must be MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD'
    },
    default: 'MM/DD/YYYY'
  },
  timeFormat: {
    type: String,
    enum: {
      values: ['12h', '24h'],
      message: 'Time format must be 12h or 24h'
    },
    default: '12h'
  },
  
  // Onboarding data
  deadline: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v > new Date();
      },
      message: 'Deadline must be in the future'
    }
  },
  weeklyTimeCommitment: {
    type: Number,
    min: [0, 'Weekly time commitment cannot be negative'],
    max: [168, 'Weekly time commitment cannot exceed 168 hours'],
    validate: {
      validator: function(v) {
        return !v || (Number.isFinite(v) && v >= 0);
      },
      message: 'Weekly time commitment must be a valid positive number'
    }
  },
  preferredWorkingHours: {
    start: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Start time must be in HH:MM format'
      }
    },
    end: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'End time must be in HH:MM format'
      }
    }
  },
  aiEnabled: {
    type: Boolean,
    default: true
  },
  reminderFrequency: {
    type: String,
    enum: {
      values: ['daily', 'weekly', 'none'],
      message: 'Reminder frequency must be daily, weekly, or none'
    },
    default: 'daily'
  },
  
  // Schema versioning
  schemaVersion: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.verificationToken;
      delete ret.resetPasswordToken;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance and uniqueness
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true, sparse: true });
userSchema.index({ verificationToken: 1 }, { sparse: true });
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ deletedAt: 1 });
userSchema.index({ schemaVersion: 1 });

// Text search index
userSchema.index({
  firstName: 'text',
  lastName: 'text',
  email: 'text',
  username: 'text'
});

// Compound indexes
userSchema.index({ isActive: 1, isVerified: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Virtuals
userSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || this.email.split('@')[0];
});

userSchema.virtual('initials').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
  }
  if (this.firstName) {
    return this.firstName.charAt(0).toUpperCase();
  }
  return this.email.charAt(0).toUpperCase();
});

userSchema.virtual('isOnboardingComplete').get(function() {
  return this.onboardingCompleted && 
         this.finalGoal && 
         this.goalReason && 
         this.deadline && 
         this.personalMotto &&
         this.weeklyTimeCommitment !== undefined;
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateVerificationToken = function() {
  this.verificationToken = Math.random().toString(36).substring(2, 15) + 
                          Math.random().toString(36).substring(2, 15);
  return this.verificationToken;
};

userSchema.methods.generateResetPasswordToken = function() {
  this.resetPasswordToken = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return this.resetPasswordToken;
};

userSchema.methods.clearResetPasswordToken = function() {
  this.resetPasswordToken = undefined;
  this.resetPasswordExpires = undefined;
};

userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

userSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

userSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Static methods
userSchema.statics.findActive = function() {
  return this.find({ deletedAt: null, isActive: true });
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase().trim(), 
    deletedAt: null 
  });
};

userSchema.statics.findByUsername = function(username) {
  return this.findOne({ 
    username: username.toLowerCase().trim(), 
    deletedAt: null 
  });
};

userSchema.statics.findByVerificationToken = function(token) {
  return this.findOne({ 
    verificationToken: token, 
    deletedAt: null 
  });
};

userSchema.statics.findByResetPasswordToken = function(token) {
  return this.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
    deletedAt: null
  });
};

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password') && this.password) {
    try {
      const saltRounds = 12;
      this.password = await bcrypt.hash(this.password, saltRounds);
    } catch (error) {
      return next(error);
    }
  }
  
  // Normalize email
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }
  
  // Normalize username
  if (this.isModified('username') && this.username) {
    this.username = this.username.toLowerCase().trim();
  }
  
  // Auto-generate username from email if not provided
  if (!this.username && this.email) {
    const baseUsername = this.email.split('@')[0].toLowerCase();
    let username = baseUsername;
    let counter = 1;
    
    // Ensure username is unique
    while (await this.constructor.findOne({ username, _id: { $ne: this._id } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }
    
    this.username = username;
  }
  
  next();
});

const User = mongoose.model('User', userSchema);

export default User; 