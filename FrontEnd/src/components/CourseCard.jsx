import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/Card";
import { BookOpen, Clock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function CourseCard({ course }) {
  const courseId = course.id || course._id;
  
  return (
    <Link to={`/course/${courseId}/modules`}>
      <motion.div
        whileHover={{ scale: 1.02, translateY: -5 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Card className="h-full overflow-hidden border border-glass-border bg-glass-base hover:bg-glass-hover hover:border-brand-500/50 transition-all hover:shadow-[0_10px_30px_rgba(var(--brand-500),0.15)] group relative">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-[40px] group-hover:bg-brand-500/20 transition-all pointer-events-none" />

          <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gradient-to-br from-brand-600 to-cyan-500 rounded-xl text-white shadow-lg shadow-brand-500/30">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="px-3 py-1 bg-panel-bg rounded-lg border border-glass-border text-xs font-bold text-root-fg uppercase tracking-wider">
                  {course.level || "Beginner"}
                </div>
              </div>
              
              <h3 className="text-xl font-extrabold text-root-fg mb-2 leading-tight">
                {course?.title && course.title !== "N/A" ? course.title : "Untitled Course"}
              </h3>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-text-subtle">
                 <Clock className="w-4 h-4" /> {course.duration || "Self-paced"}
              </p>
            </div>

            <div className="mt-8 flex items-center gap-2 text-brand-500 font-bold text-sm uppercase tracking-widest group-hover:text-cyan-400 transition-colors">
              Continue Learning <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
