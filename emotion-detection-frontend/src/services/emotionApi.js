import axios from 'axios';

// Create axios instance with default configuration
const api = axios.create({
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// API service for emotion detection
class EmotionApiService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'https://emotion-adaptive.onrender.com';
  }

  // Analyze emotion from image
  async analyzeEmotion(imageFile) {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await api.post(`${this.baseUrl}/analyze`, formData);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Emotion analysis error:', error);
      
      // Handle different error types
      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          error: error.response.data?.error || 'Server error occurred',
          status: error.response.status,
          data: error.response.data,
        };
      } else if (error.request) {
        // Network error
        return {
          success: false,
          error: 'Network error. Please check your connection.',
          code: 'NETWORK_ERROR',
        };
      } else {
        // Other error
        return {
          success: false,
          error: error.message || 'An unexpected error occurred',
          code: 'UNKNOWN_ERROR',
        };
      }
    }
  }

  // Check API health
  async checkHealth() {
    try {
      const response = await api.get(`${this.baseUrl}/`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: 'API is not available',
      };
    }
  }

  // Get API information
  async getApiInfo() {
    try {
      const response = await api.get(`${this.baseUrl}/info`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get API information',
      };
    }
  }

  // Test system
  async testSystem() {
    try {
      const response = await api.get(`${this.baseUrl}/test`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: 'System test failed',
      };
    }
  }
}

// Create singleton instance
const emotionApi = new EmotionApiService();

export default emotionApi;
