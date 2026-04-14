import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/Card";
import { BookOpen, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function TopicCard({ topic }) {
  // Use _id if available, otherwise fallback to id
  const topicId = topic._id || topic.id;

  return (
    <Link to={`/lessons/${topicId}`}>
      <motion.div
        whileHover={{ scale: 1.02, translateY: -5 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Card className="h-full overflow-hidden border border-glass-border bg-glass-base hover:bg-glass-hover hover:border-brand-500/50 transition-all hover:shadow-[0_10px_30px_rgba(var(--brand-500),0.15)] group relative">
          
          {/* Decorative Background Blob */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-[40px] group-hover:bg-brand-500/20 transition-all pointer-events-none" />

          <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gradient-to-br from-brand-600 to-cyan-500 rounded-xl text-white shadow-lg shadow-brand-500/30">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="w-8 h-8 rounded-full bg-panel-bg flex items-center justify-center border border-glass-border group-hover:bg-brand-500/10 group-hover:border-brand-500/50 transition-colors">
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand-500 transition-colors" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-root-fg mb-1">{topic.name || topic.title}</h3>
              <p className="text-sm font-medium text-text-subtle">{topic.lessonCount || 0} Lessons</p>
            </div>

            {topic.progress !== undefined && (
              <div className="mt-6">
                <div className="flex justify-between text-xs font-bold text-text-muted mb-2">
                  <span>Progress</span>
                  <span className="text-brand-500">{topic.progress}%</span>
                </div>
                <div className="w-full bg-root-bg rounded-full h-2 overflow-hidden border border-glass-border">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${topic.progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="bg-gradient-to-r from-brand-500 to-cyan-400 h-full rounded-full" 
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
