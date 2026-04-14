import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, HelpCircle, ChevronRight, Trophy } from "lucide-react";
import { quizzesApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import emotionSocketService from "../services/emotionSocketService";

/** Normalize API item to { id, question, options: [{ text, isCorrect }] } */
function normalizeQuizItem(raw) {
  if (!raw || !raw.question) return null;
  const id = raw.id ?? raw._id;
  let options = raw.options || [];
  if (options.length && typeof options[0] === "string") {
    const ans = raw.answer;
    options = options.map((t) => ({
      text: t,
      isCorrect: String(t) === String(ans),
    }));
  } else {
    options = options.map((o) => ({
      text: o.text ?? String(o),
      isCorrect: Boolean(o.isCorrect),
    }));
  }
  return { id, question: raw.question, options };
}

function performanceMessage(score, total) {
  if (total <= 0) return "Keep practicing 💪";
  if (score === total) return "Excellent 🎉";
  if (score / total >= 0.5) return "Good 👍";
  return "Keep practicing 💪";
}

/**
 * Full interactive quiz modal on Learning (/courses).
 */
export default function QuizLearningPopup() {
  const { user } = useAuth();
  const userId = user?._id || user?.id || "anonymous";

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);

  const [phase, setPhase] = useState("quiz"); // quiz | results
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [pickedText, setPickedText] = useState(null);
  const [locked, setLocked] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const saveOnceRef = useRef(false);

  const total = quizzes.length;
  const current = quizzes[index];

  const resetQuizState = useCallback(() => {
    setPhase("quiz");
    setIndex(0);
    setScore(0);
    setPickedText(null);
    setLocked(false);
    setSaveStatus(null);
  }, []);

  useEffect(() => {
    setLoading(false); // No initial loading

    const handleRecommendation = (eventData) => {
      // Handle nested data structures correctly based on how recommendations arrive
      const payload = eventData?.data || eventData;
      
      console.log("[QuizLearningPopup] Recommendation received from socket:", payload);
      
      if (payload && payload.content && payload.content.quiz) {
        console.log("[QuizLearningPopup] Emotion triggered a quiz:", payload.content.quiz);
        const normalized = normalizeQuizItem(payload.content.quiz);
        if (normalized) {
          setQuizzes([normalized]);
          resetQuizState();
          setOpen(true);
        }
      }
    };

    // Listen to possible recommendation socket events
    emotionSocketService.on('recommendation', handleRecommendation);
    emotionSocketService.on('personalizedRecommendation', handleRecommendation);
    
    // Also attach a window-level fallback in case other components want to trigger it directly
    window.triggerEmotionQuiz = (quizData) => {
        const normalized = normalizeQuizItem(quizData);
        if (normalized) {
          setQuizzes([normalized]);
          resetQuizState();
          setOpen(true);
        }
    };

    return () => {
      emotionSocketService.off('recommendation', handleRecommendation);
      emotionSocketService.off('personalizedRecommendation', handleRecommendation);
      delete window.triggerEmotionQuiz;
    };
  }, [resetQuizState]);

  const handlePick = useCallback(
    (optionText, isCorrect) => {
      if (locked) return;
      setPickedText(optionText);
      setLocked(true);
      if (isCorrect) setScore((prev) => prev + 1);
    },
    [locked]
  );

  const handleNext = useCallback(() => {
    if (!locked) return;
    if (index >= total - 1) {
      setPhase("results");
      return;
    }
    setIndex((i) => i + 1);
    setPickedText(null);
    setLocked(false);
  }, [locked, index, total]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (phase !== "results" || total === 0) return;
    if (saveOnceRef.current) return;
    saveOnceRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        setSaveStatus("saving");
        await quizzesApi.submitQuizResult({
          userId: String(userId),
          score,
          totalQuestions: total,
          timestamp: new Date().toISOString(),
        });
        if (!cancelled) setSaveStatus("saved");
      } catch (e) {
        console.warn("[QuizLearningPopup] save result skipped/failed:", e);
        if (!cancelled) setSaveStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, score, total, userId]);

  const optionClass = useCallback(
    (opt) => {
      const { text, isCorrect } = opt;
      if (!locked) {
        return "border-glass-border bg-glass-base hover:border-brand-400 text-root-fg";
      }
      if (text === pickedText) {
        return isCorrect
          ? "border-emerald-500 bg-emerald-500 text-white shadow-lg"
          : "border-red-500 bg-red-500 text-white shadow-lg";
      }
      if (isCorrect) {
        return "border-emerald-500 bg-emerald-600/90 text-white shadow-md";
      }
      return "border-glass-border bg-glass-base/50 text-text-muted opacity-60";
    },
    [locked, pickedText]
  );

  const footerHint = useMemo(() => {
    if (phase === "results") return null;
    if (!locked) return "Select an answer";
    return index >= total - 1 ? "Last question — see your results next" : "Tap Next to continue";
  }, [phase, locked, index, total]);

  if (loading || !open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-popup-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 320 }}
        className="relative w-full max-w-lg rounded-3xl border border-glass-border bg-panel-bg shadow-2xl text-root-fg overflow-hidden max-h-[90vh] flex flex-col"
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-xl p-2 text-text-muted hover:bg-glass-hover hover:text-root-fg transition-colors"
          aria-label="Close quiz"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pt-12 overflow-y-auto flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-2xl bg-brand-500/15 p-3 text-brand-500">
              {phase === "results" ? (
                <Trophy className="w-6 h-6" />
              ) : (
                <HelpCircle className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 id="quiz-popup-title" className="text-xl font-black tracking-tight">
                {phase === "results" ? "Quiz complete" : "Quick check-in"}
              </h2>
              {phase === "quiz" && total > 0 && (
                <p className="text-xs text-text-muted font-semibold">
                  Question {index + 1} of {total} · Score {score}
                </p>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {phase === "quiz" && current ? (
              <motion.div
                key={`q-${current.id}-${index}`}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-lg font-bold mb-6 leading-snug">{current.question}</p>
                <div className="flex flex-col gap-2">
                  {current.options.map((opt) => (
                    <button
                      key={opt.text}
                      type="button"
                      disabled={locked}
                      onClick={() => handlePick(opt.text, opt.isCorrect)}
                      className={`w-full text-left rounded-2xl border-2 px-4 py-3.5 text-sm font-bold transition-all duration-200 ${optionClass(
                        opt
                      )} disabled:cursor-default`}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-4"
              >
                <p className="text-2xl font-black text-brand-500 mb-2">
                  You scored {score} out of {total}
                </p>
                <p className="text-lg font-bold text-root-fg mb-6">
                  {performanceMessage(score, total)}
                </p>
                {saveStatus === "saving" && (
                  <p className="text-xs text-text-muted font-medium">Saving result…</p>
                )}
                {saveStatus === "saved" && (
                  <p className="text-xs text-emerald-600 font-semibold">Result saved ✓</p>
                )}
                {saveStatus === "error" && (
                  <p className="text-xs text-amber-600 font-medium">Could not save (offline?)</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t border-glass-border px-8 py-4 bg-glass-base/40 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-text-muted font-medium truncate">{footerHint}</span>
          {phase === "quiz" && (
            <button
              type="button"
              disabled={!locked}
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-black text-white shadow-md transition-all hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {index >= total - 1 && locked ? "See results" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {phase === "results" && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-black text-white shadow-md hover:bg-cyan-600"
            >
              Done
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modal, document.body);
}
