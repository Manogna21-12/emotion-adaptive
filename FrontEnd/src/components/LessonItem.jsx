import React from "react";
import { CheckCircle, PlayCircle, Lock, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function LessonItem({ lesson, index, isActive, onClick }) {
  const statusStr = (lesson.status || "").toLowerCase();
  const isLocked = statusStr === "locked";
  const isCompleted = statusStr === "completed";
  const isCurrent = statusStr === "current" || isActive;
  const displayStatus = lesson.status || (isActive ? "current" : isLocked ? "locked" : "");

  return (
    <motion.button
      whileHover={!isLocked ? { scale: 1.01 } : {}}
      whileTap={!isLocked ? { scale: 0.98 } : {}}
      onClick={!isLocked ? onClick : undefined}
      className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
        isActive 
          ? "bg-brand-500/10 border-brand-500/50 shadow-[0_0_20px_rgba(var(--brand-500),0.1)]" 
          : isLocked 
          ? "bg-glass-base/30 border-glass-border/30 opacity-60 cursor-not-allowed" 
          : "bg-glass-base border-glass-border hover:bg-glass-hover hover:border-brand-500/30"
      }`}
    >
      {/* Icon Status */}
      <div className="mt-1 shrink-0 relative z-10 transition-transform group-hover:scale-110">
        {isCompleted ? (
          <CheckCircle className={`w-6 h-6 ${isActive ? "text-brand-500" : "text-green-500"}`} />
        ) : isLocked ? (
          <Lock className="w-6 h-6 text-text-subtle" />
        ) : (
          <PlayCircle className={`w-6 h-6 ${isActive ? "text-brand-500 drop-shadow-[0_0_8px_rgba(var(--brand-500),0.8)]" : "text-text-muted group-hover:text-brand-400"}`} />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 relative z-10">
        <h4 className={`text-sm font-bold truncate transition-colors ${isActive ? "text-brand-500" : "text-root-fg"}`}>
          {index + 1}. {lesson.title}
        </h4>
        <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold">
          <span className={`flex items-center gap-1 ${isActive ? "text-brand-400" : "text-text-subtle"}`}>
             <Clock className="w-3 h-3" />
             {lesson.duration || "10:00"}
          </span>
          <span className="text-glass-border">•</span>
          <span className={`capitalize ${
             isCompleted ? "text-green-500" :
             isLocked ? "text-text-subtle" :
             isCurrent ? "text-orange-500" : "text-text-muted"
          }`}>
            {displayStatus}
          </span>
        </div>
      </div>
      
      {/* Active Glow */}
      {isActive && (
        <motion.div 
          layoutId="activeLessonLayoutGlow"
          className="absolute right-0 top-0 bottom-0 w-1 bg-brand-500 shadow-[0_0_15px_rgba(var(--brand-500),1)]" 
        />
      )}
    </motion.button>
  );
}
