import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Coffee,
  Timer,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { adaptiveQuizApi } from "../services/api";

// ─── Difficulty Engine ───────────────────────────────────────────────────────
const FOCUS_MAP = {
  happy: 95,
  neutral: 85,
  surprise: 80,
  sad: 40,
  angry: 30,
  fear: 35,
  disgust: 20,
  no_face: 0,
};

function computeDifficulty(emotionHistory) {
  if (!emotionHistory || emotionHistory.length === 0) return "medium";

  const recent = emotionHistory.slice(-8); // last ~12 seconds of captures

  // Check for frustration / anger → PAUSE (handled separately)
  const frustratedCount = recent.filter(
    (e) => e.emotion === "angry" || e.emotion === "disgust"
  ).length;
  if (frustratedCount >= 3) return "pause";

  // Check for sadness
  const sadCount = recent.filter((e) => e.emotion === "sad").length;
  if (sadCount >= 3) return "easy";

  // Check for sustained high focus (happy + focus > 90)
  const highFocus = recent.filter(
    (e) => e.emotion === "happy" && (e.focus || FOCUS_MAP[e.emotion]) > 90
  );
  if (highFocus.length >= 5) return "hard";

  // Neutral + decent focus → medium
  const avgFocus =
    recent.reduce((sum, e) => sum + (e.focus || FOCUS_MAP[e.emotion] || 70), 0) /
    recent.length;
  if (avgFocus < 50) return "easy";
  if (avgFocus > 85) return "hard";
  return "medium";
}

const MOTIVATIONAL = {
  easy: {
    text: "Take it easy — try this simpler question 👍",
    color: "text-cyan-400",
  },
  medium: {
    text: "You're doing well — here's a balanced challenge 🧠",
    color: "text-brand-400",
  },
  hard: {
    text: "Great focus! Let's try a harder one 💪",
    color: "text-emerald-400",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdaptiveQuizModal({
  isOpen,
  onClose,
  courseId = "default",
  lessonId = "",
  emotion = "neutral",
  focusScore = 70,
  emotionHistory = [],
  userId = "",
}) {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null); // { is_correct, correct_answer, explanation }
  const [difficulty, setDifficulty] = useState("medium");
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  // Pause state
  const [isPaused, setIsPaused] = useState(false);
  const [pauseSeconds, setPauseSeconds] = useState(120);
  const pauseTimerRef = useRef(null);

  // Determine difficulty from emotion history
  useEffect(() => {
    const diff = computeDifficulty(emotionHistory);
    if (diff === "pause") {
      setIsPaused(true);
      setPauseSeconds(120);
    } else {
      setDifficulty(diff);
    }
  }, [emotionHistory]);

  // Pause countdown
  useEffect(() => {
    if (!isPaused) return;
    pauseTimerRef.current = setInterval(() => {
      setPauseSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(pauseTimerRef.current);
          setIsPaused(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(pauseTimerRef.current);
  }, [isPaused]);

  // Fetch questions when modal opens or difficulty changes
  const fetchQuestions = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const data = await adaptiveQuizApi.getQuestions(courseId, difficulty, {
        lessonId,
        limit: 5,
      });
      setQuestions(data || []);
      setCurrentIdx(0);
      setSelectedAnswer(null);
      setSubmitted(false);
      setResult(null);
    } catch (err) {
      console.error("[AdaptiveQuiz] Failed to fetch questions:", err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen, courseId, lessonId, difficulty]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Current question
  const currentQ = questions[currentIdx] || null;

  // Submit answer
  const handleSubmit = async () => {
    if (!selectedAnswer || !currentQ) return;
    setSubmitted(true);

    const isCorrect = selectedAnswer === currentQ.correct_answer;

    try {
      const res = await adaptiveQuizApi.submitAnswer({
        user_id: userId,
        question_id: currentQ.id,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        emotion,
        focus_score: focusScore,
        difficulty,
      });
      setResult(res);
    } catch {
      setResult({
        is_correct: isCorrect,
        correct_answer: currentQ.correct_answer,
        explanation: currentQ.explanation || "",
      });
    }

    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  // Next question
  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
      setSubmitted(false);
      setResult(null);
    } else {
      // Automatically close the quiz when the batch is finished
      onClose();
    }
  };

  if (!isOpen) return null;

  const motivational = MOTIVATIONAL[difficulty] || MOTIVATIONAL.medium;

  return (
    <AnimatePresence>
      <motion.div
        key="quiz-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-lg mx-4"
        >
          {/* ── Pause Screen ── */}
          {isPaused ? (
            <div className="bg-zinc-900 rounded-3xl border border-red-500/30 p-8 text-center shadow-2xl shadow-red-500/10">
              <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <Coffee className="w-10 h-10 text-red-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                Take a Break
              </h2>
              <p className="text-red-300 mb-6">
                You seem frustrated. Please take a 2-minute break. 
                <br />
                The quiz will resume automatically.
              </p>
              <div className="inline-flex items-center gap-2 bg-red-500/10 px-5 py-3 rounded-2xl border border-red-500/20">
                <Timer className="w-5 h-5 text-red-400" />
                <span className="text-3xl font-mono font-black text-red-400">
                  {Math.floor(pauseSeconds / 60)}:
                  {String(pauseSeconds % 60).padStart(2, "0")}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsPaused(false);
                  clearInterval(pauseTimerRef.current);
                }}
                className="block mx-auto mt-6 text-sm text-zinc-500 hover:text-zinc-300 transition-colors underline"
              >
                I'm ready to continue
              </button>
            </div>
          ) : (
            /* ── Quiz Card ── */
            <div className="bg-zinc-900/95 rounded-3xl border border-glass-border shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-brand-600/20 to-cyan-600/20 px-6 py-4 border-b border-glass-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      Adaptive Quiz
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          difficulty === "easy"
                            ? "bg-cyan-500/20 text-cyan-400"
                            : difficulty === "hard"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-brand-500/20 text-brand-400"
                        }`}
                      >
                        {difficulty}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        Q{currentIdx + 1}/{questions.length || "?"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Score badge */}
                  {score.total > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">
                        Score
                      </p>
                      <p className="text-sm font-mono font-bold text-emerald-400">
                        {score.correct}/{score.total}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Motivational bar */}
              <div
                className={`px-6 py-2.5 border-b border-glass-border flex items-center gap-2 bg-glass-base/30`}
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                <p className={`text-xs font-medium ${motivational.color}`}>
                  {motivational.text}
                </p>
              </div>

              {/* Emotion indicator */}
              <div className="px-6 py-2 border-b border-glass-border bg-glass-base/10 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                <p className="text-[11px] text-zinc-400">
                  Current emotion:{" "}
                  <span className="text-white font-semibold capitalize">
                    {emotion}
                  </span>{" "}
                  | Focus:{" "}
                  <span className="text-brand-400 font-semibold">
                    {focusScore}%
                  </span>
                </p>
              </div>

              {/* Body */}
              <div className="p-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-sm text-zinc-400">
                      Loading questions...
                    </p>
                  </div>
                ) : !currentQ ? (
                  <div className="text-center py-12">
                    <Brain className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400 font-medium">
                      No questions available
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">
                      Check back later or try a different topic
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Question */}
                    <motion.h4
                      key={currentQ.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-lg font-bold text-white mb-6 leading-relaxed"
                    >
                      {currentQ.question}
                    </motion.h4>

                    {/* Options */}
                    <div className="space-y-3 mb-6">
                      {(currentQ.options || []).map((opt, idx) => {
                        const isSelected = selectedAnswer === opt;
                        const isCorrectOpt =
                          submitted && opt === (result?.correct_answer || currentQ.correct_answer);
                        const isWrongSelected =
                          submitted && isSelected && !result?.is_correct;

                        let borderClass = "border-glass-border hover:border-brand-500/50";
                        let bgClass = "bg-glass-base/30 hover:bg-brand-500/5";

                        if (submitted) {
                          if (isCorrectOpt) {
                            borderClass = "border-emerald-500";
                            bgClass = "bg-emerald-500/10";
                          } else if (isWrongSelected) {
                            borderClass = "border-red-500";
                            bgClass = "bg-red-500/10";
                          } else {
                            borderClass = "border-glass-border opacity-50";
                            bgClass = "bg-glass-base/10";
                          }
                        } else if (isSelected) {
                          borderClass = "border-brand-500";
                          bgClass = "bg-brand-500/10";
                        }

                        return (
                          <motion.button
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            disabled={submitted}
                            onClick={() => setSelectedAnswer(opt)}
                            className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3 ${borderClass} ${bgClass}`}
                          >
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                isSelected && !submitted
                                  ? "bg-brand-500 text-white"
                                  : submitted && isCorrectOpt
                                  ? "bg-emerald-500 text-white"
                                  : submitted && isWrongSelected
                                  ? "bg-red-500 text-white"
                                  : "bg-zinc-800 text-zinc-400"
                              }`}
                            >
                              {submitted && isCorrectOpt ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : submitted && isWrongSelected ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                String.fromCharCode(65 + idx) // A, B, C, D
                              )}
                            </span>
                            <span
                              className={`text-sm font-medium ${
                                submitted && isCorrectOpt
                                  ? "text-emerald-300"
                                  : submitted && isWrongSelected
                                  ? "text-red-300"
                                  : "text-zinc-200"
                              }`}
                            >
                              {opt}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Explanation (after submit) */}
                    <AnimatePresence>
                      {submitted && result?.explanation && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mb-5 px-4 py-3 rounded-xl bg-brand-500/5 border border-brand-500/20"
                        >
                          <p className="text-xs text-brand-300 font-medium">
                            💡 {result.explanation}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                      {!submitted ? (
                        <button
                          onClick={handleSubmit}
                          disabled={!selectedAnswer}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                            selectedAnswer
                              ? "bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/30"
                              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          }`}
                        >
                          <Zap className="w-4 h-4" />
                          Submit
                        </button>
                      ) : (
                        <button
                          onClick={handleNext}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/30 transition-all"
                        >
                          Next
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
