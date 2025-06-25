import { google } from 'googleapis';
import UserAccount from '../models/UserAccount.js';

class CalendarService {
  
  /**
   * Get OAuth2 client for a user
   */
  async getOAuth2Client(userId) {
    const userAccount = await UserAccount.findOne({ 
      userId, 
      provider: 'google' 
    });

    if (!userAccount || !userAccount.accessToken) {
      throw new Error('No Google account found for user');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://goal-sync.netlify.app/auth/gmail/callback'
    );

    oauth2Client.setCredentials({
      access_token: userAccount.accessToken,
      refresh_token: userAccount.refreshToken
    });

    return oauth2Client;
  }

  /**
   * Get user's calendar list
   */
  async getCalendars(userId) {
    try {
      const auth = await this.getOAuth2Client(userId);
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.calendarList.list();
      return {
        success: true,
        data: response.data.items || []
      };
    } catch (error) {
      console.error('Get calendars error:', error);
      return {
        success: false,
        message: 'Failed to fetch calendars'
      };
    }
  }

  /**
   * Get events from user's calendar
   */
  async getEvents(userId, calendarId = 'primary', options = {}) {
    try {
      const auth = await this.getOAuth2Client(userId);
      const calendar = google.calendar({ version: 'v3', auth });

      const {
        timeMin = new Date().toISOString(),
        timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        maxResults = 250,
        singleEvents = true,
        orderBy = 'startTime'
      } = options;

      const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        singleEvents,
        orderBy
      });

      return {
        success: true,
        data: response.data.items || []
      };
    } catch (error) {
      console.error('Get events error:', error);
      return {
        success: false,
        message: 'Failed to fetch calendar events'
      };
    }
  }

  /**
   * Create a new calendar event
   */
  async createEvent(userId, eventData, calendarId = 'primary') {
    try {
      const auth = await this.getOAuth2Client(userId);
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.insert({
        calendarId,
        resource: eventData
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Create event error:', error);
      return {
        success: false,
        message: 'Failed to create calendar event'
      };
    }
  }

  /**
   * Update a calendar event
   */
  async updateEvent(userId, eventId, eventData, calendarId = 'primary') {
    try {
      const auth = await this.getOAuth2Client(userId);
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.update({
        calendarId,
        eventId,
        resource: eventData
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Update event error:', error);
      return {
        success: false,
        message: 'Failed to update calendar event'
      };
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(userId, eventId, calendarId = 'primary') {
    try {
      const auth = await this.getOAuth2Client(userId);
      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.delete({
        calendarId,
        eventId
      });

      return {
        success: true,
        message: 'Event deleted successfully'
      };
    } catch (error) {
      console.error('Delete event error:', error);
      return {
        success: false,
        message: 'Failed to delete calendar event'
      };
    }
  }

  /**
   * Get free/busy information for a user
   */
  async getFreeBusy(userId, timeMin, timeMax, calendars = ['primary']) {
    try {
      const auth = await this.getOAuth2Client(userId);
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.freebusy.query({
        resource: {
          timeMin,
          timeMax,
          items: calendars.map(id => ({ id }))
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Get free/busy error:', error);
      return {
        success: false,
        message: 'Failed to fetch free/busy information'
      };
    }
  }
}

export default new CalendarService(); 