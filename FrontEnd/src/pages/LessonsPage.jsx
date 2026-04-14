import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { learningApi } from "../services/api";
import DashboardLayout from "../components/DashboardLayout";
import LessonItem from "../components/LessonItem";
import VideoPlayer from "../components/VideoPlayer";
import { Loader2, ArrowLeft, LayoutList, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LessonsPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initialLoadRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;
    initialLoadRef.current = false;
    setLessons([]);
    setSelectedLesson(null);
    setLoading(true);
    setError(null);

    const fetchLessons = async () => {
      try {
        if (!initialLoadRef.current) setLoading(true);

        const data = await learningApi.getLessons(moduleId);
        const fetchedLessons = data.lessons || data || [];
        if (isCancelled) return;

        setLessons(fetchedLessons);

        setSelectedLesson((prev) => {
          if (!prev) return fetchedLessons[0] || null;

          const prevKey = prev.id || prev._id;
          const matched = fetchedLessons.find(
            (l) => (l.id || l._id) === prevKey
          );

          // If selected lesson no longer exists, fall back to first.
          if (!matched) return fetchedLessons[0] || null;

          // Avoid unnecessary video/webcam resets if nothing changed.
          const shouldUpdate =
            prev.videoUrl !== matched.videoUrl ||
            prev.title !== matched.title ||
            prev.duration !== matched.duration;

          return shouldUpdate ? matched : prev;
        });

        if (!initialLoadRef.current) {
          initialLoadRef.current = true;
          setLoading(false);
        }

        setError(null);
      } catch (err) {
        if (isCancelled) return;
        setError("Failed to fetch lessons");
        setLoading(false);
      }
    };

    // Initial fetch + polling for real-time reflection
    fetchLessons();
    const interval = setInterval(fetchLessons, 10000); // every 10 seconds

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [moduleId]);

  const forceRefresh = async () => {
    setLoading(true);
    try {
      const data = await learningApi.getLessons(moduleId);
      setLessons(data.lessons || data || []);
    } catch (err) {
      setError("Failed to refresh lessons");
    } finally {
      setLoading(false);
    }
  };

  const handleNextLesson = () => {
    if (!selectedLesson) return;
    const currentIndex = lessons.findIndex(l => (l._id || l.id) === (selectedLesson._id || selectedLesson.id));
    if (currentIndex >= 0 && currentIndex < lessons.length - 1) {
      setSelectedLesson(lessons[currentIndex + 1]);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 h-[calc(100vh-140px)] max-w-[1600px] mx-auto w-full">

        {/* Header spanning top */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-glass-border shrink-0 gap-4"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)} // Alternatively: navigate(`/course/${lessons[0]?.courseId}/modules`) 
              className="p-3 bg-glass-base hover:bg-glass-hover rounded-2xl transition border border-glass-border shadow-sm group"
            >
              <ArrowLeft className="w-5 h-5 text-text-muted group-hover:text-root-fg transition-colors" />
            </button>
            <h1 className="text-3xl font-extrabold text-root-fg flex items-center gap-3 tracking-tight">
              <LayoutList className="w-6 h-6 text-brand-500" />
              Lesson Player
            </h1>
          </div>
          
          <button 
            onClick={() => forceRefresh()}
            className="p-2 sm:p-3 bg-glass-base hover:bg-glass-hover rounded-2xl transition border border-glass-border shadow-sm group flex items-center gap-2"
          >
            <RefreshCcw className="w-5 h-5 text-text-muted group-hover:text-brand-500 transition-colors" />
            <span className="text-text-muted group-hover:text-root-fg font-medium hidden sm:block">Refresh</span>
          </button>
        </motion.div>

        {loading ? (
          <div className="flex-1 flex flex-col justify-center items-center">
            <Loader2 className="w-12 h-12 animate-spin text-brand-500" />
            <span className="text-brand-500 font-bold uppercase tracking-widest mt-4">Downloading Matrix...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/30 flex items-center gap-4 h-fit">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {error}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0 pb-10">

            {/* Sidebar Left: Lesson List (30%) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full lg:w-[30%] flex flex-col shrink-0 gap-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-glass-border/30 px-2 mt-2">
                <h3 className="text-sm font-black text-text-muted uppercase tracking-widest">Syllabus ({lessons.length})</h3>
                <span className="text-xs font-bold text-brand-500 bg-brand-500/10 px-2 py-1 rounded-md">
                  {lessons.filter(l => l.status === "completed").length} / {lessons.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                {lessons.map((lesson, index) => {
                  const isActive = selectedLesson && (selectedLesson.id || selectedLesson._id) === (lesson.id || lesson._id);
                  return (
                    <LessonItem
                      key={lesson.id || lesson._id}
                      lesson={lesson}
                      index={index}
                      isActive={isActive}
                      onClick={() => setSelectedLesson(lesson)}
                    />
                  );
                })}
              </div>
            </motion.div>

            {/* Main Content Right: Video Player (70%) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full lg:w-[70%] flex flex-col min-w-0"
            >
              <AnimatePresence mode="wait">
                {selectedLesson ? (
                  <VideoPlayer
                    key={selectedLesson.id || selectedLesson._id}
                    lesson={selectedLesson}
                    nextLesson={handleNextLesson}
                  />
                ) : (
                  <div className="flex-1 glass-card rounded-3xl border border-glass-border flex flex-col justify-center items-center text-center p-8 bg-glass-base pb-20">
                    <div className="w-24 h-24 rounded-full bg-brand-500/10 flex items-center justify-center mb-6 border border-brand-500/20 shadow-inner">
                       <LayoutList className="w-10 h-10 text-brand-500/50" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-root-fg tracking-tight">Select a Lesson</h2>
                    <p className="text-text-muted mt-3 text-lg font-medium max-w-sm">Choose a module from the syllabus on the left to begin your learning session.</p>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
