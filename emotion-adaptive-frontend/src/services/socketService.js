import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
  }

  connect(userId) {
    if (this.socket && this.isConnected) return;
    this.userId = userId;
    const serverUrl = process.env.REACT_APP_SOCKET_URL || 'https://emotion-adaptive.onrender.com';
    console.log('🔌 Connecting to Socket.IO server on', serverUrl);
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      this.isConnected = true;
      if (this.userId) this.socket.emit('joinUserRoom', this.userId);
      this.emit('connect', null);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.emit('disconnect', null);
    });

    this.socket.on('quizAdded', (data) => {
      this.emit('quizAdded', data);
    });

    this.socket.on('emotionUpdate', (data) => {
      this.emit('emotionUpdate', data);
    });

    this.socket.on('recommendation', (data) => {
       this.emit('recommendation', data);
    });

    this.socket.on('quizResult', (data) => {
        this.emit('quizResult', data);
    });

    this.socket.on('error', (error) => {
      this.emit('error', error);
    });
  }

  submitQuizAnswer(quizId, userAnswer) {
    if (this.socket && this.isConnected) {
       this.socket.emit('submitQuizAnswer', { quizId, userAnswer, userId: this.userId });
    }
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, []);
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try { handler(data); } catch (e) { console.error(`Error in ${event}:`, e); }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.userId = null;
    }
  }
}

const socketService = new SocketService();
export default socketService;
