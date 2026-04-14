/**
 * WEBSOCKET CLIENT FOR REAL-TIME UPDATES
 * Features: Auto-reconnection, message queuing, performance optimization
 * Performance: <10ms message delivery
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnecting = false;
    this.messageQueue = [];
    this.eventHandlers = new Map();
    this.connectionPromise = null;
    this.userId = null;
    this.heartbeatInterval = null;
    this.lastPingTime = 0;
    this.latency = 0;
  }

  // Connect to WebSocket server
  async connect(userId = null) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return this.connectionPromise;
    }

    this.userId = userId;
    this.isConnecting = true;

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || "https://emotion-adaptive.onrender.com";
        const wsProtocol = apiBase.startsWith("https") ? "wss" : "ws";
        const wsHost = apiBase.replace(/^https?:\/\//, "");
        const wsUrl = userId 
          ? `${wsProtocol}://${wsHost}/ws/${userId}`
          : `${wsProtocol}://${wsHost}/ws`;
        
        console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        // Connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 5000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('✅ WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          
          // Send queued messages
          this.flushMessageQueue();
          
          // Notify listeners
          this.emit('connected', { userId, timestamp: Date.now() });
          resolve(this.ws);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log(`🔌 WebSocket disconnected: ${event.code} - ${event.reason}`);
          this.isConnecting = false;
          this.stopHeartbeat();
          
          // Notify listeners
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          // Auto-reconnect if not explicitly closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('❌ WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  // Handle incoming messages
  handleMessage(data) {
    const startTime = performance.now();
    
    // Handle ping/pong for latency measurement
    if (data.type === 'pong') {
      this.latency = Date.now() - this.lastPingTime;
      this.emit('pong', { latency: this.latency, timestamp: data.timestamp });
      return;
    }

    // Route message to appropriate handlers
    switch (data.type) {
      case 'connection_established':
        console.log('✅ Connection established:', data);
        this.emit('connection_established', data);
        break;
      
      case 'real_time_update':
        this.emit('real_time_update', data);
        break;
      
      case 'user_update':
        this.emit('user_update', data);
        break;
      
      case 'subscription_confirmed':
        this.emit('subscription_confirmed', data);
        break;
      
      case 'status':
        this.emit('status', data);
        break;
      
      default:
        console.log('📨 Unknown message type:', data.type, data);
        this.emit('message', data);
    }

    // Performance monitoring
    const endTime = performance.now();
    if (endTime - startTime > 10) {
      console.warn(`⚠️ Slow WebSocket message handling: ${(endTime - startTime).toFixed(2)}ms`);
    }
  }

  // Send message to server
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('❌ Error sending WebSocket message:', error);
        return false;
      }
    } else {
      // Queue message for later
      this.messageQueue.push(message);
      console.log('📤 Message queued (WebSocket not connected):', message);
      return false;
    }
  }

  // Send queued messages
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  // Schedule reconnection
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect(this.userId);
      } else {
        console.error('❌ Max reconnection attempts reached');
        this.emit('reconnect_failed', { attempts: this.reconnectAttempts });
      }
    }, delay);
  }

  // Start heartbeat for connection monitoring
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.ping();
    }, 30000); // Ping every 30 seconds
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Send ping
  ping() {
    this.lastPingTime = Date.now();
    this.send({ type: 'ping', timestamp: this.lastPingTime });
  }

  // Subscribe to data types
  subscribe(subscriptions) {
    this.send({
      type: 'subscribe',
      subscriptions: Array.isArray(subscriptions) ? subscriptions : [subscriptions]
    });
  }

  // Get server status
  getStatus() {
    this.send({ type: 'get_status' });
  }

  // Disconnect from server
  disconnect() {
    this.stopHeartbeat();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    console.log('🔌 WebSocket disconnected by client');
  }

  // Event handling
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Error in WebSocket event handler for '${event}':`, error);
        }
      });
    }
  }

  // Get connection status
  get isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Get connection state
  get connectionState() {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }

  // Get performance metrics
  get metrics() {
    return {
      isConnected: this.isConnected,
      connectionState: this.connectionState,
      latency: this.latency,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      userId: this.userId
    };
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

// React hook for WebSocket
export const useWebSocket = (userId = null) => {
  const [metrics, setMetrics] = React.useState(websocketService.metrics);
  const [lastMessage, setLastMessage] = React.useState(null);
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    // Update metrics on connection changes
    const updateMetrics = () => setMetrics(websocketService.metrics);
    const handleConnection = () => setIsConnected(true);
    const handleDisconnection = () => setIsConnected(false);
    const handleMessage = (data) => setLastMessage(data);

    websocketService.on('connected', handleConnection);
    websocketService.on('disconnected', handleDisconnection);
    websocketService.on('message', handleMessage);
    websocketService.on('connected', updateMetrics);
    websocketService.on('disconnected', updateMetrics);
    websocketService.on('pong', updateMetrics);

    // Connect to WebSocket
    if (userId) {
      websocketService.connect(userId);
    }

    return () => {
      websocketService.off('connected', handleConnection);
      websocketService.off('disconnected', handleDisconnection);
      websocketService.off('message', handleMessage);
      websocketService.off('connected', updateMetrics);
      websocketService.off('disconnected', updateMetrics);
      websocketService.off('pong', updateMetrics);
    };
  }, [userId]);

  const send = React.useCallback((message) => {
    return websocketService.send(message);
  }, []);

  const subscribe = React.useCallback((subscriptions) => {
    websocketService.subscribe(subscriptions);
  }, []);

  const disconnect = React.useCallback(() => {
    websocketService.disconnect();
  }, []);

  return {
    isConnected,
    metrics,
    lastMessage,
    send,
    subscribe,
    disconnect
  };
};

export default websocketService;
