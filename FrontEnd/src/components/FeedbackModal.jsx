import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MessageSquare, X, CheckCircle, Loader2, Send } from "lucide-react";
import { http } from "../services/http";

const UNDERSTANDING_LEVELS = [
  { value: "easy", label: "Easy to understand", emoji: "😊", color: "emerald" },
  { value: "medium", label: "Moderate", emoji: "🤔", color: "amber" },
  { value: "difficult", label: "Difficult", emoji: "😓", color: "red" },
];

export default function FeedbackModal({ isOpen, onClose, lessonId, moduleId, userId }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [understanding, setUnderstanding] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rating || !understanding) return;
    setSubmitting(true);
    try {
      await http.post("/feedback", {
        user_id: userId,
        lesson_id: lessonId,
        module_id: moduleId,
        rating,
        understanding_level: understanding,
        comment: comment.trim() || null,
      });
      setSubmitted(true);
      setTimeout(onClose, 2000);
    } catch (err) {
      console.error("[FeedbackModal] Submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = rating > 0 && understanding !== "";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
        >
          <motion.div
            initial={{ scale: 0.85, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-zinc-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
          >
            {/* Decorative glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-brand-500/20 blur-[60px] rounded-full" />
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              /* ── Success State ── */
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <CheckCircle className="w-20 h-20 text-emerald-400" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white">Thank you!</h2>
                <p className="text-zinc-400 text-center">Your feedback has been saved.</p>
              </div>
            ) : (
              /* ── Form State ── */
              <div className="relative z-10 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-500/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white leading-none">Lesson Feedback</h2>
                    <p className="text-zinc-400 text-sm mt-0.5">Help us improve this content</p>
                  </div>
                </div>

                {/* Star Rating */}
                <div>
                  <p className="text-sm font-semibold text-zinc-300 mb-3">
                    How would you rate this lesson?
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`w-9 h-9 transition-colors duration-150 ${
                            star <= (hoverRating || rating)
                              ? "text-amber-400 fill-amber-400"
                              : "text-zinc-600"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <p className="text-xs text-zinc-500 mt-1.5">
                      {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
                    </p>
                  )}
                </div>

                {/* Understanding Level */}
                <div>
                  <p className="text-sm font-semibold text-zinc-300 mb-3">
                    How did you find the content?
                  </p>
                  <div className="flex flex-col gap-2">
                    {UNDERSTANDING_LEVELS.map(({ value, label, emoji, color }) => (
                      <button
                        key={value}
                        onClick={() => setUnderstanding(value)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                          understanding === value
                            ? `border-${color}-500 bg-${color}-500/15 text-white`
                            : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="text-xl">{emoji}</span>
                        <span className="font-medium text-sm">{label}</span>
                        {understanding === value && (
                          <CheckCircle className={`w-4 h-4 ml-auto text-${color}-400`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <p className="text-sm font-semibold text-zinc-300 mb-2">
                    Any additional comments? <span className="text-zinc-500 font-normal">(Optional)</span>
                  </p>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What could be improved?"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/60 focus:bg-white/8 transition-all resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                    canSubmit
                      ? "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25 hover:-translate-y-0.5"
                      : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {submitting ? "Saving..." : "Submit Feedback"}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
