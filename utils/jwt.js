import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import UserSession from '../models/UserSession.js';

class JWTUtils {
  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'fallback-access-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload) {
    return jwt.sign(
      {
        ...payload,
        type: 'access',
        iat: Math.floor(Date.now() / 1000)
      },
      this.accessTokenSecret,
      {
        expiresIn: this.accessTokenExpiry,
        issuer: 'goalsync-api',
        audience: 'goalsync-frontend'
      }
    );
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload) {
    const jti = randomBytes(16).toString('hex'); // Unique token ID
    return jwt.sign(
      {
        ...payload,
        type: 'refresh',
        jti,
        iat: Math.floor(Date.now() / 1000)
      },
      this.refreshTokenSecret,
      {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'goalsync-api',
        audience: 'goalsync-frontend'
      }
    );
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(payload) {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    
    return {
      accessToken,
      refreshToken,
      accessTokenExpiry: this.getTokenExpiry(accessToken),
      refreshTokenExpiry: this.getTokenExpiry(refreshToken)
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'goalsync-api',
        audience: 'goalsync-frontend'
      });
      
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'goalsync-api',
        audience: 'goalsync-frontend'
      });
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
  }

  /**
   * Get token expiry date
   */
  getTokenExpiry(token) {
    try {
      const decoded = jwt.decode(token);
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp < now;
    } catch (error) {
      return true;
    }
  }

  /**
   * Decode token without verification
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(email, userId) {
    return jwt.sign(
      {
        email,
        userId,
        type: 'password-reset',
        iat: Math.floor(Date.now() / 1000)
      },
      this.accessTokenSecret,
      {
        expiresIn: '1h', // Password reset expires in 1 hour
        issuer: 'goalsync-api',
        audience: 'goalsync-frontend'
      }
    );
  }

  /**
   * Verify password reset token
   */
  verifyPasswordResetToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'goalsync-api',
        audience: 'goalsync-frontend'
      });
      
      if (decoded.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error(`Invalid password reset token: ${error.message}`);
    }
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(email, userId) {
    return jwt.sign(
      {
        email,
        userId,
        type: 'email-verification',
        iat: Math.floor(Date.now() / 1000)
      },
      this.accessTokenSecret,
      {
        expiresIn: '24h', // Email verification expires in 24 hours
        issuer: 'goalsync-api',
        audience: 'goalsync-frontend'
      }
    );
  }

  /**
   * Verify email verification token
   */
  verifyEmailVerificationToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'goalsync-api',
        audience: 'goalsync-frontend'
      });
      
      if (decoded.type !== 'email-verification') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error(`Invalid email verification token: ${error.message}`);
    }
  }

  /**
   * Create session with tokens
   */
  async createSession(userId, deviceInfo, refreshToken) {
    const refreshTokenExpiry = this.getTokenExpiry(refreshToken);
    
    // Create or update session
    const session = await UserSession.findOneAndUpdate(
      { deviceId: deviceInfo.deviceId },
      {
        userId,
        ...deviceInfo,
        refreshToken,
        refreshTokenExpires: refreshTokenExpiry,
        loginTime: new Date(),
        lastActive: new Date(),
        isActive: true
      },
      { upsert: true, new: true }
    );

    return session;
  }

  /**
   * Refresh token pair
   */
  async refreshTokens(refreshToken, deviceId) {
    try {
      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Find session
      const session = await UserSession.findOne({
        deviceId,
        refreshToken,
        isActive: true,
        refreshTokenExpires: { $gt: new Date() }
      });

      if (!session) {
        throw new Error('Invalid session');
      }

      // Generate new token pair
      const tokenPair = this.generateTokenPair({
        userId: decoded.userId,
        email: decoded.email,
        deviceId
      });

      // Update session with new refresh token
      await session.renewRefreshToken(
        tokenPair.refreshToken, 
        tokenPair.refreshTokenExpiry
      );

      return tokenPair;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(refreshToken, deviceId) {
    try {
      const session = await UserSession.findOne({
        deviceId,
        refreshToken,
        isActive: true
      });

      if (session) {
        await session.logout();
      }

      return true;
    } catch (error) {
      throw new Error(`Token revocation failed: ${error.message}`);
    }
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllUserTokens(userId, exceptDeviceId = null) {
    try {
      await UserSession.revokeAllUserSessions(userId, exceptDeviceId);
      return true;
    } catch (error) {
      throw new Error(`Failed to revoke all tokens: ${error.message}`);
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredTokens() {
    try {
      await UserSession.cleanupExpiredSessions();
      return true;
    } catch (error) {
      console.error('Failed to cleanup expired tokens:', error);
      return false;
    }
  }
}

// Export singleton instance
const jwtUtils = new JWTUtils();

export default jwtUtils; 