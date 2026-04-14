import { http } from "./http";

const API_BASE_URL = `/learning`; // FastAPI learning module endpoint

export const learningApi = {
  // Courses
  getCourses: async () => {
    const response = await http.get(`${API_BASE_URL}/courses`);
    return response.data; // { courses: [...] }
  },
  
  // Modules
  getModules: async (courseId) => {
    const response = await http.get(`${API_BASE_URL}/modules/${courseId}`);
    return response.data; // { modules: [...] }
  },

  // Lessons
  getLessons: async (moduleId) => {
    const response = await http.get(`${API_BASE_URL}/lessons/${moduleId}`);
    return response.data; // { lessons: [...] }
  },

  // Videos
  getVideo: async (lessonId) => {
    const response = await http.get(`${API_BASE_URL}/videos/${lessonId}`);
    return response.data;
  },

  // Emotion Analysis & Logging
  analyzeEmotion: async (base64Image) => {
    const response = await http.post(`${API_BASE_URL}/analyze-emotion`, {
      image: base64Image
    });
    return response.data; // { emotion, focus }
  },

  logEmotion: async (userId, lessonId, emotion, focus) => {
    const response = await http.post(`${API_BASE_URL}/emotion-log`, {
      user_id: userId,
      lesson_id: lessonId,
      emotion,
      focus
    });
    return response.data;
  },

  // AI Suggestion
  recommendNext: async (lessonId, userId) => {
    const response = await http.get(`${API_BASE_URL}/recommend-next/${lessonId}`, {
      params: { user_id: userId }
    });
    return response.data; // { suggestion, action }
  },

  getAdaptiveContent: async (userId) => {
    const response = await http.get(`${API_BASE_URL}/adaptive-content/${userId}`);
    return response.data;
  },

  getTimeline: async (userId) => {
    const response = await http.get(`${API_BASE_URL}/timeline/${userId}`);
    return response.data;
  },

  // Progress Data
  getEmotionDistribution: async (userId) => {
    const response = await http.get(`${API_BASE_URL}/progress/emotion-distribution/${userId}`);
    return response.data;
  },
  getWeeklyActivity: async (userId) => {
    const response = await http.get(`${API_BASE_URL}/progress/weekly/${userId}`);
    return response.data;
  },
  getConsistencyScore: async (userId) => {
    const response = await http.get(`${API_BASE_URL}/progress/consistency/${userId}`);
    return response.data;
  },
  getPeakFocusTime: async (userId) => {
    const response = await http.get(`${API_BASE_URL}/progress/peak-focus/${userId}`);
    return response.data;
  },
  getEmotionTrend: async (userId) => {
    const response = await http.get(`${API_BASE_URL}/progress/emotion-trend/${userId}`);
    return response.data;
  },
  getProgress: async (userId) => {
    const response = await http.get(`${API_BASE_URL}/progress/${userId}`);
    return response.data;
  },

  // Session Tracking
  startSession: async (userId, courseId, lessonId) => {
    const response = await http.post(`${API_BASE_URL}/start-session`, {
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId
    });
    return response.data;
  },

  endSession: async (sessionId, duration) => {
    const response = await http.post(`${API_BASE_URL}/end-session`, {
      session_id: sessionId,
      duration_minutes: duration
    });
    return response.data;
  },

  submitFeedback: async (feedbackData) => {
    const response = await http.post(`${API_BASE_URL}/feedback`, feedbackData);
    return response.data;
  }
};

export const dashboardApi = {
  getUser: async (userId) => {
    const response = await http.get(`/user/${userId}`);
    return response.data; // { id, name }
  },
  getSummary: async (userId) => {
    const response = await http.get(`/dashboard/summary/${userId}`);
    return response.data;
  },
  getEmotionImpact: async (userId) => {
    const response = await http.get(`/dashboard/emotion-impact/${userId}`);
    return response.data;
  },
  getEmotions: async (userId) => {
    const response = await http.get(`/dashboard/emotions/${userId}`);
    return response.data;
  },
  getTimeline: async (userId) => {
    const response = await http.get(`/dashboard/timeline/${userId}`);
    return response.data;
  },
  getLiveEmotion: async (userId) => {
    const response = await http.get(`/live-emotion/${userId}`);
    return response.data;
  },
  getNotifications: async (userId) => {
    const response = await http.get(`/notifications/${userId}`);
    return response.data;
  },
  getDashboardStats: async (userId) => {
    const response = await http.get(`/api/dashboard-stats`, { params: { user_id: userId } });
    return response.data;
  },
  getEmotionLogs: async (userId) => {
    const response = await http.get(`/api/emotion_logs`, { params: { user_id: userId } });
    return response.data;
  },
  getUserProgress: async (userId) => {
    const response = await http.get(`/api/user_progress`, { params: { user_id: userId } });
    return response.data;
  },
};

export const progressApi = {
  getProgress: async (userId) => {
    const response = await http.get(`/progress/${userId}`);
    return response.data;
  },
  recomputeProgress: async (userId) => {
    const response = await http.post(`/progress`, { user_id: userId, recompute: true });
    return response.data;
  },
};

// ─── Smart Reader API ────────────────────────────────────────────────────────
export const smartReaderApi = {
  getArticles: async () => {
    const response = await http.get('/reader/articles');
    return response.data;
  },
  trackEmotion: async (data) => {
    const response = await http.post('/reader/track-emotion', data);
    return response.data;
  },
  trackReaderEmotion: async (payload) => {
    const response = await http.post('/reader/api/reader-emotion', payload);
    return response.data;
  },
  getStats: async (userId, documentId) => {
    const response = await http.get(`/reader/stats/${userId}/${documentId}`);
    return response.data;
  },
  getReaderStats: async (userId, documentId) => {
    const response = await http.get(`/reader/api/reader-stats`, {
        params: { user_id: userId, document_id: documentId }
    });
    return response.data;
  },
  seed: async () => {
    const response = await http.post('/reader/seed');
    return response.data;
  }
};

export const statsApi = {
  getLearningStats: async (userId) => {
    const response = await http.get(`/learning/learning-stats/${userId}`);
    return response.data;
  },
  getDashboardSummary: async (userId) => {
    const response = await http.get(`/dashboard/summary/${userId}`);
    return response.data;
  }
};

// Helper to convert Google Drive sharing links to embeddable preview links
export const convertDriveLink = (url) => {
  if (!url) return "";
  if (url.includes('drive.google.com')) {
    if (url.includes('/view')) {
      return url.replace('/view', '/preview');
    }
    if (url.includes('id=')) {
      const id = url.split('id=')[1].split('&')[0];
      return `https://drive.google.com/file/d/${id}/preview`;
    }
  }
  return url;
};

// ─── Streak & Daily Time Tracking API ─────────────────────────────────────────
export const streakApi = {
  /** Full streak payload (current streak, today minutes, history) */
  getStreak: async (userId) => {
    const response = await http.get(`/streak/${userId}`);
    return response.data;
  },

  /**
   * Heartbeat – call every 60 s while user is on-site.
   * @param {string} userId
   * @param {number} minutes – usually 1 (one minute passed)
   */
  heartbeat: async (userId, minutes = 1) => {
    const response = await http.post(`/streak/heartbeat`, {
      user_id: userId,
      minutes,
      activity_type: "heartbeat",
    });
    return response.data;
  },

  /**
   * Log a valid learning activity (quiz, 5+ min video, lesson completion).
   * Call this when the user finishes a quiz or watches >= 5 min of a video.
   * @param {string} userId
   * @param {"quiz"|"video"|"lesson"} activityType
   * @param {number} minutesWatched
   */
  logActivity: async (userId, activityType = "lesson", minutesWatched = 0) => {
    const response = await http.post(`/streak/activity`, {
      user_id: userId,
      activity_type: activityType,
      minutes_watched: minutesWatched,
    });
    return response.data;
  },

  /** Weekly or monthly history for analytics graphs */
  getHistory: async (userId, period = "weekly") => {
    const response = await http.get(`/streak/history/${userId}`, {
      params: { period },
    });
    return response.data;
  },
};

// ─── Notifications API ────────────────────────────────────────────────────────
export const notificationsApi = {
  getNotifications: async (userId, limit = 20) => {
    const response = await http.get(`/notifications/${userId}`, {
      params: { limit },
    });
    return response.data;
  },
  /** Returns updated notification list from server */
  markAsRead: async (notificationId, userId) => {
    console.log("[notificationsApi] PATCH /api/notifications/:id", notificationId, userId);
    const response = await http.patch(
      `/api/notifications/${notificationId}`,
      {},
      { params: { user_id: userId } }
    );
    return response.data;
  },
  markAllAsRead: async (userId) => {
    console.log("[notificationsApi] PATCH /api/notifications/read-all", userId);
    const response = await http.patch(`/api/notifications/read-all`, {}, {
      params: { user_id: userId },
    });
    return response.data;
  },
  deleteNotification: async (notificationId, userId) => {
    console.log("[notificationsApi] DELETE /api/notifications/:id", notificationId, userId);
    const response = await http.delete(`/api/notifications/${notificationId}`, {
      params: { user_id: userId },
    });
    return response.data;
  },
  clearAll: async (userId) => {
    console.log("[notificationsApi] DELETE /api/notifications/all", userId);
    const response = await http.delete(`/api/notifications/all`, {
      params: { user_id: userId },
    });
    return response.data;
  },
};

export const adaptiveQuizApi = {
  getQuestion: async (params) => {
    const response = await http.get('/api/adaptive/quiz', { params });
    return response.data;
  },
  submitAttempt: async (payload) => {
    const response = await http.post('/api/adaptive/quiz-attempt', payload);
    return response.data;
  }
};

export const quizzesApi = {
  getQuizzes: async () => {
    console.log("[quizzesApi] → GET /api/quizzes");
    const response = await http.get("/api/quizzes");
    console.log("[quizzesApi] ←", response.status, response.data);
    return response.data;
  },
  /** POST { userId, score, totalQuestions, timestamp? } */
  submitQuizResult: async (payload) => {
    console.log("[quizzesApi] → POST /api/quiz-result", payload);
    const response = await http.post("/api/quiz-result", {
      userId: payload.userId,
      score: payload.score,
      totalQuestions: payload.totalQuestions,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    });
    console.log("[quizzesApi] ←", response.status, response.data);
    return response.data;
  },
};
