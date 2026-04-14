const { Server } = require('socket.io');
const EmotionLog = require('../models/EmotionLog');
const User = require('../models/User');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket.id
    this.userSockets = new Map(); // socket.id -> userId
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupEventHandlers();
    console.log('🔌 Socket.IO server initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`👤 User connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', async (data) => {
        try {
          const { userId, token } = data;
          
          // Here you would typically verify the token
          // For now, we'll just accept the userId
          
          this.connectedUsers.set(userId, socket.id);
          this.userSockets.set(socket.id, userId);
          
          socket.userId = userId;
          
          console.log(`🔐 User authenticated: ${userId}`);
          
          // Send confirmation
          socket.emit('authenticated', {
            success: true,
            userId,
            message: 'Successfully connected to real-time updates'
          });

          // Join user to their personal room
          socket.join(`user_${userId}`);
          
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('authentication_error', {
            success: false,
            message: 'Authentication failed'
          });
        }
      });

      // Handle emotion logging from frontend
      socket.on('log_emotion', async (data) => {
        try {
          const { userId, emotion } = data;
          
          if (!userId || !emotion) {
            socket.emit('error', { message: 'userId and emotion are required' });
            return;
          }

          // Create emotion log
          const emotionLog = new EmotionLog({
            userId,
            emotion
          });
          
          await emotionLog.save();

          // Update user's last emotion
          await User.findByIdAndUpdate(userId, {
            lastEmotion: emotion,
            lastRecommendationAt: new Date()
          });

          console.log(`📊 Emotion logged: ${userId} -> ${emotion}`);

          // Emit to user's personal room
          this.io.to(`user_${userId}`).emit('emotion_logged', {
            success: true,
            emotion,
            timestamp: new Date(),
            userId
          });

          // Emit to admin room (if any)
          this.io.to('admin_room').emit('emotion_update', {
            userId,
            emotion,
            timestamp: new Date()
          });

        } catch (error) {
          console.error('Error logging emotion:', error);
          socket.emit('error', {
            message: 'Failed to log emotion',
            error: error.message
          });
        }
      });

      // Handle recommendation request
      socket.on('get_recommendation', async (data) => {
        try {
          const { userId } = data;
          
          // Get latest emotion
          const latestEmotion = await EmotionLog
            .findOne({ userId })
            .sort({ createdAt: -1 })
            .lean();

          if (!latestEmotion) {
            socket.emit('recommendation_error', {
              message: 'No emotion data found'
            });
            return;
          }

          // Get recommendation (this would use the recommendation controller)
          const recommendation = await this.getRecommendationForEmotion(latestEmotion.emotion);
          
          socket.emit('recommendation', {
            success: true,
            emotion: latestEmotion.emotion,
            recommendation,
            timestamp: new Date()
          });

        } catch (error) {
          console.error('Error getting recommendation:', error);
          socket.emit('recommendation_error', {
            message: 'Failed to get recommendation',
            error: error.message
          });
        }
      });

      // Handle admin joining admin room
      socket.on('join_admin', () => {
        socket.join('admin_room');
        socket.emit('admin_joined', {
          success: true,
          message: 'Joined admin room'
        });
        console.log('👨‍💼 Admin joined admin room');
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        const userId = this.userSockets.get(socket.id);
        
        if (userId) {
          this.connectedUsers.delete(userId);
          this.userSockets.delete(socket.id);
          
          console.log(`👋 User disconnected: ${userId}`);
        }
        
        console.log(`🔌 User disconnected: ${socket.id}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }

  // Get recommendation for emotion (simplified version)
  async getRecommendationForEmotion(emotion) {
    const Quiz = require('../models/Quiz');
    const Video = require('../models/Video');
    const Quote = require('../models/Quote');

    try {
      switch (emotion) {
        case 'confused':
          const [easyQuiz, shortVideo] = await Promise.all([
            Quiz.findOne({ emotionTag: 'confused', difficulty: 'easy', isActive: true }),
            Video.findOne({ emotionTag: 'confused', isActive: true })
          ]);
          return {
            type: 'confused',
            title: 'Let\'s clarify things!',
            content: { quiz: easyQuiz, video: shortVideo }
          };

        case 'sad':
          const [motivationalQuote, easyQuiz] = await Promise.all([
            Quote.findOne({ emotionTag: 'sad', isActive: true }),
            Quiz.findOne({ emotionTag: 'sad', difficulty: 'easy', isActive: true })
          ]);
          return {
            type: 'sad',
            title: 'You\'ve got this!',
            content: { quote: motivationalQuote, quiz: easyQuiz }
          };

        case 'happy':
          const challengingQuiz = await Quiz.findOne({ 
            emotionTag: 'happy', 
            difficulty: 'hard', 
            isActive: true 
          });
          return {
            type: 'happy',
            title: 'Great to see you happy!',
            content: { quiz: challengingQuiz }
          };

        case 'angry':
          return {
            type: 'angry',
            title: 'Take a moment',
            content: {
              breakMessage: 'Take a 5-minute break. Try deep breathing or a short walk.',
              breakDuration: 5
            }
          };

        default:
          return {
            type: 'default',
            title: 'Keep learning!',
            content: { message: 'Continue with your current learning path.' }
          };
      }
    } catch (error) {
      console.error('Error getting recommendation:', error);
      return {
        type: 'default',
        title: 'Keep learning!',
        content: { message: 'Continue with your current learning path.' }
      };
    }
  }

  // Emit emotion change to specific user
  emitEmotionChange(userId, emotionData) {
    this.io.to(`user_${userId}`).emit('emotion_changed', {
      ...emotionData,
      timestamp: new Date()
    });
  }

  // Emit to all connected users
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Emit to admin room
  emitToAdmin(event, data) {
    this.io.to('admin_room').emit(event, data);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }
}

module.exports = new SocketService();
