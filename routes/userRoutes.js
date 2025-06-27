import express from 'express';
import userController from '../controllers/userController.js';
import { authenticateToken, requireOnboarding } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// User profile routes
router.get('/me', userController.getMe);
router.put('/profile', userController.updateProfile);
router.put('/settings', userController.updateSettings);
router.post('/onboarding', userController.updateOnboarding);

// Session management routes
router.get('/sessions', userController.getSessions);
router.delete('/sessions/:sessionId', userController.revokeSession);

// Account management
router.delete('/account', userController.deleteAccount);

export default router; 