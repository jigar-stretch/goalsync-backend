import express from 'express';
import calendarService from '../services/calendarService.js';
import jwtUtils from '../utils/jwt.js';
import User from '../models/User.js';

const router = express.Router();

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

    // Verify token
    const decoded = jwtUtils.verifyAccessToken(token);
    
    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}

// Get user's calendars
router.get('/calendars', authenticateToken, async (req, res) => {
  try {
    const result = await calendarService.getCalendars(req.user._id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get calendars error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendars'
    });
  }
});

// Get calendar events
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const { 
      calendarId = 'primary',
      timeMin,
      timeMax,
      maxResults,
      singleEvents,
      orderBy
    } = req.query;

    const options = {};
    if (timeMin) options.timeMin = timeMin;
    if (timeMax) options.timeMax = timeMax;
    if (maxResults) options.maxResults = parseInt(maxResults);
    if (singleEvents) options.singleEvents = singleEvents === 'true';
    if (orderBy) options.orderBy = orderBy;

    const result = await calendarService.getEvents(req.user._id, calendarId, options);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar events'
    });
  }
});

// Create calendar event
router.post('/events', authenticateToken, async (req, res) => {
  try {
    const { calendarId = 'primary', ...eventData } = req.body;
    
    const result = await calendarService.createEvent(req.user._id, eventData, calendarId);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create calendar event'
    });
  }
});

// Update calendar event
router.put('/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { calendarId = 'primary', ...eventData } = req.body;
    
    const result = await calendarService.updateEvent(req.user._id, eventId, eventData, calendarId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update calendar event'
    });
  }
});

// Delete calendar event
router.delete('/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { calendarId = 'primary' } = req.query;
    
    const result = await calendarService.deleteEvent(req.user._id, eventId, calendarId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete calendar event'
    });
  }
});

// Get free/busy information
router.post('/freebusy', authenticateToken, async (req, res) => {
  try {
    const { timeMin, timeMax, calendars = ['primary'] } = req.body;
    
    if (!timeMin || !timeMax) {
      return res.status(400).json({
        success: false,
        message: 'timeMin and timeMax are required'
      });
    }
    
    const result = await calendarService.getFreeBusy(req.user._id, timeMin, timeMax, calendars);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get free/busy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch free/busy information'
    });
  }
});

export default router; 