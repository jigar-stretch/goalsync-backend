import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Unified authentication middleware for JWT token verification
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
        code: 'SERVER_ERROR'
      });
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, jwtSecret, {
        issuer: 'goalsync-api',
        audience: 'goalsync-frontend'
      });

      // Check token type
      if (decoded.type !== 'access') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token type',
          code: 'INVALID_TOKEN'
        });
      }

      // Find the user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is inactive',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      // Update last active timestamp
      await user.updateLastActive();
      
      // Attach user to request
      req.user = user;
      req.userId = user._id;
      req.deviceId = decoded.deviceId;

      next();
    } catch (jwtError) {
      console.log('JWT verification error:', jwtError.message);
      
      // Handle specific JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access token has expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid access token',
          code: 'INVALID_TOKEN'
        });
      } else if (jwtError.name === 'NotBeforeError') {
        return res.status(401).json({
          success: false,
          message: 'Token not yet valid',
          code: 'TOKEN_NOT_ACTIVE'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Token verification failed',
          code: 'TOKEN_VERIFICATION_FAILED'
        });
      }
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      // No token provided, continue without user
      req.user = null;
      req.userId = null;
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      req.user = null;
      req.userId = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, jwtSecret, {
        issuer: 'goalsync-api',
        audience: 'goalsync-frontend'
      });

      if (decoded.type === 'access') {
        const user = await User.findById(decoded.userId);
        if (user) {
          req.user = user;
          req.userId = user._id;
          req.deviceId = decoded.deviceId;
        }
      }
    } catch (jwtError) {
      // Token invalid, continue without user
      console.log('Optional auth - invalid token:', jwtError.message);
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without authentication on errors
    req.user = null;
    req.userId = null;
    next();
  }
};

/**
 * Middleware to check if user has completed onboarding
 */
export const requireOnboarding = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NO_AUTH'
    });
  }

  if (!req.user.onboardingCompleted) {
    return res.status(403).json({
      success: false,
      message: 'Onboarding must be completed to access this resource',
      code: 'ONBOARDING_REQUIRED'
    });
  }

  next();
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NO_AUTH'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

/**
 * Middleware to extract device information from request
 */
export const extractDeviceInfo = (req, res, next) => {
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown';
  
  req.deviceInfo = {
    deviceId: req.body.deviceId || req.query.deviceId || null,
    userAgent,
    ipAddress: ip,
    deviceType: 'web', // Can be enhanced to detect mobile/tablet
    browser: 'Unknown', // Can be enhanced with user-agent parsing
    os: 'Unknown' // Can be enhanced with user-agent parsing
  };
  
  next();
};

export default {
  authenticateToken,
  optionalAuth,
  requireOnboarding,
  requireAdmin,
  extractDeviceInfo
}; 