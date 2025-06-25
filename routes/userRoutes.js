import express from 'express';
import userController from '../controllers/userController.js';
import jwtUtils from '../utils/jwt.js';
import User from '../models/User.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// User profile routes
router.get('/me', userController.getMe);
router.put('/profile', userController.updateProfile);
router.put('/settings', userController.updateSettings);
router.patch('/onboarding', userController.updateOnboarding);

// Session management routes
router.get('/sessions', userController.getSessions);
router.delete('/sessions/:sessionId', userController.revokeSession);

// Account management
router.delete('/account', userController.deleteAccount);

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

    // Update last active
    await user.updateLastActive();
    
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