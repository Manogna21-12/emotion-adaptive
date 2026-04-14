import { apiService, retryApiCall, checkBackendConnection } from './apiService';

class HeartbeatService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.userId = null;
    this.heartbeatInterval = 60000; // 60 seconds
    this.retryCount = 0;
    this.maxRetries = 3;
    this.lastHeartbeat = null;
    this.connectionStatus = 'disconnected';
    this.callbacks = {
      onHeartbeatSuccess: null,
      onHeartbeatError: null,
      onConnectionChange: null,
    };
  }

  // Initialize heartbeat service
  async initialize(userId, options = {}) {
    this.userId = userId;
    this.heartbeatInterval = options.interval || 60000;
    this.maxRetries = options.maxRetries || 3;
    
    console.log(`💓 Initializing heartbeat service for user: ${userId}`);
    console.log(`⏰ Heartbeat interval: ${this.heartbeatInterval}ms`);
    console.log(`🔄 Max retries: ${this.maxRetries}`);

    // Check backend connection first
    const isConnected = await checkBackendConnection();
    this.connectionStatus = isConnected ? 'connected' : 'disconnected';
    
    if (this.callbacks.onConnectionChange) {
      this.callbacks.onConnectionChange(this.connectionStatus);
    }

    if (isConnected) {
      this.start();
    } else {
      console.log('⚠️ Backend not connected, will retry...');
      this.scheduleConnectionRetry();
    }
  }

  // Start heartbeat service
  start() {
    if (this.isRunning) {
      console.log('⚠️ Heartbeat service is already running');
      return;
    }

    if (!this.userId) {
      console.error('❌ Cannot start heartbeat: No userId provided');
      return;
    }

    console.log('🚀 Starting heartbeat service...');
    this.isRunning = true;
    this.retryCount = 0;

    // Send first heartbeat immediately
    this.sendHeartbeat();

    // Schedule regular heartbeats
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);

    console.log(`✅ Heartbeat service started with ${this.heartbeatInterval}ms interval`);
  }

  // Stop heartbeat service
  stop() {
    console.log('🛑 Stopping heartbeat service...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    this.retryCount = 0;
    console.log('✅ Heartbeat service stopped');
  }

  // Send heartbeat with retry mechanism
  async sendHeartbeat() {
    if (!this.userId) {
      console.error('❌ Cannot send heartbeat: No userId provided');
      return;
    }

    const timestamp = new Date().toISOString();
    console.log(`💓 [${timestamp}] Sending heartbeat for user: ${this.userId}`);

    try {
      // Use retry mechanism for heartbeat
      const result = await retryApiCall(
        () => apiService.sendHeartbeat(this.userId),
        this.maxRetries,
        1000
      );

      this.lastHeartbeat = new Date();
      this.retryCount = 0;
      
      if (this.connectionStatus !== 'connected') {
        this.connectionStatus = 'connected';
        if (this.callbacks.onConnectionChange) {
          this.callbacks.onConnectionChange('connected');
        }
      }

      console.log(`✅ [${timestamp}] Heartbeat successful:`, result);
      
      if (this.callbacks.onHeartbeatSuccess) {
        this.callbacks.onHeartbeatSuccess(result);
      }

    } catch (error) {
      this.retryCount++;
      console.error(`❌ [${timestamp}] Heartbeat failed (attempt ${this.retryCount}):`, error.message);

      if (this.connectionStatus !== 'error') {
        this.connectionStatus = 'error';
        if (this.callbacks.onConnectionChange) {
          this.callbacks.onConnectionChange('error');
        }
      }

      if (this.callbacks.onHeartbeatError) {
        this.callbacks.onHeartbeatError(error, this.retryCount);
      }

      // If max retries reached, stop and schedule connection retry
      if (this.retryCount >= this.maxRetries) {
        console.error(`💔 Max retries reached (${this.maxRetries}), stopping heartbeat service`);
        this.stop();
        this.scheduleConnectionRetry();
      }
    }
  }

  // Schedule connection retry
  scheduleConnectionRetry() {
    const retryDelay = Math.min(30000, 5000 * this.retryCount); // Max 30 seconds
    console.log(`🔄 Scheduling connection retry in ${retryDelay}ms...`);
    
    setTimeout(async () => {
      console.log('🔄 Attempting to reconnect...');
      const isConnected = await checkBackendConnection();
      
      if (isConnected) {
        console.log('✅ Reconnected successfully');
        this.connectionStatus = 'connected';
        if (this.callbacks.onConnectionChange) {
          this.callbacks.onConnectionChange('connected');
        }
        this.start();
      } else {
        console.log('❌ Reconnection failed, will retry again...');
        this.scheduleConnectionRetry();
      }
    }, retryDelay);
  }

  // Update user ID
  updateUserId(newUserId) {
    console.log(`🔄 Updating user ID from ${this.userId} to ${newUserId}`);
    this.userId = newUserId;
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  // Update heartbeat interval
  updateInterval(newInterval) {
    console.log(`🔄 Updating heartbeat interval from ${this.heartbeatInterval}ms to ${newInterval}ms`);
    this.heartbeatInterval = newInterval;
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      userId: this.userId,
      connectionStatus: this.connectionStatus,
      lastHeartbeat: this.lastHeartbeat,
      retryCount: this.retryCount,
      heartbeatInterval: this.heartbeatInterval,
      maxRetries: this.maxRetries,
    };
  }

  // Set callbacks
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Get time since last heartbeat
  getTimeSinceLastHeartbeat() {
    if (!this.lastHeartbeat) return null;
    return Date.now() - this.lastHeartbeat.getTime();
  }

  // Check if heartbeat is overdue
  isHeartbeatOverdue() {
    const timeSinceLast = this.getTimeSinceLastHeartbeat();
    return timeSinceLast > this.heartbeatInterval * 2; // Overdue if 2x interval has passed
  }
}

// Create singleton instance
const heartbeatService = new HeartbeatService();

export default heartbeatService;
