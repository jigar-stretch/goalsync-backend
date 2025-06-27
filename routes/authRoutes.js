import express from 'express';
import passport from 'passport';
import authController, { default as AuthController } from '../controllers/authController.js';
import jwtUtils from '../utils/jwt.js';
import User from '../models/User.js';
import { authenticateToken, extractDeviceInfo } from '../middleware/auth.js';

const router = express.Router();

// Local authentication routes
router.post('/local-signup', authController.localSignup);
router.post('/local-login', authController.localLogin);

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
  extractDeviceInfo,
  async (req, res) => {
    try {
      const user = req.user;
      const deviceInfo = req.deviceInfo;
      
      // Generate tokens
      const tokenPair = jwtUtils.generateTokenPair({
        userId: user._id,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
        deviceId: deviceInfo.deviceId || AuthController.extractDeviceInfo(req).deviceId
      });

      // Create session
      await jwtUtils.createSession(user._id, deviceInfo, tokenPair.refreshToken);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${tokenPair.accessToken}&refresh=${tokenPair.refreshToken}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/login?error=callback_failed`);
    }
  }
);

// Google OAuth code exchange (for frontend-initiated OAuth)
router.post('/google/exchange', authController.googleCodeExchange);

// Microsoft OAuth routes
router.get('/outlook',
  passport.authenticate('microsoft', { scope: ['user.read', 'calendars.read'] })
);

router.get('/outlook/callback',
  passport.authenticate('microsoft', { failureRedirect: '/login?error=outlook_auth_failed' }),
  extractDeviceInfo,
  async (req, res) => {
    try {
      const user = req.user;
      const deviceInfo = req.deviceInfo;
      
      // Generate tokens
      const tokenPair = jwtUtils.generateTokenPair({
        userId: user._id,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
        deviceId: deviceInfo.deviceId || AuthController.extractDeviceInfo(req).deviceId
      });

      // Create session
      await jwtUtils.createSession(user._id, deviceInfo, tokenPair.refreshToken);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${tokenPair.accessToken}&refresh=${tokenPair.refreshToken}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Outlook callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/login?error=callback_failed`);
    }
  }
);

// Token management routes
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticateToken, authController.logout);
router.post('/logout-all', authenticateToken, authController.logoutAll);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Email verification
router.post('/verify-email', authController.verifyEmail);

export default router; 