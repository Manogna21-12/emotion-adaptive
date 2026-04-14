const EmotionChangeStream = require('./emotionChangeStream');

class EmotionSocketService {
  constructor(io) {
    this.io = io;
    this.changeStream = null;
    this.connectedUsers = new Map(); // userId -> Set of socketIds
    this.userSessions = new Map(); // socketId -> userId
  }

  // Initialize the service
  initialize() {
    console.log('🔌 Initializing Emotion Socket Service...');
    
    // Setup Socket.IO event handlers
    this.setupSocketHandlers();
    
    // Start Change Stream
    this.changeStream = new EmotionChangeStream(this.io);
    this.changeStream.start();
    
    console.log('✅ Emotion Socket Service initialized');
  }

  // Setup Socket.IO event handlers
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected to emotion stream: ${socket.id}`);
      
      // Handle user authentication/joining
      socket.on('joinEmotionStream', (data) => {
        this.handleUserJoin(socket, data);
      });

      // Handle user leaving
      socket.on('leaveEmotionStream', () => {
        this.handleUserLeave(socket);
      });

      // Handle emotion logging
      socket.on('logEmotion', (data) => {
        this.handleEmotionLog(socket, data);
      });

      // Handle getting latest emotion
      socket.on('getLatestEmotion', (data) => {
        this.handleGetLatestEmotion(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error('🔌 Socket error:', error);
      });

      // Send welcome message
      socket.emit('emotionStreamConnected', {
        socketId: socket.id,
        timestamp: new Date(),
        message: 'Connected to real-time emotion stream'
      });
    });
  }

  // Handle user joining emotion stream
  handleUserJoin(socket, data) {
    try {
      const { userId } = data;
      
      if (!userId) {
        socket.emit('error', { message: 'User ID is required' });
        return;
      }

      // Add user to tracking
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId).add(socket.id);
      this.userSessions.set(socket.id, userId);

      // Join user-specific room
      socket.join(`user_${userId}`);

      console.log(`👤 User ${userId} joined emotion stream (socket: ${socket.id})`);

      // Send confirmation
      socket.emit('emotionStreamJoined', {
        userId,
        socketId: socket.id,
        timestamp: new Date()
      });

      // Broadcast user count update
      this.broadcastUserCount();

    } catch (error) {
      console.error('❌ Error handling user join:', error);
      socket.emit('error', { message: 'Failed to join emotion stream' });
    }
  }

  // Handle user leaving emotion stream
  handleUserLeave(socket) {
    try {
      const userId = this.userSessions.get(socket.id);
      
      if (userId) {
        // Remove socket from user's connections
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          
          // Clean up empty user entries
          if (userSockets.size === 0) {
            this.connectedUsers.delete(userId);
          }
        }

        // Leave user-specific room
        socket.leave(`user_${userId}`);

        // Remove from session tracking
        this.userSessions.delete(socket.id);

        console.log(`👤 User ${userId} left emotion stream (socket: ${socket.id})`);
      }

      // Send confirmation
      socket.emit('emotionStreamLeft', {
        socketId: socket.id,
        timestamp: new Date()
      });

      // Broadcast user count update
      this.broadcastUserCount();

    } catch (error) {
      console.error('❌ Error handling user leave:', error);
    }
  }

  // Handle emotion logging from socket
  async handleEmotionLog(socket, data) {
    try {
      const { userId, emotion, metadata } = data;
      
      if (!userId || !emotion) {
        socket.emit('error', { message: 'User ID and emotion are required' });
        return;
      }

      // Import EmotionLog model
      const EmotionLog = require('../models/EmotionLog');
      
      // Create emotion log
      const emotionLog = new EmotionLog({
        userId,
        emotion,
        metadata: {
          ...metadata,
          source: 'socket',
          socketId: socket.id
        }
      });

      await emotionLog.save();

      const displayData = emotionLog.getDisplayData();

      console.log(`✅ Emotion logged via socket: ${emotion} for user ${userId}`);

      // Send confirmation to the socket that logged the emotion
      socket.emit('emotionLogged', {
        success: true,
        data: displayData
      });

      // The Change Stream will handle broadcasting to other clients

    } catch (error) {
      console.error('❌ Error logging emotion via socket:', error);
      socket.emit('error', { message: 'Failed to log emotion' });
    }
  }

  // Handle getting latest emotion
  async handleGetLatestEmotion(socket, data) {
    try {
      const { userId } = data;
      
      if (!userId) {
        socket.emit('error', { message: 'User ID is required' });
        return;
      }

      // Import EmotionLog model
      const EmotionLog = require('../models/EmotionLog');
      
      const latestEmotion = await EmotionLog.getLatestEmotion(userId);
      
      if (latestEmotion) {
        const displayData = latestEmotion.getDisplayData();
        socket.emit('latestEmotion', {
          success: true,
          data: displayData
        });
      } else {
        socket.emit('latestEmotion', {
          success: false,
          message: 'No emotion data found'
        });
      }

    } catch (error) {
      console.error('❌ Error getting latest emotion:', error);
      socket.emit('error', { message: 'Failed to get latest emotion' });
    }
  }

  // Handle socket disconnect
  handleDisconnect(socket) {
    try {
      const userId = this.userSessions.get(socket.id);
      
      if (userId) {
        // Remove socket from user's connections
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          
          // Clean up empty user entries
          if (userSockets.size === 0) {
            this.connectedUsers.delete(userId);
          }
        }

        // Leave user-specific room
        socket.leave(`user_${userId}`);

        console.log(`👤 User ${userId} disconnected from emotion stream (socket: ${socket.id})`);
      }

      // Remove from session tracking
      this.userSessions.delete(socket.id);

      // Broadcast user count update
      this.broadcastUserCount();

    } catch (error) {
      console.error('❌ Error handling disconnect:', error);
    }
  }

  // Broadcast user count update
  broadcastUserCount() {
    const totalUsers = this.connectedUsers.size;
    const totalConnections = Array.from(this.connectedUsers.values())
      .reduce((total, sockets) => total + sockets.size, 0);

    this.io.emit('emotionStreamStats', {
      totalUsers,
      totalConnections,
      timestamp: new Date()
    });
  }

  // Get service status
  getStatus() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalConnections: Array.from(this.connectedUsers.values())
        .reduce((total, sockets) => total + sockets.size, 0),
      changeStreamStatus: this.changeStream ? this.changeStream.getStatus() : null
    };
  }

  // Cleanup service
  cleanup() {
    console.log('🛑 Cleaning up Emotion Socket Service...');
    
    if (this.changeStream) {
      this.changeStream.stop();
    }
    
    this.connectedUsers.clear();
    this.userSessions.clear();
    
    console.log('✅ Emotion Socket Service cleaned up');
  }
}

module.exports = EmotionSocketService;
