import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { learningApi } from "../services/api";
import DashboardLayout from "../components/DashboardLayout";
import CourseCard from "../components/CourseCard";
import { Loader2, LayoutDashboard, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCourses = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await learningApi.getCourses();
      setCourses(data.courses || data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch courses");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    
    // Auto Refresh every 10 seconds
    const interval = setInterval(() => {
      fetchCourses(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-10">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2 pb-6 border-b border-glass-border/50"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-cyan-400 flex items-center gap-3 tracking-tight">
              <LayoutDashboard className="w-8 h-8 text-brand-500 drop-shadow-sm" /> 
              Available Courses
            </h1>
            <button 
              onClick={() => fetchCourses()}
              className="p-3 bg-glass-base hover:bg-glass-hover rounded-2xl transition border border-glass-border shadow-sm group flex items-center gap-2"
            >
              <RefreshCcw className="w-5 h-5 text-text-muted group-hover:text-brand-500 transition-colors" />
              <span className="text-text-muted group-hover:text-root-fg font-medium hidden sm:block">Refresh</span>
            </button>
          </div>
          <p className="text-lg text-text-muted font-medium max-w-2xl ml-11">
             Pick up where you left off or start a brand new journey into advanced topics tailored just for you.
          </p>
        </motion.div>
        
        {loading ? (
             <div className="flex justify-center flex-col items-center p-20 gap-4">
                 <Loader2 className="w-12 h-12 animate-spin text-brand-500" />
                 <span className="text-brand-500 font-bold tracking-widest uppercase text-sm">Loading Catalog...</span>
             </div>
        ) : error ? (
             <div className="p-4 bg-red-500/10 text-red-500 rounded-xl border border-red-500/50 flex gap-3 mt-4 w-fit">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-1.5" /> {error}
             </div>
        ) : (
             <motion.div 
               className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4"
               initial="hidden"
               animate="visible"
               variants={{
                   hidden: { opacity: 0 },
                   visible: {
                     opacity: 1,
                     transition: { staggerChildren: 0.1 }
                   }
               }}
             >
                {courses.length === 0 ? (
                    <p className="text-text-muted bg-glass-base p-6 rounded-2xl border border-glass-border">No courses available.</p>
                ) : (
                    courses.map((course, idx) => (
                        <motion.div 
                            key={course.id || course._id || idx}
                            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                        >
                            <CourseCard course={course} />
                        </motion.div>
                    ))
                )}
             </motion.div>
        )}

      </div>
    </DashboardLayout>
  );
}
