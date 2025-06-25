import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// In-memory token store (use database in production)
const tokenStore = new Map();

// Google OAuth 2.0 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'https://goal-sync.netlify.app/auth/gmail/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'openid'
].join(' ');

/**
 * Route 1: Redirect to Google OAuth 2.0 authorization URL
 * GET /auth/google
 */
router.get('/google', (req, res) => {
  try {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', SCOPES);
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('state', 'random_state_string'); // Add CSRF protection

    console.log('🔄 Redirecting to Google OAuth URL:', authUrl.toString());
    
    res.redirect(authUrl.toString());
  } catch (error) {
    console.error('❌ Error creating Google auth URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate Google OAuth'
    });
  }
});

/**
 * Route 2: Handle Google OAuth callback and exchange code for tokens
 * GET /auth/gmail/callback
 */
router.get('/gmail/callback', async (req, res) => {
  try {
    const { code, error, state } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('❌ OAuth error:', error);
      return res.status(400).json({
        success: false,
        message: `OAuth error: ${error}`
      });
    }

    // Validate authorization code
    if (!code) {
      console.error('❌ No authorization code received');
      return res.status(400).json({
        success: false,
        message: 'Authorization code not received'
      });
    }

    console.log('✅ Authorization code received:', code.substring(0, 20) + '...');

    // Step 1: Exchange authorization code for tokens
    const tokenResponse = await exchangeCodeForTokens(code);
    
    if (!tokenResponse.success) {
      return res.status(400).json(tokenResponse);
    }

    const { access_token, refresh_token, expires_in, id_token } = tokenResponse.data;

    // Step 2: Get user profile information
    const profileResponse = await getUserProfile(access_token);
    
    if (!profileResponse.success) {
      return res.status(400).json(profileResponse);
    }

    const userProfile = profileResponse.data;
    const userId = userProfile.id;

    // Step 3: Store tokens in session/memory (use database in production)
    const tokenData = {
      access_token,
      refresh_token,
      expires_in,
      id_token,
      expires_at: Date.now() + (expires_in * 1000),
      user_id: userId,
      created_at: new Date().toISOString()
    };

    // Store in memory (replace with database)
    tokenStore.set(userId, tokenData);
    
    // Store in session
    req.session.googleTokens = tokenData;
    req.session.userId = userId;

    console.log('💾 Tokens stored for user:', userId);

    // Step 4: Get calendar events (example)
    const calendarResponse = await getCalendarEvents(access_token);

    // Step 5: Return success response with user data
    res.json({
      success: true,
      message: 'Google OAuth completed successfully',
      data: {
        user: userProfile,
        tokens: {
          access_token: access_token.substring(0, 20) + '...', // Truncated for security
          refresh_token: refresh_token ? 'present' : 'not_received',
          expires_in,
          expires_at: tokenData.expires_at
        },
        calendar: calendarResponse.success ? {
          events_count: calendarResponse.data?.length || 0,
          sample_events: calendarResponse.data?.slice(0, 3) || []
        } : { error: calendarResponse.message }
      }
    });

  } catch (error) {
    console.error('❌ Callback error:', error);
    res.status(500).json({
      success: false,
      message: 'OAuth callback failed',
      error: error.message
    });
  }
});

/**
 * Helper function: Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code) {
  try {
    console.log('🔄 Exchanging code for tokens...');

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const requestData = {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI
    };

    const response = await axios.post(tokenUrl, requestData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Token exchange successful');
    console.log('📊 Token response:', {
      access_token: response.data.access_token?.substring(0, 20) + '...',
      refresh_token: response.data.refresh_token ? 'received' : 'not_received',
      expires_in: response.data.expires_in,
      token_type: response.data.token_type
    });

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('❌ Token exchange failed:', error.response?.data || error.message);
    return {
      success: false,
      message: 'Failed to exchange code for tokens',
      error: error.response?.data || error.message
    };
  }
}

/**
 * Helper function: Get user profile from Google
 */
async function getUserProfile(accessToken) {
  try {
    console.log('🔄 Fetching user profile...');

    const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ User profile fetched:', {
      id: response.data.id,
      email: response.data.email,
      name: response.data.name
    });

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('❌ Failed to fetch user profile:', error.response?.data || error.message);
    return {
      success: false,
      message: 'Failed to fetch user profile',
      error: error.response?.data || error.message
    };
  }
}

/**
 * Helper function: Get calendar events from Google Calendar API
 */
async function getCalendarEvents(accessToken, maxResults = 10) {
  try {
    console.log('🔄 Fetching calendar events...');

    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const response = await axios.get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        timeMin: now.toISOString(),
        timeMax: nextMonth.toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      }
    });

    console.log('✅ Calendar events fetched:', response.data.items?.length || 0, 'events');

    return {
      success: true,
      data: response.data.items || []
    };

  } catch (error) {
    console.error('❌ Failed to fetch calendar events:', error.response?.data || error.message);
    return {
      success: false,
      message: 'Failed to fetch calendar events',
      error: error.response?.data || error.message
    };
  }
}

/**
 * Route 3: Get stored tokens for a user (example)
 * GET /auth/google/tokens/:userId
 */
router.get('/google/tokens/:userId', (req, res) => {
  const { userId } = req.params;
  
  const tokens = tokenStore.get(userId);
  
  if (!tokens) {
    return res.status(404).json({
      success: false,
      message: 'No tokens found for user'
    });
  }

  // Check if token is expired
  const isExpired = Date.now() > tokens.expires_at;

  res.json({
    success: true,
    data: {
      user_id: userId,
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      expires_at: new Date(tokens.expires_at).toISOString(),
      is_expired: isExpired,
      created_at: tokens.created_at
    }
  });
});

/**
 * Route 4: Refresh access token using refresh token
 * POST /auth/google/refresh/:userId
 */
router.post('/google/refresh/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tokens = tokenStore.get(userId);

    if (!tokens || !tokens.refresh_token) {
      return res.status(404).json({
        success: false,
        message: 'No refresh token found for user'
      });
    }

    console.log('🔄 Refreshing access token for user:', userId);

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token'
    });

    // Update stored tokens
    const updatedTokens = {
      ...tokens,
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
      expires_at: Date.now() + (response.data.expires_in * 1000),
      updated_at: new Date().toISOString()
    };

    tokenStore.set(userId, updatedTokens);

    console.log('✅ Access token refreshed for user:', userId);

    res.json({
      success: true,
      message: 'Access token refreshed successfully',
      data: {
        expires_at: new Date(updatedTokens.expires_at).toISOString(),
        expires_in: response.data.expires_in
      }
    });

  } catch (error) {
    console.error('❌ Token refresh failed:', error.response?.data || error.message);
    res.status(400).json({
      success: false,
      message: 'Failed to refresh access token',
      error: error.response?.data || error.message
    });
  }
});

/**
 * Route 5: Test calendar access with stored tokens
 * GET /auth/google/test-calendar/:userId
 */
router.get('/google/test-calendar/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tokens = tokenStore.get(userId);

    if (!tokens) {
      return res.status(404).json({
        success: false,
        message: 'No tokens found for user'
      });
    }

    // Check if token is expired
    if (Date.now() > tokens.expires_at) {
      return res.status(401).json({
        success: false,
        message: 'Access token expired. Please refresh or re-authenticate.'
      });
    }

    const calendarResponse = await getCalendarEvents(tokens.access_token, 20);

    res.json({
      success: true,
      message: 'Calendar access test completed',
      data: calendarResponse
    });

  } catch (error) {
    console.error('❌ Calendar test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Calendar test failed',
      error: error.message
    });
  }
});

export default router; 