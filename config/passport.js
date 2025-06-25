import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import UserAccount from '../models/UserAccount.js';

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Local Strategy (Email/Password)
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    // Find user account
    const userAccount = await UserAccount.findOne({ 
      email: email.toLowerCase(),
      provider: 'local'
    });

    if (!userAccount) {
      return done(null, false, { message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, userAccount.passwordHash);
    if (!isMatch) {
      return done(null, false, { message: 'Invalid email or password' });
    }

    // Get user details
    const user = await User.findById(userAccount.userId);
    if (!user) {
      return done(null, false, { message: 'User not found' });
    }

    // Update last used
    userAccount.lastUsed = new Date();
    await userAccount.save();

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Google OAuth Strategy (only if credentials are provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI || 'https://goalsync-backend-y5yt.onrender.com/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user account exists
    let userAccount = await UserAccount.findOne({
      provider: 'google',
      providerId: profile.id
    });

    let user;

    if (userAccount) {
      // Existing user - update last used
      userAccount.lastUsed = new Date();
      await userAccount.save();
      
      user = await User.findById(userAccount.userId);
    } else {
      // New user - create user and account
      user = new User({
        name: profile.displayName,
        email: profile.emails[0].value.toLowerCase(),
        avatarUrl: profile.photos[0]?.value,
        authProvider: 'google',
        mainProviderAccountId: profile.id
      });
      await user.save();

      userAccount = new UserAccount({
        userId: user._id,
        provider: 'google',
        providerId: profile.id,
        email: profile.emails[0].value.toLowerCase(),
        accessToken,
        refreshToken,
        lastUsed: new Date()
      });
      await userAccount.save();
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
  }));
}

// Microsoft Strategy (only if credentials are provided)
if (process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET) {
  passport.use(new MicrosoftStrategy({
    clientID: process.env.OUTLOOK_CLIENT_ID,
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
    callbackURL: process.env.OUTLOOK_REDIRECT_URI || 'https://goalsync-backend-y5yt.onrender.com/auth/microsoft/callback',
    scope: ['user.read', 'calendars.read', 'calendars.readwrite']
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user account exists
    let userAccount = await UserAccount.findOne({
      provider: 'microsoft',
      providerId: profile.id
    });

    let user;

    if (userAccount) {
      // Existing user - update tokens and last used
      userAccount.accessToken = accessToken;
      userAccount.refreshToken = refreshToken;
      userAccount.lastUsed = new Date();
      await userAccount.save();
      
      user = await User.findById(userAccount.userId);
    } else {
      // New user - create user and account
      user = new User({
        name: profile.displayName,
        email: profile.emails[0].value.toLowerCase(),
        avatarUrl: profile.photos[0]?.value,
        authProvider: 'microsoft',
        mainProviderAccountId: profile.id
      });
      await user.save();

      userAccount = new UserAccount({
        userId: user._id,
        provider: 'microsoft',
        providerId: profile.id,
        email: profile.emails[0].value.toLowerCase(),
        accessToken,
        refreshToken,
        lastUsed: new Date()
      });
      await userAccount.save();
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
  }));
}

export default passport; 