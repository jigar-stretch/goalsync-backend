import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import User from '../models/User.js';
import UserAccount from '../models/UserAccount.js';
import UserSession from '../models/UserSession.js';
import UserSettings from '../models/UserSettings.js';
import UserProfile from '../models/UserProfile.js';
import jwtUtils from '../utils/jwt.js';
import emailService from '../utils/email.js';

class AuthController {
  /**
   * Local signup with email and password
   */
  async localSignup(req, res) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and password are required'
        });
      }

      // Check if user exists
      const existingAccount = await UserAccount.findByEmail(email, 'local');
      if (existingAccount) {
        return res.status(409).json({
          success: false,
          message: 'Account with this email already exists'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        authProvider: 'local',
        mainProviderAccountId: randomBytes(16).toString('hex')
      });
      await user.save();

      // Create user account
      const userAccount = new UserAccount({
        userId: user._id,
        provider: 'local',
        providerId: user.mainProviderAccountId,
        email: email.toLowerCase().trim(),
        passwordHash
      });
      await userAccount.save();

      // Generate tokens
      const deviceInfo = this.extractDeviceInfo(req);
      const tokenPair = jwtUtils.generateTokenPair({
        userId: user._id,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
        deviceId: deviceInfo.deviceId
      });

      // Create session
      await jwtUtils.createSession(user._id, deviceInfo, tokenPair.refreshToken);

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: user.toJSON(),
          tokens: {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken
          }
        }
      });

    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Account creation failed'
      });
    }
  }

  /**
   * Local login with email and password
   */
  async localLogin(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user account
      const userAccount = await UserAccount.findByEmail(email, 'local');
      if (!userAccount) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, userAccount.passwordHash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Get user
      const user = await User.findById(userAccount.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is inactive'
        });
      }

      // Generate tokens
      const deviceInfo = this.extractDeviceInfo(req);
      const tokenPair = jwtUtils.generateTokenPair({
        userId: user._id,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
        deviceId: deviceInfo.deviceId
      });

      // Create session
      await jwtUtils.createSession(user._id, deviceInfo, tokenPair.refreshToken);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          tokens: {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  /**
   * Logout user
   */
  async logout(req, res) {
    try {
      const { deviceId } = req.body;
      
      if (deviceId) {
        await jwtUtils.revokeRefreshToken(null, deviceId);
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(req, res) {
    try {
      const userId = req.user._id;

      // Revoke all user sessions
      await jwtUtils.revokeAllUserTokens(userId);

      // Force disconnect all sockets for this user
      if (global.socketService) {
        await global.socketService.forceDisconnectUser(userId, 'Logged out from all devices');
      }

      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });

    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to logout from all devices'
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken, deviceId } = req.body;

      if (!refreshToken || !deviceId) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token and device ID are required'
        });
      }

      // Refresh tokens
      const tokenPair = await jwtUtils.refreshTokens(refreshToken, deviceId);

      res.json({
        success: true,
        data: {
          tokens: {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            expiresAt: tokenPair.accessTokenExpiry
          }
        }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Token refresh failed'
      });
    }
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Find user account
      const userAccount = await UserAccount.findByEmail(email, 'local');
      
      // Always return success to prevent email enumeration
      if (!userAccount) {
        return res.json({
          success: true,
          message: 'If an account with this email exists, you will receive a password reset link.'
        });
      }

      // Get user
      const user = await User.findById(userAccount.userId);
      if (!user || !user.isActive) {
        return res.json({
          success: true,
          message: 'If an account with this email exists, you will receive a password reset link.'
        });
      }

      // Generate reset token
      const resetToken = jwtUtils.generatePasswordResetToken(user.email, user._id);

      // Store reset token in user account
      userAccount.passwordResetToken = resetToken;
      userAccount.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await userAccount.save();

      // Send reset email
      try {
        await emailService.sendPasswordResetEmail(user, resetToken);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to send password reset email'
        });
      }

      res.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset link.'
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset request failed'
      });
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password are required'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      // Verify reset token
      const decoded = jwtUtils.verifyPasswordResetToken(token);

      // Find user account
      const userAccount = await UserAccount.findOne({
        userId: decoded.userId,
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });

      if (!userAccount) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      userAccount.passwordHash = passwordHash;
      await userAccount.clearPasswordReset();

      // Revoke all existing sessions for security
      await jwtUtils.revokeAllUserTokens(decoded.userId);

      // Force disconnect all sockets
      if (global.socketService) {
        await global.socketService.forceDisconnectUser(decoded.userId, 'Password was reset');
      }

      res.json({
        success: true,
        message: 'Password reset successfully. Please log in with your new password.'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset failed'
      });
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
      }

      // Verify token
      const decoded = jwtUtils.verifyEmailVerificationToken(token);

      // Find user and account
      const [user, userAccount] = await Promise.all([
        User.findById(decoded.userId),
        UserAccount.findOne({ userId: decoded.userId, email: decoded.email })
      ]);

      if (!user || !userAccount) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification token'
        });
      }

      // Update verification status
      user.isEmailVerified = true;
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;
      
      userAccount.isVerified = true;

      await Promise.all([user.save(), userAccount.save()]);

      res.json({
        success: true,
        message: 'Email verified successfully!'
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Email verification failed'
      });
    }
  }

  /**
   * Handle Google OAuth code exchange
   */
  async googleCodeExchange(req, res) {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Authorization code is required'
        });
      }

      // Exchange code for tokens using Google's OAuth2 API
      const { google } = await import('googleapis');
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://goal-sync.netlify.app/auth/gmail/callback' // Must match Google Console exactly
      );

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get user profile
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data: profile } = await oauth2.userinfo.get();

      // Find or create user
      let userAccount = await UserAccount.findByProvider('google', profile.id);
      let user;

      if (userAccount) {
        // Existing user - update tokens
        user = await User.findById(userAccount.userId);
        userAccount.accessToken = tokens.access_token;
        userAccount.refreshToken = tokens.refresh_token;
        userAccount.tokenExpires = new Date(tokens.expiry_date);
        await userAccount.save();
      } else {
        // New user - create account
        user = new User({
          name: profile.name,
          email: profile.email,
          authProvider: 'google',
          mainProviderAccountId: profile.id,
          profileImageUrl: profile.picture
        });
        await user.save();

        userAccount = new UserAccount({
          userId: user._id,
          provider: 'google',
          providerId: profile.id,
          email: profile.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpires: new Date(tokens.expiry_date)
        });
        await userAccount.save();

        // Create default profile and settings with safe defaults
        await UserProfile.create({
          userId: user._id,
          displayName: profile.name,
          profileImageUrl: profile.picture,
          // Set safe defaults for enum fields to avoid validation errors
          gender: 'prefer-not-to-say',
          experience: 'entry-level',
          productivityMetrics: {
            preferredWorkStyle: 'flexible',
            motivationType: 'progress'
          }
        });

        await UserSettings.create({
          userId: user._id
        });
      }

      // Generate JWT tokens
      const deviceInfo = this.extractDeviceInfo(req);
      const tokenPair = jwtUtils.generateTokenPair({
        userId: user._id,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
        deviceId: deviceInfo.deviceId
      });

      // Create session
      await jwtUtils.createSession(user._id, deviceInfo, tokenPair.refreshToken);

      res.json({
        success: true,
        message: 'Google authentication successful',
        data: {
          user: user.toSafeObject(),
          tokens: {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken
          }
        }
      });

    } catch (error) {
      console.error('Google code exchange error:', error);
      res.status(500).json({
        success: false,
        message: 'Google authentication failed',
        error: error.message
      });
    }
  }

  /**
   * Extract device information from request
   */
  extractDeviceInfo(req) {
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ip = req.ip || 'Unknown';
    
    return {
      deviceId: randomBytes(16).toString('hex'),
      deviceName: `Device - ${Date.now()}`,
      deviceType: 'desktop',
      browser: 'Unknown',
      os: 'Unknown',
      ipAddress: ip,
      userAgent,
      location: {
        country: 'Unknown',
        city: 'Unknown'
      }
    };
  }
}

export default new AuthController(); 