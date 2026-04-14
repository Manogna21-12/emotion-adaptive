import React from "react";
import { CheckCircle, PlayCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function LessonList({ lessons, selectedLesson, onSelectLesson }) {
  return (
    <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar max-h-[calc(100vh-200px)]">
      {lessons.map((lesson, idx) => {
        const isSelected = selectedLesson && (selectedLesson._id === lesson._id || selectedLesson.id === lesson.id);
        
        return (
          <motion.button
            key={lesson._id || lesson.id || idx}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectLesson(lesson)}
            className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
              isSelected 
                ? "bg-brand-500/10 border-brand-500/50 shadow-[0_0_20px_rgba(var(--brand-500),0.1)]" 
                : "bg-glass-base border-glass-border hover:bg-glass-hover hover:border-glass-border"
            }`}
          >
            {/* Icon Status */}
            <div className="mt-1 shrink-0">
              {lesson.completed ? (
                <CheckCircle className={`w-6 h-6 ${isSelected ? "text-brand-500" : "text-green-500"}`} />
              ) : (
                <PlayCircle className={`w-6 h-6 ${isSelected ? "text-brand-500" : "text-text-muted"}`} />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-bold truncate ${isSelected ? "text-brand-500" : "text-root-fg"}`}>
                {idx + 1}. {lesson.title}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-xs font-semibold text-text-subtle">
                <Clock className="w-3 h-3" />
                {lesson.duration || "10:00"}
              </div>
            </div>
            
            {/* Small active indicator dot */}
            {isSelected && (
              <motion.div 
                layoutId="activeIndicator"
                className="w-2 h-2 rounded-full bg-brand-500 self-center shadow-[0_0_8px_rgba(var(--brand-500),0.8)]" 
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
