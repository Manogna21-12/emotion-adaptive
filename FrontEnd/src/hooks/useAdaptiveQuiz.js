import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useAdaptiveQuiz Hook
 * Unified logic for triggering quizzes and frustration breaks based on emotion/focus data.
 * 
 * @param {Object} options
 * @param {string} options.userId
 * @param {string} options.courseId
 * @param {string} options.lessonId
 * @param {number} options.triggerIntervalMS - How often to trigger the quiz (default 2 mins)
 */
export default function useAdaptiveQuiz({ 
  userId, 
  courseId, 
  lessonId, 
  triggerIntervalMS = 120000 // 2 minutes
}) {
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isPausedByEmotion, setIsPausedByEmotion] = useState(false);
  const [pauseCountdown, setPauseCountdown] = useState(120);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [currentEmotion, setCurrentEmotion] = useState("neutral");
  const [currentFocus, setCurrentFocus] = useState(70);

  // Timer for the 2-minute quiz trigger
  const lastTriggerTimeRef = useRef(Date.now());
  const timerIdRef = useRef(null);

  // Frustration break countdown timer
  useEffect(() => {
    let interval;
    if (isPausedByEmotion && pauseCountdown > 0) {
      interval = setInterval(() => {
        setPauseCountdown((prev) => {
          if (prev <= 1) {
            setIsPausedByEmotion(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPausedByEmotion, pauseCountdown]);

  /**
   * Register a new emotion/focus detection.
   * This should be called by the page whenever CameraTracker/Webcam captures a frame.
   */
  // Track if the hook is "active" (tab focused, video playing, etc.)
  const [active, setActive] = useState(true);

  useEffect(() => {
    const onBlur = () => setActive(false);
    const onFocus = () => setActive(true);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  /**
   * Register a new emotion/focus detection.
   * This should be called by the page whenever CameraTracker/Webcam captures a frame.
   */
  const registerDetection = useCallback((emotion, focus) => {
    setCurrentEmotion(emotion);
    setCurrentFocus(focus || 70);
    const now = Date.now();
    
    // Update history
    setEmotionHistory((prev) => {
      const newHistory = [...prev, { emotion, focus, timestamp: now }].slice(-60);
      
      // ── Check for Frustration Break ──
      // Use newHistory instead of the stale state
      const recent = newHistory.slice(-8); 
      const frustratedCount = recent.filter(e => e.emotion === "angry" || e.emotion === "disgust").length;
      
      if (frustratedCount >= 4 && !isPausedByEmotion) {
        setIsPausedByEmotion(true);
        setPauseCountdown(120);
        setIsQuizOpen(false); 
        console.log("[AdaptiveQuiz] Frustration break triggered!");
      }

      return newHistory;
    });

    // ── Check for 2-Minute Quiz Trigger ──
    const timeRemaining = triggerIntervalMS - (now - lastTriggerTimeRef.current);
    
    // Log every ~10s to help the user see it's working
    if (Math.random() < 0.1) {
      console.log(`[AdaptiveQuiz] Next quiz in: ${Math.round(timeRemaining / 1000)}s`);
    }

    if (active && !isQuizOpen && !isPausedByEmotion && (timeRemaining <= 0)) {
      if (emotion !== "no_face") {
        console.log("[AdaptiveQuiz] Triggering quiz modal!");
        setIsQuizOpen(true);
        lastTriggerTimeRef.current = now;
      } else {
        console.log("[AdaptiveQuiz] Quiz ready but NO FACE detected. Skipping till next check.");
      }
    }
  }, [active, isQuizOpen, isPausedByEmotion, triggerIntervalMS]);

  const openQuiz = () => setIsQuizOpen(true);
  const closeQuiz = () => setIsQuizOpen(false);

  return {
    isQuizOpen,
    openQuiz,
    closeQuiz,
    isPausedByEmotion,
    setIsPausedByEmotion,
    pauseCountdown,
    emotionHistory,
    currentEmotion,
    currentFocus,
    registerDetection,
    active
  };
}
