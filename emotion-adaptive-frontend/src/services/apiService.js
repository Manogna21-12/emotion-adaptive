import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async getRecommendation(userId) {
    try {
      const response = await this.api.get(`/recommendation/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting recommendation:', error);
      throw error;
    }
  }

  async logEmotion(userId, emotion) {
    try {
      const response = await this.api.post('/emotion', { userId, emotion });
      return response.data;
    } catch (error) {
      console.error('Error logging emotion:', error);
      throw error;
    }
  }

  async getLatestEmotion(userId) {
    try {
      const response = await this.api.get(`/emotion/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching emotion:', error);
      throw error;
    }
  }

  async getQuizzes(params = {}) {
    try {
      const response = await this.api.get('/quizzes', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting quizzes:', error);
      throw error;
    }
  }

  async search(query) {
    try {
      const response = await this.api.get(`/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Error searching:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

const apiService = new ApiService();
export default apiService;
