import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, CheckCircle2, Loader2, X, Send } from 'lucide-react';
import { learningApi } from '../services/api';

const LessonFeedbackModal = ({ isOpen, onClose, userId, courseId, moduleId, lessonId }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [understanding, setUnderstanding] = useState('medium');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await learningApi.submitFeedback({
        user_id: userId,
        course_id: courseId,
        module_id: moduleId,
        lesson_id: lessonId,
        rating: rating,
        understanding_level: understanding,
        comment: comment
      });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Feedback failed:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-root-bg border border-glass-border w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden relative"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-1.5 bg-brand-500 w-full" />

        <div className="p-8 sm:p-12">
          {isSuccess ? (
            <div className="py-12 text-center">
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-3xl font-black text-root-fg mb-4">Thank You!</h2>
              <p className="text-text-muted text-lg font-medium">Your feedback helps us build a better learning experience.</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/10 rounded-full border border-brand-500/20 mb-6">
                  <Star className="w-3.5 h-3.5 text-brand-500 fill-brand-500" />
                  <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Post-Lesson Feedback</span>
                </div>
                <h2 className="text-4xl font-black text-root-fg leading-tight mb-4">
                  Great job completing the lesson!
                </h2>
                <p className="text-text-muted font-medium">Please share your thoughts on this session.</p>
              </div>

              <div className="space-y-8">
                {/* Rating */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-text-muted uppercase tracking-widest ml-1">Overall Rating</label>
                  <div className="flex justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="transition-all duration-300 transform active:scale-90"
                      >
                        <Star 
                          className={`w-12 h-12 ${
                            (hoverRating || rating) >= star 
                              ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]' 
                              : 'text-glass-border fill-transparent'
                          }`} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Understanding Level */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-text-muted uppercase tracking-widest ml-1">Understanding Level</label>
                  <div className="grid grid-cols-3 gap-4">
                    {['easy', 'medium', 'difficult'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setUnderstanding(level)}
                        className={`py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 transition-all ${
                          understanding === level 
                            ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/25' 
                            : 'bg-glass-base border-glass-border text-text-muted hover:border-brand-500/30'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-text-muted uppercase tracking-widest ml-1">Any Comments?</label>
                  <div className="relative group">
                    <MessageSquare className="absolute top-4 left-5 w-5 h-5 text-text-muted transition-colors group-focus-within:text-brand-500" />
                    <textarea
                      placeholder="Share what you liked or how we can improve..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full h-32 pl-14 pr-6 py-4 bg-glass-base border-2 border-glass-border focus:border-brand-500 rounded-3xl text-root-fg placeholder:text-text-muted/50 transition-all resize-none outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={rating === 0 || isSubmitting}
                    className="w-full py-5 bg-root-fg hover:bg-black dark:hover:bg-gray-800 disabled:opacity-50 text-root-bg rounded-[2rem] font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        Submit Feedback <Send className="w-5 h-5" />
                      </>
                    )}
                  </button>
                  <button 
                    onClick={onClose}
                    className="w-full mt-4 py-2 text-text-muted hover:text-root-fg font-bold text-sm transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LessonFeedbackModal;
