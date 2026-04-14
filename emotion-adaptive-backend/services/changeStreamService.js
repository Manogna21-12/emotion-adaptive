const mongoose = require('mongoose');
const EmotionLog = require('../models/EmotionLog');
const socketService = require('./socketService');

class ChangeStreamService {
  constructor() {
    this.changeStream = null;
    this.isWatching = false;
  }

  async startWatching() {
    try {
      if (this.isWatching) {
        console.log('📡 Change stream already watching');
        return;
      }

      console.log('👀 Starting MongoDB Change Stream watcher...');

      // Watch the emotions_log collection for changes
      this.changeStream = EmotionLog.watch([
        {
          $match: {
            operationType: 'insert',
            'fullDocument.emotion': { $exists: true }
          }
        }
      ]);

      this.isWatching = true;

      this.changeStream.on('change', (change) => {
        this.handleEmotionChange(change);
      });

      this.changeStream.on('error', (error) => {
        console.error('❌ Change Stream Error:', error);
        this.handleStreamError(error);
      });

      this.changeStream.on('close', () => {
        console.log('🔌 Change Stream closed');
        this.isWatching = false;
        // Attempt to restart after delay
        setTimeout(() => this.startWatching(), 5000);
      });

      console.log('✅ MongoDB Change Stream watcher started successfully');
      
    } catch (error) {
      console.error('❌ Error starting change stream:', error);
      this.handleStreamError(error);
    }
  }

  handleEmotionChange(change) {
    try {
      const fullDocument = change.fullDocument;
      
      if (!fullDocument || !fullDocument.userId || !fullDocument.emotion) {
        return;
      }

      const { userId, emotion, createdAt } = fullDocument;
      
      console.log(`🎭 Emotion Change Detected: User ${userId} -> ${emotion} at ${createdAt}`);

      // Emit real-time update to connected clients
      if (socketService.isUserConnected(userId)) {
        socketService.emitEmotionChange(userId, {
          userId,
          emotion,
          createdAt,
          changeId: change._id
        });

        console.log(`📡 Real-time update sent to user ${userId}`);
      } else {
        console.log(`⚠️ User ${userId} not connected, skipping real-time update`);
      }

      // Emit to admin dashboard for monitoring
      socketService.emitToAdmin('emotion_change_detected', {
        userId,
        emotion,
        createdAt,
        changeId: change._id
      });

    } catch (error) {
      console.error('❌ Error handling emotion change:', error);
    }
  }

  handleStreamError(error) {
    console.error('❌ Change Stream Error:', error);
    
    // Implement retry logic
    setTimeout(() => {
      console.log('🔄 Attempting to restart change stream...');
      this.restart();
    }, 5000);
  }

  async stopWatching() {
    try {
      if (this.changeStream) {
        await this.changeStream.close();
        this.changeStream = null;
      }
      this.isWatching = false;
      console.log('🛑 MongoDB Change Stream watcher stopped');
    } catch (error) {
      console.error('❌ Error stopping change stream:', error);
    }
  }

  async restart() {
    try {
      await this.stopWatching();
      setTimeout(() => this.startWatching(), 2000);
    } catch (error) {
      console.error('❌ Error restarting change stream:', error);
    }
  }

  // Get stream status
  getStatus() {
    return {
      isWatching: this.isWatching,
      hasChangeStream: !!this.changeStream
    };
  }

  // Manual trigger for testing
  async testChangeStream() {
    try {
      console.log('🧪 Testing change stream...');
      
      // Create a test emotion log
      const testEmotion = new EmotionLog({
        userId: new mongoose.Types.ObjectId(), // Random user ID for testing
        emotion: 'happy',
        createdAt: new Date()
      });

      await testEmotion.save();
      
      console.log('✅ Test emotion log created, change stream should detect it');
      
    } catch (error) {
      console.error('❌ Error testing change stream:', error);
    }
  }
}

module.exports = new ChangeStreamService();
