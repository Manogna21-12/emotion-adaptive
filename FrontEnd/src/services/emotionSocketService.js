import { io } from 'socket.io-client';

class EmotionSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
  }

  // Initialize socket connection
  initialize(userId = null) {
    if (this.socket && this.socket.connected) {
      console.log('🔌 Socket already connected');
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '';
    console.log(`🔌 Connecting to emotion socket: ${socketUrl}`);

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.setupEventHandlers();

    if (userId) {
      this.joinUserRoom(userId);
    }
  }

  // Setup socket event handlers
  setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Emotion socket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Emotion socket disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Emotion socket connection error:', error);
      this.reconnectAttempts++;
      this.emit('connectionError', error);
    });

    // Emotion-based recommendation events
    this.socket.on('emotionBasedRecommendation', (data) => {
      console.log('📊 Emotion-based recommendation received:', data);
      this.emit('emotionBasedRecommendation', data);
    });

    this.socket.on('personalizedRecommendation', (data) => {
      console.log('👤 Personalized recommendation received:', data);
      this.emit('personalizedRecommendation', data);
    });

    // New quiz events
    this.socket.on('newQuizAdded', (quiz) => {
      console.log('📝 New quiz added:', quiz);
      this.emit('newQuizAdded', quiz);
    });

    this.socket.on(`quiz_confused`, (quiz) => {
      console.log('🤔 Confused quiz received:', quiz);
      this.emit('quiz_confused', quiz);
    });

    this.socket.on(`quiz_happy`, (quiz) => {
      console.log('😊 Happy quiz received:', quiz);
      this.emit('quiz_happy', quiz);
    });

    this.socket.on(`quiz_sad`, (quiz) => {
      console.log('😢 Sad quiz received:', quiz);
      this.emit('quiz_sad', quiz);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('🔌 Socket error:', error);
      this.emit('error', error);
    });
  }

  // Join user-specific room
  joinUserRoom(userId) {
    if (!this.socket || !userId) return;

    console.log(`👤 Joining user room: ${userId}`);
    this.socket.emit('joinUserRoom', userId);
  }

  // Leave user room
  leaveUserRoom() {
    if (!this.socket) return;

    console.log('👤 Leaving user room');
    this.socket.emit('leaveUserRoom');
  }

  // Submit quiz answer
  submitQuizAnswer(quizId, userAnswer, userId) {
    if (!this.socket) return;

    console.log(`📝 Submitting quiz answer: ${quizId} - ${userAnswer}`);
    this.socket.emit('submitQuizAnswer', {
      quizId,
      userAnswer,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  // Get latest emotion for user
  async getLatestEmotion(userId) {
    if (!userId) return null;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/emotion/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('📊 Latest emotion fetched:', data.data);
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching latest emotion:', error);
      return null;
    }
  }

  // Log emotion
  async logEmotion(userId, emotion, context = null) {
    if (!userId || !emotion) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/emotion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          emotion,
          context,
          source: 'socket-service'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Emotion logged successfully:', data.data);
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Error logging emotion:', error);
      return null;
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in socket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      socketId: this.socket?.id
    };
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting emotion socket');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Reconnect socket
  reconnect(userId = null) {
    this.disconnect();
    this.initialize(userId);
  }
}

// Create singleton instance
const emotionSocketService = new EmotionSocketService();

export default emotionSocketService;
