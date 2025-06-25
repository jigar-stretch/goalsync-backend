import jwtUtils from '../utils/jwt.js';
import User from '../models/User.js';
import UserSession from '../models/UserSession.js';

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> Set of socketIds
    this.userSockets = new Map(); // socketId -> userId
  }

  initialize(io) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
    console.log('🔌 Socket.IO service initialized');
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify token
        const decoded = jwtUtils.verifyAccessToken(token);
        
        // Get user details
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }

        // Update last active
        await user.updateLastActive();

        // Attach user to socket
        socket.user = user;
        socket.userId = user._id.toString();
        
        next();
      } catch (error) {
        console.error('Socket authentication error:', error.message);
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    const userId = socket.userId;
    console.log(`👤 User ${socket.user.name} connected (${socket.id})`);

    // Track connected user
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socket.id);
    this.userSockets.set(socket.id, userId);

    // Join user room
    socket.join(`user_${userId}`);

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected successfully',
      userId,
      timestamp: new Date().toISOString()
    });

    // Broadcast user online status to relevant users (if needed)
    this.broadcastUserStatus(userId, 'online');

    // Setup event handlers
    this.setupUserEvents(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  setupUserEvents(socket) {
    const userId = socket.userId;

    // Goal events
    socket.on('goal:created', (data) => {
      this.broadcastToUser(userId, 'goal:created', data);
    });

    socket.on('goal:updated', (data) => {
      this.broadcastToUser(userId, 'goal:updated', data);
    });

    socket.on('goal:deleted', (data) => {
      this.broadcastToUser(userId, 'goal:deleted', data);
    });

    // Task events
    socket.on('task:created', (data) => {
      this.broadcastToUser(userId, 'task:created', data);
    });

    socket.on('task:updated', (data) => {
      this.broadcastToUser(userId, 'task:updated', data);
    });

    socket.on('task:completed', (data) => {
      this.broadcastToUser(userId, 'task:completed', data);
    });

    socket.on('task:deleted', (data) => {
      this.broadcastToUser(userId, 'task:deleted', data);
    });

    // Calendar events
    socket.on('calendar:synced', (data) => {
      this.broadcastToUser(userId, 'calendar:synced', data);
    });

    socket.on('calendar:error', (data) => {
      this.broadcastToUser(userId, 'calendar:error', data);
    });

    // Notification events
    socket.on('notification:read', (data) => {
      this.broadcastToUser(userId, 'notification:read', data);
    });

    // Session events
    socket.on('session:new_device', (data) => {
      this.broadcastToUser(userId, 'session:new_device', data);
    });

    socket.on('session:revoked', (data) => {
      this.broadcastToUser(userId, 'session:revoked', data);
    });

    // Typing indicators (for collaboration features)
    socket.on('typing:start', (data) => {
      socket.to(`user_${userId}`).emit('typing:start', {
        ...data,
        socketId: socket.id,
        user: socket.user.name
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(`user_${userId}`).emit('typing:stop', {
        ...data,
        socketId: socket.id,
        user: socket.user.name
      });
    });

    // Ping/Pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
      socket.emit('error', {
        message: 'An error occurred',
        timestamp: new Date().toISOString()
      });
    });
  }

  handleDisconnection(socket) {
    const userId = socket.userId;
    const socketId = socket.id;

    console.log(`👤 User ${socket.user?.name || userId} disconnected (${socketId})`);

    // Remove from tracking
    if (this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId).delete(socketId);
      
      // If no more connections for this user, remove from map
      if (this.connectedUsers.get(userId).size === 0) {
        this.connectedUsers.delete(userId);
        // Broadcast user offline status
        this.broadcastUserStatus(userId, 'offline');
      }
    }
    
    this.userSockets.delete(socketId);
  }

  // Utility methods
  broadcastToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  broadcastToAllUsers(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  broadcastUserStatus(userId, status) {
    // This could be used for collaboration features
    // For now, just log the status change
    console.log(`📊 User ${userId} is now ${status}`);
  }

  // Send notification to specific user
  sendNotificationToUser(userId, notification) {
    this.broadcastToUser(userId, 'notification:new', notification);
  }

  // Send goal milestone notification
  sendGoalMilestone(userId, milestone) {
    this.broadcastToUser(userId, 'goal:milestone', milestone);
  }

  // Send calendar sync update
  sendCalendarUpdate(userId, update) {
    this.broadcastToUser(userId, 'calendar:update', update);
  }

  // Send security alert
  sendSecurityAlert(userId, alert) {
    this.broadcastToUser(userId, 'security:alert', alert);
  }

  // Force disconnect user (for security purposes)
  async forceDisconnectUser(userId, reason = 'Security requirement') {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('force_disconnect', { reason });
          socket.disconnect(true);
        }
      });
    }
  }

  // Get connection stats
  getStats() {
    return {
      totalConnections: this.io.sockets.sockets.size,
      uniqueUsers: this.connectedUsers.size,
      connectionsPerUser: Array.from(this.connectedUsers.entries()).map(([userId, sockets]) => ({
        userId,
        connections: sockets.size
      }))
    };
  }

  // Broadcast system-wide maintenance message
  broadcastMaintenance(message, scheduledTime = null) {
    this.broadcastToAllUsers('system:maintenance', {
      message,
      scheduledTime,
      type: 'maintenance'
    });
  }

  // Broadcast system announcement
  broadcastAnnouncement(announcement) {
    this.broadcastToAllUsers('system:announcement', announcement);
  }
}

// Export function to configure Socket.IO
export default function configureSocket(io) {
  const socketService = new SocketService();
  socketService.initialize(io);
  
  // Make socket service available globally
  global.socketService = socketService;
  
  return socketService;
} 