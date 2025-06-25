import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import UserSettings from '../models/UserSettings.js';
import UserSession from '../models/UserSession.js';
import jwtUtils from '../utils/jwt.js';

class UserController {
  /**
   * Get current user profile
   */
  async getMe(req, res) {
    try {
      const userId = req.user._id;

      // Get user with profile and settings
      const [user, profile, settings] = await Promise.all([
        User.findById(userId),
        UserProfile.findOrCreateByUserId(userId),
        UserSettings.findOrCreateByUserId(userId)
      ]);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user: user.toSafeObject(),
          profile,
          settings
        }
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user data'
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const updates = req.body;

      // Update user basic info
      const userUpdates = {};
      if (updates.name) userUpdates.name = updates.name;
      if (updates.finalGoal) userUpdates.finalGoal = updates.finalGoal;
      if (updates.goalReason) userUpdates.goalReason = updates.goalReason;
      if (updates.personalMotto) userUpdates.personalMotto = updates.personalMotto;

      const user = await User.findByIdAndUpdate(
        userId,
        userUpdates,
        { new: true, runValidators: true }
      );

      // Update profile
      const profile = await UserProfile.findOrCreateByUserId(userId);
      Object.assign(profile, updates);
      await profile.save();
      await profile.updateProfileCompletion();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: user.toSafeObject(),
          profile
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(req, res) {
    try {
      const userId = req.user._id;
      const updates = req.body;

      const settings = await UserSettings.findOrCreateByUserId(userId);
      Object.assign(settings, updates);
      await settings.save();

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: { settings }
      });

    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update settings'
      });
    }
  }

  /**
   * Get user sessions/devices
   */
  async getSessions(req, res) {
    try {
      const userId = req.user._id;

      const sessions = await UserSession.findActiveByUserId(userId);

      res.json({
        success: true,
        data: { sessions }
      });

    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sessions'
      });
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(req, res) {
    try {
      const userId = req.user._id;
      const { sessionId } = req.params;

      const session = await UserSession.findById(sessionId);
      
      if (!session || session.userId.toString() !== userId.toString()) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      await session.logout();

      // Force disconnect socket if available
      if (global.socketService) {
        await global.socketService.forceDisconnectUser(userId, 'Session revoked');
      }

      res.json({
        success: true,
        message: 'Session revoked successfully'
      });

    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revoke session'
      });
    }
  }

  /**
   * Update user onboarding
   */
  async updateOnboarding(req, res) {
    try {
      const userId = req.user._id;
      const {
        finalGoal,
        goalReason,
        personalMotto,
        deadline,
        weeklyTimeCommitment,
        preferredWorkingHours,
        aiEnabled,
        reminderFrequency
      } = req.body;

      // Update user with onboarding data
      const userUpdates = {
        finalGoal,
        goalReason,
        personalMotto,
        deadline,
        weeklyTimeCommitment,
        preferredWorkingHours,
        aiEnabled,
        reminderFrequency,
        onboardingCompleted: true
      };

      const user = await User.findByIdAndUpdate(
        userId,
        userUpdates,
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Onboarding completed successfully',
        data: {
          user: user.toJSON()
        }
      });

    } catch (error) {
      console.error('Update onboarding error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete onboarding'
      });
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(req, res) {
    try {
      const userId = req.user._id;

      // Deactivate user instead of hard delete
      await User.findByIdAndUpdate(userId, { isActive: false });

      // Revoke all sessions
      await jwtUtils.revokeAllUserTokens(userId);

      // Force disconnect all sockets
      if (global.socketService) {
        await global.socketService.forceDisconnectUser(userId, 'Account deleted');
      }

      res.json({
        success: true,
        message: 'Account deactivated successfully'
      });

    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    }
  }
}

export default new UserController(); 