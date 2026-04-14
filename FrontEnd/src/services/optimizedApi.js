/**
 * ULTRA-OPTIMIZED API CLIENT
 * Features: React Query integration, optimistic updates, caching, batch requests
 * Performance: <100ms perceived latency
 */

import axios from "axios";

// Optimized axios configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  timeout: 5000, // 5 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for performance logging
apiClient.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: performance.now() };
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for performance monitoring
apiClient.interceptors.response.use(
  (response) => {
    const endTime = performance.now();
    const duration = endTime - response.config.metadata.startTime;
    
    if (duration > 100) {
      console.warn(`⚠️ Slow API: ${response.config.url} took ${duration.toFixed(2)}ms`);
    } else {
      console.log(`✅ Fast API: ${response.config.url} took ${duration.toFixed(2)}ms`);
    }
    
    response.config.metadata = { duration };
    return response;
  },
  (error) => {
    console.error("❌ Response Error:", error);
    return Promise.reject(error);
  }
);

// Optimized API functions with caching keys
export const apiKeys = {
  dashboard: (userId) => ["dashboard", userId],
  dashboardSummary: (userId) => ["dashboard", "summary", userId],
  dashboardEmotions: (userId) => ["dashboard", "emotions", userId],
  dashboardTimeline: (userId) => ["dashboard", "timeline", userId],
  progress: (userId) => ["progress", userId],
  user: (userId) => ["user", userId],
};

// Optimized API calls
export const optimizedApi = {
  // Authentication
  login: async (credentials) => {
    const response = await apiClient.post("/login", credentials);
    return response.data;
  },

  getUser: async (userId) => {
    const response = await apiClient.get(`/auth/me?user_id=${userId}`);
    return response.data;
  },

  // Dashboard APIs - Optimized for instant loading
  getDashboardSummary: async (userId) => {
    const response = await apiClient.get(`/dashboard/summary/${userId}`);
    return response.data;
  },

  getDashboardEmotions: async (userId) => {
    const response = await apiClient.get(`/dashboard/emotions/${userId}`);
    return response.data;
  },

  getDashboardTimeline: async (userId) => {
    const response = await apiClient.get(`/dashboard/timeline/${userId}`);
    return response.data;
  },

  // Progress APIs
  getProgress: async (userId) => {
    const response = await apiClient.get(`/progress/${userId}`);
    return response.data;
  },



  // Batch API - Single request for multiple endpoints
  batchRequest: async (requests) => {
    const response = await apiClient.post("/batch", requests);
    return response.data;
  },

  // Optimized batch dashboard data
  getBatchDashboardData: async (userId) => {
    const requests = [
      { endpoint: "dashboard/summary", params: { user_id: userId } },
      { endpoint: "dashboard/emotions", params: { user_id: userId } },
      { endpoint: "progress", params: { user_id: userId } },
    ];
    
    const response = await apiClient.post("/batch", requests);
    return response.data.results;
  },

  // Health check
  health: async () => {
    const response = await apiClient.get("/health");
    return response.data;
  },
};

// LocalStorage cache for instant reload
export const localStorageCache = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const { data, timestamp } = JSON.parse(item);
      const age = Date.now() - timestamp;
      
      // Return if less than 5 minutes old
      if (age < 5 * 60 * 1000) {
        return data;
      }
      
      localStorage.removeItem(key);
      return null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  },

  set: (key, data) => {
    try {
      const item = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error("Cache set error:", error);
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Cache remove error:", error);
    }
  },

  clear: () => {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith("cache_"));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  },
};

// Optimistic update helpers
export const optimisticUpdates = {
  // Update dashboard data instantly
  updateDashboardData: (userId, newData) => {
    const cacheKey = `cache_dashboard_${userId}`;
    const existingData = localStorageCache.get(cacheKey) || {};
    const updatedData = { ...existingData, ...newData };
    localStorageCache.set(cacheKey, updatedData);
    return updatedData;
  },

  // Update progress data instantly
  updateProgressData: (userId, newProgress) => {
    const cacheKey = `cache_progress_${userId}`;
    const existingData = localStorageCache.get(cacheKey) || {};
    const updatedData = { ...existingData, ...newProgress };
    localStorageCache.set(cacheKey, updatedData);
    return updatedData;
  },


};

// Performance utilities
export const performanceUtils = {
  // Debounce function for API calls
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function for API calls
  throttle: (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Measure performance
  measureTime: (name, func) => {
    return async (...args) => {
      const start = performance.now();
      const result = await func(...args);
      const end = performance.now();
      console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
      return result;
    };
  },
};

export default apiClient;
