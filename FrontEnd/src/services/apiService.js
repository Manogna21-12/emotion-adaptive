import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CORS credentials
});

// Request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    const timestamp = new Date().toISOString();
    console.log(`🚀 [${timestamp}] Frontend API Request:`, {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
      params: config.params,
    });
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging and error handling
apiClient.interceptors.response.use(
  (response) => {
    const timestamp = new Date().toISOString();
    console.log(`✅ [${timestamp}] Frontend API Response:`, {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  (error) => {
    const timestamp = new Date().toISOString();
    console.error(`❌ [${timestamp}] Frontend API Error:`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data,
    });

    // Handle specific error cases
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Backend server is not reachable. Please check the API configuration.');
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timed out');
    } else if (error.response?.status === 403) {
      console.error('🚫 CORS or authentication issue');
    } else if (error.response?.status === 404) {
      console.error('🔍 Endpoint not found');
    }

    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Health check
  async healthCheck() {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  // Test endpoint
  async testConnection() {
    try {
      const response = await apiClient.get('/api/test');
      return response.data;
    } catch (error) {
      console.error('Test connection failed:', error);
      throw error;
    }
  },

  // Heartbeat API - CRITICAL FUNCTION
  async sendHeartbeat(userId) {
    try {
      const timestamp = new Date().toISOString();
      console.log(`💓 [${timestamp}] Sending heartbeat for user: ${userId}`);
      
      const response = await apiClient.post('/streak/heartbeat', {
        userId,
        timestamp: timestamp,
        source: 'frontend'
      });
      
      console.log(`✅ [${timestamp}] Heartbeat successful:`, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Heartbeat failed:', error);
      throw error;
    }
  },

  // Get emotion data
  async getEmotion(userId) {
    try {
      const response = await apiClient.get(`/api/emotion/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get emotion failed:', error);
      throw error;
    }
  },

  // Log emotion
  async logEmotion(userId, emotion, metadata = {}) {
    try {
      const response = await apiClient.post('/api/emotion', {
        userId,
        emotion,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          source: 'frontend'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Log emotion failed:', error);
      throw error;
    }
  },

  // Get recommendations
  async getRecommendations(userId) {
    try {
      const response = await apiClient.get(`/api/recommendation/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get recommendations failed:', error);
      throw error;
    }
  },

  // Get emotion history
  async getEmotionHistory(userId, limit = 10) {
    try {
      const response = await apiClient.get(`/api/emotion/${userId}/history`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Get emotion history failed:', error);
      throw error;
    }
  }
};

// Retry mechanism utility
export const retryApiCall = async (apiCall, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      console.log(`✅ API call successful on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ API call failed on attempt ${attempt}/${maxRetries}:`, error.message);
      
      if (attempt < maxRetries) {
        const backoffDelay = delay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`🔄 Retrying in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  console.error(`❌ API call failed after ${maxRetries} attempts`);
  throw lastError;
};

// Connection status checker
export const checkBackendConnection = async () => {
  try {
    console.log('🔍 Checking backend connection...');
    await apiService.healthCheck();
    console.log('✅ Backend connection successful');
    return true;
  } catch (error) {
    console.error('❌ Backend connection failed:', error.message);
    return false;
  }
};

export default apiService;
