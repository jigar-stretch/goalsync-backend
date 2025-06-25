import express from 'express';
import passport from 'passport';
import authController from '../controllers/authController.js';
import jwtUtils from '../utils/jwt.js';

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
  async (req, res) => {
    try {
      const user = req.user;
      const deviceInfo = authController.extractDeviceInfo(req);
      
      // Generate tokens
      const tokenPair = jwtUtils.generateTokenPair({
        userId: user._id,
        email: user.email,
        deviceId: deviceInfo.deviceId
      });

      // Create session
      await jwtUtils.createSession(user._id, deviceInfo, tokenPair.refreshToken);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${tokenPair.accessToken}&refresh=${tokenPair.refreshToken}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect('/login?error=callback_failed');
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
  async (req, res) => {
    try {
      const user = req.user;
      const deviceInfo = authController.extractDeviceInfo(req);
      
      // Generate tokens
      const tokenPair = jwtUtils.generateTokenPair({
        userId: user._id,
        email: user.email,
        deviceId: deviceInfo.deviceId
      });

      // Create session
      await jwtUtils.createSession(user._id, deviceInfo, tokenPair.refreshToken);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${tokenPair.accessToken}&refresh=${tokenPair.refreshToken}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Outlook callback error:', error);
      res.redirect('/login?error=callback_failed');
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

// Authentication middleware
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwtUtils.verifyAccessToken(token);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}

export default router; 