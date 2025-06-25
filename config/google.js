import dotenv from 'dotenv';

dotenv.config();

/**
 * Google OAuth 2.0 Configuration
 * Centralized configuration for Google API integration
 */
export const googleConfig = {
  // OAuth 2.0 Credentials
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  
  // Redirect URIs
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'https://goal-sync.netlify.app/auth/gmail/callback',
  
  // OAuth 2.0 Scopes
  scopes: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email', 
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'openid'
  ],
  
  // Google API Endpoints
  endpoints: {
    authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    userInfo: 'https://www.googleapis.com/oauth2/v2/userinfo',
    calendar: 'https://www.googleapis.com/calendar/v3',
    revoke: 'https://oauth2.googleapis.com/revoke'
  },
  
  // OAuth Flow Settings
  accessType: 'offline',
  prompt: 'consent',
  responseType: 'code',
  
  // Token Configuration
  tokenType: 'Bearer',
  
  // Validation
  isValid() {
    const required = ['clientId', 'clientSecret'];
    const missing = required.filter(key => !this[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required Google OAuth configuration: ${missing.join(', ')}`);
    }
    
    return true;
  },
  
  // Generate Authorization URL
  getAuthUrl(state = null) {
    this.isValid();
    
    const url = new URL(this.endpoints.authorization);
    url.searchParams.append('client_id', this.clientId);
    url.searchParams.append('redirect_uri', this.redirectUri);
    url.searchParams.append('response_type', this.responseType);
    url.searchParams.append('scope', this.scopes.join(' '));
    url.searchParams.append('access_type', this.accessType);
    url.searchParams.append('prompt', this.prompt);
    
    if (state) {
      url.searchParams.append('state', state);
    }
    
    return url.toString();
  },
  
  // Get Token Exchange Payload
  getTokenPayload(code) {
    this.isValid();
    
    return {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri
    };
  },
  
  // Get Refresh Token Payload
  getRefreshPayload(refreshToken) {
    this.isValid();
    
    return {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    };
  }
};

export default googleConfig; 