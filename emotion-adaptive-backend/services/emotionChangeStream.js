const EmotionLog = require('../models/EmotionLog');

class EmotionChangeStream {
  constructor(io) {
    this.io = io;
    this.changeStream = null;
    this.isWatching = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Start watching emotion changes
  start() {
    if (this.isWatching) {
      console.log('📊 Emotion Change Stream is already watching');
      return;
    }

    console.log('👀 Starting Emotion Change Stream...');
    
    try {
      // Setup Change Stream with pipeline for better filtering
      this.changeStream = EmotionLog.watch([
        {
          $match: {
            operationType: 'insert',
            'fullDocument.emotion': { $exists: true },
            'fullDocument.userId': { $exists: true }
          }
        }
      ]);

      this.setupEventHandlers();
      this.isWatching = true;
      this.reconnectAttempts = 0;
      
      console.log('✅ Emotion Change Stream started successfully');
      
    } catch (error) {
      console.error('❌ Error starting Emotion Change Stream:', error);
      this.handleReconnect();
    }
  }

  // Setup event handlers for the change stream
  setupEventHandlers() {
    this.changeStream.on('change', (change) => {
      this.handleEmotionChange(change);
    });

    this.changeStream.on('error', (error) => {
      console.error('❌ Emotion Change Stream Error:', error);
      this.handleReconnect();
    });

    this.changeStream.on('close', () => {
      console.log('🔌 Emotion Change Stream closed');
      this.handleReconnect();
    });
  }

  // Handle emotion change from Change Stream
  handleEmotionChange(change) {
    try {
      const fullDocument = change.fullDocument;
      
      if (!fullDocument || !fullDocument.userId || !fullDocument.emotion) {
        console.log('⚠️ Invalid emotion change event:', change);
        return;
      }

      console.log(`📊 Real-time emotion change detected: ${fullDocument.emotion} for user ${fullDocument.userId}`);
      
      // Get display data for the emotion
      const emotionLog = new EmotionLog(fullDocument);
      const displayData = emotionLog.getDisplayData();
      
      // Emit to all connected clients
      this.io.emit('emotionUpdate', {
        userId: fullDocument.userId,
        emotion: fullDocument.emotion,
        displayData: displayData,
        timestamp: fullDocument.createdAt,
        changeId: change._id
      });

      // Also emit to specific user room if they're connected
      this.io.to(`user_${fullDocument.userId}`).emit('userEmotionUpdate', {
        emotion: fullDocument.emotion,
        displayData: displayData,
        timestamp: fullDocument.createdAt
      });

      console.log('📡 Real-time emotion update sent to all clients');
      
    } catch (error) {
      console.error('❌ Error handling emotion change:', error);
    }
  }

  // Handle reconnection logic
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached for Emotion Change Stream');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    
    console.log(`🔄 Reconnecting Emotion Change Stream in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.cleanup();
      this.start();
    }, delay);
  }

  // Stop watching emotion changes
  stop() {
    console.log('🛑 Stopping Emotion Change Stream...');
    
    this.cleanup();
    this.isWatching = false;
  }

  // Cleanup resources
  cleanup() {
    if (this.changeStream) {
      this.changeStream.close();
      this.changeStream = null;
    }
  }

  // Get status
  getStatus() {
    return {
      isWatching: this.isWatching,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

module.exports = EmotionChangeStream;
