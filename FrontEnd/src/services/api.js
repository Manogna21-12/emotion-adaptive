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

  downloadReportFile: async (reportId) => {
    const response = await http.get(`/reports/download/${reportId}`, {
      responseType: 'blob'
    });
    return response;
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

export const smartReaderApi = {
  getConcepts: async () => {
    const response = await http.get("/smart-reader");
    return response.data;
  },
  getStats: async (userId, conceptId = null) => {
    const params = { user_id: userId };
    if (conceptId) params.concept_id = conceptId;
    const response = await http.get("/smart-reader/stats", { params });
    return response.data;
  },
  trackEmotion: async (payload) => {
    const response = await http.post("/smart-reader/track-emotion", payload);
    return response.data;
  },
  getLearningStats: async (userId) => {
    const response = await http.get("/smart-reader/learning-stats", { params: { user_id: userId } });
    return response.data;
  }
};

export const adaptiveQuizApi = {
  /** Fetch questions by course/lesson/difficulty */
  getQuestions: async (courseId = "default", difficulty = "medium", { moduleId, lessonId, topic, limit } = {}) => {
    const params = { course_id: courseId, difficulty };
    if (moduleId) params.module_id = moduleId;
    if (lessonId) params.lesson_id = lessonId;
    if (topic) params.topic = topic;
    if (limit) params.limit = limit;
    const response = await http.get("/adaptive-quiz/questions", { params });
    return response.data;
  },
  /** Submit an answer attempt */
  submitAnswer: async (payload) => {
    const response = await http.post("/adaptive-quiz/submit", payload);
    return response.data;
  },
  /** Get user quiz stats */
  getStats: async (userId) => {
    const response = await http.get("/adaptive-quiz/stats", { params: { user_id: userId } });
    return response.data;
  },
};

