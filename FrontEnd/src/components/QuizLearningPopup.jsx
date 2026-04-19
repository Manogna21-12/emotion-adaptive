import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Clock,
  BrainCircuit,
  MessageSquareQuote,
  Timer
} from 'lucide-react';
import { adaptiveQuizApi } from '../services/api';
import { Card } from './ui/Card';

export default function QuizLearningPopup({ 
  isOpen, 
  onClose, 
  courseId, 
  moduleId, 
  lessonId, 
  topic,
  currentEmotion,
  focusScore,
  userId,
  askedQuizIds = [],
  onQuestionFetched
}) {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');

  // 1. Reset state and fetch new question when popup opens
  useEffect(() => {
    if (isOpen) {
      setQuestion(null);
      setSelectedOption(null);
      setIsSubmitted(false);
      setIsCorrect(null);
      setShowExplanation(false);

      let targetDifficulty = 'medium';
      if (currentEmotion === 'happy') {
        targetDifficulty = 'hard';
      } else if (currentEmotion === 'neutral') {
        targetDifficulty = 'medium';
      } else if (currentEmotion === 'sad') {
        targetDifficulty = 'easy';
      }
      
      setDifficulty(targetDifficulty);
      fetchQuestion(targetDifficulty);
    }
  }, [isOpen, currentEmotion]); // Refetch if emotion changes while open is also fine

  const fetchQuestion = async (diff) => {
    setLoading(true);
    try {
      const data = await adaptiveQuizApi.getQuestion({
        course_id: courseId,
        module_id: moduleId,
        lesson_id: lessonId,
        topic: topic,
        difficulty: diff,
        exclude_ids: askedQuizIds
      });
      setQuestion(data);
      if (data && data.id && onQuestionFetched) {
        onQuestionFetched(data.id);
      }
    } catch (err) {
      console.error("Failed to fetch adaptive quiz:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitted) return;

    const correct = selectedOption === question.correct_answer;
    setIsCorrect(correct);
    setIsSubmitted(true);

    try {
      await adaptiveQuizApi.submitAttempt({
        user_id: userId,
        question_id: question.id,
        selected_answer: selectedOption,
        is_correct: correct,
        emotion: currentEmotion,
        focus_score: focusScore
      });
    } catch (err) {
      console.error("Failed to submit quiz attempt:", err);
    }
  };

  const handleNext = () => {
    setQuestion(null);
    setSelectedOption(null);
    setIsSubmitted(false);
    setIsCorrect(null);
    setShowExplanation(false);
  };

  const getMotivationMessage = () => {
    if (difficulty === 'hard') return "Great focus! Let's try a harder one 💪";
    if (difficulty === 'easy') return "Take it easy, try this simpler question 👍";
    return "Keep it up! Assessing your understanding...";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-2xl"
      >
        <Card className="overflow-hidden border-2 border-brand-500/30 shadow-2xl bg-panel-bg rounded-[40px]">
          {/* Progress Bar (Fake but nice) */}
          <div className="h-2 w-full bg-glass-base overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: loading ? '30%' : '100%' }}
              className="h-full bg-gradient-to-r from-brand-500 to-cyan-500"
            />
          </div>

          <div className="p-8">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-500/10 rounded-2xl text-brand-500">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-root-fg">Emotion-Adaptive Quiz</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase text-text-muted tracking-widest">{getMotivationMessage()}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-glass-hover rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-text-muted" />
              </button>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                <p className="text-text-muted font-bold animate-pulse">Personalizing your question...</p>
              </div>
            ) : question?.error ? (
              <div className="py-12 text-center">
                <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-root-fg">No questions found!</h3>
                <p className="text-text-muted mt-2">Keep studying, we'll try again soon.</p>
                <button onClick={onClose} className="mt-8 px-8 py-3 bg-brand-500 text-white rounded-2xl font-black">Close</button>
              </div>
            ) : question ? (
              <div className="space-y-8">
                {/* Question Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      difficulty === 'hard' ? 'bg-orange-500/10 text-orange-500' :
                      difficulty === 'easy' ? 'bg-green-500/10 text-green-500' :
                      'bg-brand-500/10 text-brand-500'
                    }`}>
                      {difficulty} mode
                    </span>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-glass-base border border-glass-border">
                       <Zap className="w-3 h-3 text-yellow-500" />
                       <span className="text-[10px] font-black text-root-fg uppercase">{currentEmotion} state</span>
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-root-fg leading-tight">
                    {question.question}
                  </h2>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 gap-4">
                  {question.options.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isCorrectOption = option === question.correct_answer;
                    
                    let bgClass = "bg-glass-base border-glass-border hover:border-brand-500/50";
                    let textClass = "text-root-fg";
                    
                    if (isSubmitted) {
                      if (isCorrectOption) {
                        bgClass = "bg-green-500/10 border-green-500 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.1)]";
                        textClass = "text-green-500";
                      } else if (isSelected) {
                        bgClass = "bg-red-500/10 border-red-500 text-red-500";
                        textClass = "text-red-500";
                      } else {
                        bgClass = "bg-glass-base border-glass-border opacity-50";
                        textClass = "text-text-muted";
                      }
                    } else if (isSelected) {
                      bgClass = "bg-brand-500/10 border-brand-500 text-brand-500";
                      textClass = "text-brand-500";
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isSubmitted}
                        onClick={() => setSelectedOption(option)}
                        className={`group relative flex items-center justify-between p-5 rounded-3xl border-2 transition-all duration-300 transform ${bgClass}`}
                      >
                        <span className={`text-lg font-bold ${textClass}`}>{option}</span>
                        {isSubmitted && isCorrectOption && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                      </button>
                    );
                  })}
                </div>
                
                {/* Explanation Section */}
                {isSubmitted && question.explanation && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-brand-500/10 border-l-4 border-brand-500 rounded-r-3xl flex gap-4"
                  >
                    <MessageSquareQuote className="w-8 h-8 text-brand-500 shrink-0" />
                    <div>
                      <h4 className="text-sm font-black text-brand-500 uppercase tracking-widest mb-1">Deep Insight</h4>
                      <p className="text-root-fg font-medium leading-relaxed">
                        {question.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Footer Actions */}
                <div className="pt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                     <Timer className="w-4 h-4 text-text-muted" />
                     <span className="text-xs font-bold text-text-muted">Dynamic Assessment active</span>
                  </div>
                  
                  {!isSubmitted ? (
                    <button
                      onClick={handleSubmit}
                      disabled={!selectedOption}
                      className="px-10 py-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-3xl font-black transition-all shadow-xl shadow-brand-500/20 active:scale-95 flex items-center gap-2"
                    >
                      Submit Answer <Zap className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={onClose}
                      className="px-10 py-4 bg-green-500 hover:bg-green-600 text-white rounded-3xl font-black transition-all shadow-xl active:scale-95 flex items-center gap-2"
                    >
                      Correct! Resume Video <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
