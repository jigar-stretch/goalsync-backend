import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Personal information
  dateOfBirth: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'non-binary', 'prefer-not-to-say', 'other'],
    default: null
  },

  // Location
  country: {
    type: String,
    maxLength: 100,
    default: null
  },
  region: {
    type: String,
    maxLength: 100,
    default: null
  },
  city: {
    type: String,
    maxLength: 100,
    default: null
  },
  timezone: {
    type: String,
    default: 'UTC'
  },

  // Professional information
  occupation: {
    type: String,
    maxLength: 100,
    default: null
  },
  company: {
    type: String,
    maxLength: 100,
    default: null
  },
  industry: {
    type: String,
    maxLength: 100,
    default: null
  },
  experience: {
    type: String,
    enum: ['student', 'entry-level', '1-3-years', '3-5-years', '5-10-years', '10-plus-years'],
    default: null
  },

  // Personal details
  bio: {
    type: String,
    maxLength: 500,
    default: null
  },
  website: {
    type: String,
    maxLength: 200,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty values
        return /^https?:\/\/.+\..+/.test(v);
      },
      message: 'Please enter a valid website URL'
    },
    default: null
  },

  // Interests and tags
  tags: [{
    type: String,
    maxLength: 50,
    trim: true
  }],
  interests: [{
    category: {
      type: String,
      maxLength: 50
    },
    items: [{
      type: String,
      maxLength: 50
    }]
  }],

  // Social links
  socialLinks: {
    linkedin: {
      type: String,
      maxLength: 200,
      default: null
    },
    twitter: {
      type: String,
      maxLength: 200,
      default: null
    },
    github: {
      type: String,
      maxLength: 200,
      default: null
    },
    instagram: {
      type: String,
      maxLength: 200,
      default: null
    },
    facebook: {
      type: String,
      maxLength: 200,
      default: null
    },
    other: [{
      platform: String,
      url: String
    }]
  },

  // Productivity metrics
  productivityMetrics: {
    preferredWorkStyle: {
      type: String,
      enum: ['focused-blocks', 'frequent-breaks', 'flexible', 'structured'],
      default: null
    },
    peakHours: {
      start: {
        type: String,
        default: null
      },
      end: {
        type: String,
        default: null
      }
    },
    productivityTools: [{
      type: String,
      maxLength: 50
    }],
    motivationType: {
      type: String,
      enum: ['achievement', 'progress', 'collaboration', 'competition', 'recognition'],
      default: null
    }
  },

  // Goal preferences
  goalPreferences: {
    preferredTimeframe: {
      type: String,
      enum: ['short-term', 'medium-term', 'long-term', 'mixed'],
      default: 'mixed'
    },
    focusAreas: [{
      type: String,
      enum: ['career', 'health', 'finance', 'relationships', 'education', 'personal-growth', 'hobbies', 'travel'],
      maxLength: 50
    }],
    trackingStyle: {
      type: String,
      enum: ['detailed', 'simple', 'visual', 'numerical'],
      default: 'simple'
    },

  },

  // Profile completion
  profileCompletion: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    completedSections: [{
      section: String,
      completedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationBadges: [{
    type: {
      type: String,
      enum: ['email', 'phone', 'linkedin', 'company', 'achievement']
    },
    verifiedAt: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],

  // Privacy settings
  visibility: {
    profile: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'friends'
    },
    goals: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'private'
    },
    achievements: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'friends'
    },
    location: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'private'
    }
  },

  // New fields from the code block
  linkedinUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/i.test(v);
      },
      message: 'LinkedIn URL must be a valid LinkedIn profile URL'
    }
  },
  twitterUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?$/i.test(v);
      },
      message: 'Twitter URL must be a valid Twitter/X profile URL'
    }
  },
  githubUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9-]+\/?$/i.test(v);
      },
      message: 'GitHub URL must be a valid GitHub profile URL'
    }
  },
  phoneNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        // Supports various international phone number formats
        return /^[\+]?[(]?[\+]?[(]?[\d\s\-\(\)]{7,20}$/.test(v.replace(/\s/g, ''));
      },
      message: 'Phone number must be a valid format'
    }
  },
  education: {
    type: String,
    trim: true,
    maxlength: [200, 'Education cannot exceed 200 characters']
  },
  skills: [{
    type: String,
    trim: true,
    maxlength: [50, 'Each skill cannot exceed 50 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9\s\-+#.]+$/.test(v);
      },
      message: 'Skills can only contain letters, numbers, spaces, hyphens, plus signs, hash symbols, and periods'
    }
  }],
  personalityType: {
    type: String,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        // MBTI or Enneagram validation
        return /^[ENFIJSTPA]{4}$|^[1-9]w[0-9]$|^Type [1-9]$/.test(v);
      },
      message: 'Personality type must be a valid MBTI (e.g., ENFP) or Enneagram (e.g., 7w8) format'
    }
  },
  workStyle: {
    type: String,
    enum: {
      values: ['structured', 'flexible', 'collaborative', 'independent', 'creative', 'analytical'],
      message: 'Work style must be structured, flexible, collaborative, independent, creative, or analytical'
    }
  },
  communicationPreference: {
    type: String,
    enum: {
      values: ['direct', 'diplomatic', 'detailed', 'concise', 'visual', 'verbal'],
      message: 'Communication preference must be direct, diplomatic, detailed, concise, visual, or verbal'
    }
  },
  
  // Productivity metrics and insights
  productivityScore: {
    type: Number,
    min: [0, 'Productivity score cannot be negative'],
    max: [100, 'Productivity score cannot exceed 100'],
    default: 0,
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Productivity score must be a whole number'
    }
  },
  completionRate: {
    type: Number,
    min: [0, 'Completion rate cannot be negative'],
    max: [100, 'Completion rate cannot exceed 100'],
    default: 0,
    validate: {
      validator: function(v) {
        return !v || (Number.isFinite(v) && v >= 0 && v <= 100);
      },
      message: 'Completion rate must be between 0 and 100'
    }
  },
  averageTaskDuration: {
    type: Number,
    min: [0, 'Average task duration cannot be negative'],
    default: 0,
    validate: {
      validator: function(v) {
        return !v || (Number.isFinite(v) && v >= 0);
      },
      message: 'Average task duration must be a positive number'
    }
  },
  streakCount: {
    type: Number,
    min: [0, 'Streak count cannot be negative'],
    default: 0,
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Streak count must be a whole number'
    }
  },
  longestStreak: {
    type: Number,
    min: [0, 'Longest streak cannot be negative'],
    default: 0,
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Longest streak must be a whole number'
    }
  },
  totalGoalsCompleted: {
    type: Number,
    min: [0, 'Total goals completed cannot be negative'],
    default: 0,
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Total goals completed must be a whole number'
    }
  },
  totalTasksCompleted: {
    type: Number,
    min: [0, 'Total tasks completed cannot be negative'],
    default: 0,
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Total tasks completed must be a whole number'
    }
  },
  totalTimeSpent: {
    type: Number,
    min: [0, 'Total time spent cannot be negative'],
    default: 0,
    validate: {
      validator: function(v) {
        return !v || (Number.isFinite(v) && v >= 0);
      },
      message: 'Total time spent must be a positive number'
    }
  },
  
  // Privacy settings
  profileVisibility: {
    type: String,
    enum: {
      values: ['public', 'private', 'friends'],
      message: 'Profile visibility must be public, private, or friends'
    },
    default: 'private'
  },
  showEmail: {
    type: Boolean,
    default: false
  },
  showPhone: {
    type: Boolean,
    default: false
  },
  showBirthDate: {
    type: Boolean,
    default: false
  },
  showStats: {
    type: Boolean,
    default: true
  },
  
  // Achievement badges and certifications
  badges: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Badge name cannot exceed 50 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Badge description cannot exceed 200 characters']
    },
    icon: {
      type: String,
      trim: true,
      maxlength: [50, 'Badge icon cannot exceed 50 characters']
    },
    earnedAt: {
      type: Date,
      default: Date.now,
      validate: {
        validator: function(v) {
          return v <= new Date();
        },
        message: 'Badge earned date cannot be in the future'
      }
    },
    category: {
      type: String,
      enum: {
        values: ['achievement', 'milestone', 'skill', 'participation', 'leadership'],
        message: 'Badge category must be achievement, milestone, skill, participation, or leadership'
      },
      default: 'achievement'
    }
  }],
  
  // Social connections and network
  followersCount: {
    type: Number,
    min: [0, 'Followers count cannot be negative'],
    default: 0,
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Followers count must be a whole number'
    }
  },
  followingCount: {
    type: Number,
    min: [0, 'Following count cannot be negative'],
    default: 0,
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Following count must be a whole number'
    }
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
    transform: function(doc, ret, options) {
      // Respect privacy settings
      if (!options.includePrivate) {
        if (!ret.showEmail) delete ret.email;
        if (!ret.showPhone) delete ret.phoneNumber;
        if (!ret.showBirthDate) delete ret.dateOfBirth;
        if (!ret.showStats) {
          delete ret.productivityScore;
          delete ret.completionRate;
          delete ret.streakCount;
          delete ret.totalGoalsCompleted;
          delete ret.totalTasksCompleted;
        }
      }
      delete ret.__v;
      return ret;
    }
  }
});

// Ensure skills and interests arrays don't exceed reasonable limits
userProfileSchema.path('skills').validate(function(skills) {
  return skills.length <= 20;
}, 'Cannot have more than 20 skills');

userProfileSchema.path('interests').validate(function(interests) {
  return interests.length <= 15;
}, 'Cannot have more than 15 interests');

userProfileSchema.path('badges').validate(function(badges) {
  return badges.length <= 50;
}, 'Cannot have more than 50 badges');

// Indexes for performance
userProfileSchema.index({ userId: 1 }, { unique: true });
userProfileSchema.index({ profileVisibility: 1 });
userProfileSchema.index({ productivityScore: -1 });
userProfileSchema.index({ totalGoalsCompleted: -1 });
userProfileSchema.index({ streakCount: -1 });
userProfileSchema.index({ deletedAt: 1 });
userProfileSchema.index({ schemaVersion: 1 });

// Text search index
userProfileSchema.index({
  bio: 'text',
  occupation: 'text',
  company: 'text',
  industry: 'text',
  skills: 'text',
  interests: 'text'
});

// Compound indexes
userProfileSchema.index({ profileVisibility: 1, productivityScore: -1 });
userProfileSchema.index({ industry: 1, experience: 1 });

// Virtuals
userProfileSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

userProfileSchema.virtual('isPublic').get(function() {
  return this.profileVisibility === 'public';
});

userProfileSchema.virtual('completionGrade').get(function() {
  const requiredFields = ['bio', 'location', 'occupation', 'experience'];
  const optionalFields = ['website', 'phoneNumber', 'company', 'industry', 'education'];
  
  let completedRequired = 0;
  let completedOptional = 0;
  
  requiredFields.forEach(field => {
    if (this[field] && this[field].trim()) completedRequired++;
  });
  
  optionalFields.forEach(field => {
    if (this[field] && this[field].trim()) completedOptional++;
  });
  
  const skillsBonus = Math.min(this.skills.length * 2, 10); // Max 10 points for skills
  const interestsBonus = Math.min(this.interests.length * 1, 5); // Max 5 points for interests
  
  const score = (completedRequired / requiredFields.length) * 60 + 
                (completedOptional / optionalFields.length) * 25 + 
                skillsBonus + interestsBonus;
  
  return Math.min(Math.round(score), 100);
});

userProfileSchema.virtual('networkStrength').get(function() {
  const totalConnections = this.followersCount + this.followingCount;
  if (totalConnections === 0) return 'new';
  if (totalConnections < 10) return 'growing';
  if (totalConnections < 50) return 'active';
  if (totalConnections < 200) return 'connected';
  return 'influencer';
});

// Instance methods
userProfileSchema.methods.addBadge = function(badgeData) {
  const badge = {
    name: badgeData.name,
    description: badgeData.description,
    icon: badgeData.icon || 'trophy',
    category: badgeData.category || 'achievement',
    earnedAt: new Date()
  };
  
  // Check if badge already exists
  const existingBadge = this.badges.find(b => b.name === badge.name);
  if (!existingBadge) {
    this.badges.push(badge);
  }
  
  return this.save();
};

userProfileSchema.methods.removeBadge = function(badgeName) {
  this.badges = this.badges.filter(badge => badge.name !== badgeName);
  return this.save();
};

userProfileSchema.methods.updateStats = function(stats) {
  Object.assign(this, stats);
  return this.save();
};

userProfileSchema.methods.incrementStreak = function() {
  this.streakCount += 1;
  if (this.streakCount > this.longestStreak) {
    this.longestStreak = this.streakCount;
  }
  return this.save();
};

userProfileSchema.methods.resetStreak = function() {
  this.streakCount = 0;
  return this.save();
};

userProfileSchema.methods.addSkill = function(skill) {
  const trimmedSkill = skill.trim();
  if (trimmedSkill && !this.skills.includes(trimmedSkill) && this.skills.length < 20) {
    this.skills.push(trimmedSkill);
  }
  return this.save();
};

userProfileSchema.methods.removeSkill = function(skill) {
  this.skills = this.skills.filter(s => s !== skill);
  return this.save();
};

userProfileSchema.methods.addInterest = function(interest) {
  const trimmedInterest = interest.trim();
  if (trimmedInterest && !this.interests.includes(trimmedInterest) && this.interests.length < 15) {
    this.interests.push(trimmedInterest);
  }
  return this.save();
};

userProfileSchema.methods.removeInterest = function(interest) {
  this.interests = this.interests.filter(i => i !== interest);
  return this.save();
};

userProfileSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.profileVisibility = 'private';
  return this.save();
};

// Static methods
userProfileSchema.statics.findActive = function() {
  return this.find({ deletedAt: null });
};

userProfileSchema.statics.findPublic = function() {
  return this.find({ 
    deletedAt: null, 
    profileVisibility: 'public' 
  });
};

userProfileSchema.statics.findBySkill = function(skill) {
  return this.find({
    skills: { $regex: skill, $options: 'i' },
    deletedAt: null,
    profileVisibility: { $in: ['public', 'friends'] }
  });
};

userProfileSchema.statics.findByIndustry = function(industry) {
  return this.find({
    industry: { $regex: industry, $options: 'i' },
    deletedAt: null,
    profileVisibility: { $in: ['public', 'friends'] }
  });
};

userProfileSchema.statics.getTopPerformers = function(limit = 10) {
  return this.find({
    deletedAt: null,
    profileVisibility: 'public',
    showStats: true
  })
  .sort({ productivityScore: -1, totalGoalsCompleted: -1 })
  .limit(limit);
};

userProfileSchema.statics.findOrCreateByUserId = async function(userId) {
  try {
    let profile = await this.findOne({ userId, deletedAt: null });
    
    if (!profile) {
      profile = new this({
        userId,
        profileCompletion: {
          percentage: 0,
          lastUpdated: new Date(),
          completedSections: []
        }
      });
      await profile.save();
    }
    
    return profile;
  } catch (error) {
    throw new Error(`Failed to find or create user profile: ${error.message}`);
  }
};

// Pre-save middleware
userProfileSchema.pre('save', function(next) {
  // Validate that longest streak is at least current streak
  if (this.streakCount > this.longestStreak) {
    this.longestStreak = this.streakCount;
  }
  
  // Clean up arrays - remove empty strings and duplicates
  if (this.isModified('skills')) {
    this.skills = [...new Set(this.skills.filter(skill => skill && skill.trim()))];
  }
  
  if (this.isModified('interests')) {
    this.interests = [...new Set(this.interests.filter(interest => interest && interest.trim()))];
  }
  
  next();
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile; 