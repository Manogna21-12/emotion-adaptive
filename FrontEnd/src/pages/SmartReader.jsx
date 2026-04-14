import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Clock, 
  TrendingUp, 
  ChevronLeft, 
  ExternalLink,
  Loader2,
  RefreshCw,
  LayoutGrid
} from "lucide-react";
import { smartReaderApi } from "../services/api";
import Sidebar from "../components/Sidebar";
import TopNavbar from "../components/TopNavbar";
import ReaderCard from "../components/ReaderCard";
import CameraTracker from "../components/CameraTracker";
import { useAuth } from "../contexts/AuthContext";
import AdaptiveQuizModal from "../components/AdaptiveQuizModal";
import useAdaptiveQuiz from "../hooks/useAdaptiveQuiz";
import { Coffee } from "lucide-react";

const NoConceptsCard = () => (
  <div className="col-span-full text-center py-20 px-6 glass-panel rounded-3xl border border-glass-border">
    <LayoutGrid className="w-16 h-16 text-glass-border mx-auto mb-4" />
    <h3 className="text-xl font-bold">No concepts found</h3>
    <p className="text-text-muted">Check back later for curated materials.</p>
  </div>
);

const SmartReader = () => {
  const { user } = useAuth();
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConcept, setActiveConcept] = useState(null);
  const [stats, setStats] = useState({ timeSpent: 0, avgFocus: 0, retentionScore: 0 });
  
  // Real-time tracking states
  const [sessionSeconds, setSessionSeconds] = useState(0);
  
  const {
    isQuizOpen,
    openQuiz,
    closeQuiz,
    isPausedByEmotion,
    setIsPausedByEmotion,
    pauseCountdown,
    emotionHistory,
    currentEmotion,
    registerDetection
  } = useAdaptiveQuiz({
    userId: user?.id || user?._id,
    courseId: activeConcept?.course_id || "default",
    triggerIntervalMS: 30000 // 30 seconds
  });

  const timerRef = useRef(null);
  
  const getEmbedLink = (url) => {
    if (!url) return "";
    if (url.includes("drive.google.com")) {
        return url.replace("/view", "/preview").replace("/edit", "/preview");
    }
    return url;
  };

  const fetchConcepts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await smartReaderApi.getConcepts();
      console.log("Smart Reader API Response:", data);
      const conceptsList = Array.isArray(data) ? data : (data.concepts || []);
      setConcepts(conceptsList);
    } catch (err) {
      console.error("Failed to fetch concepts", err);
      setConcepts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    const userId = user?.id || user?._id;
    if (!userId) return;
    try {
      const data = await smartReaderApi.getStats(userId, activeConcept?.id || activeConcept?._id);
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  }, [user, activeConcept]);

  useEffect(() => {
    fetchConcepts();
  }, [fetchConcepts]);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 5000);
    return () => clearInterval(id);
  }, [fetchStats]);

  const handleStartReading = (concept) => {
    setActiveConcept(concept);
    setSessionSeconds(0);
    // Timer starts when component mounts based on activeConcept
  };

  const handleBack = () => {
    setActiveConcept(null);
  };

  const handleEmotionDetected = useCallback(async (emotion) => {
    const userId = user?.id || user?._id;
    if (!activeConcept || !userId) return;
    
    try {
      // Register detection in the adaptive hook
      registerDetection(emotion, 70); // Focus score default 70 if not provided by components

      await smartReaderApi.trackEmotion({
        user_id: userId,
        concept_id: activeConcept.id || activeConcept._id,
        emotion: emotion,
        duration: 2 
      });
      console.log("Capture logged:", emotion);
    } catch (err) {
      console.warn("Log failed", err);
    }
  }, [activeConcept, user, registerDetection]);

  // Timer logic for session
  useEffect(() => {
    let interval;
    if (activeConcept) {
      interval = setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setSessionSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeConcept]);

  const totalTime = (stats.timeSpent || 0) + sessionSeconds;
  const timeDisplay = `${Math.floor(totalTime / 60)}m ${totalTime % 60}s`;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-root-bg items-center justify-center">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-root-bg text-root-fg overflow-hidden">
      <Sidebar role="student" />
      
      <div className="flex-1 flex flex-col min-w-0 ml-64 transition-all duration-300">
        <TopNavbar />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            
            <AnimatePresence mode="wait">
              {!activeConcept ? (
                <motion.div 
                  key="grid"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-4xl font-black tracking-tight text-white mb-2">
                        Smart <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-400">Reader</span>
                      </h1>
                      <p className="text-text-muted">Explore interactive PDF materials with real-time focus tracking.</p>
                    </div>
                    <button 
                      onClick={fetchConcepts}
                      className="p-3 rounded-2xl bg-glass-base border border-glass-border text-text-muted hover:text-brand-500 transition-colors"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {concepts && concepts.length > 0 ? (
                      concepts.map((concept) => (
                        <ReaderCard 
                          key={concept.id}
                          {...concept}
                          onStart={() => handleStartReading(concept)}
                        />
                      ))
                    ) : (
                      <NoConceptsCard />
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="reader"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col h-full space-y-4"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between bg-glass-base/50 p-4 rounded-3xl border border-glass-border backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                       <button onClick={handleBack} className="p-2 rounded-xl bg-glass-hover text-text-muted hover:text-white transition-colors">
                         <ChevronLeft className="w-6 h-6" />
                       </button>
                       <div>
                         <h2 className="text-lg font-bold leading-none">{activeConcept.title}</h2>
                         <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold uppercase">Dynamic PDF Active</span>
                         </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-6 pr-4">
                       <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Session Time</p>
                          <p className="font-mono font-bold text-emerald-400">{timeDisplay}</p>
                       </div>
                       <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Avg Focus</p>
                          <p className="font-mono font-bold text-brand-500">{stats.avgFocus}%</p>
                       </div>
                    </div>
                  </div>

                  <div className="flex-1 flex gap-6 min-h-0">
                    {/* PDF Viewer */}
                    <div className="flex-1 glass-panel rounded-[2rem] overflow-hidden border border-glass-border shadow-2xl relative bg-zinc-900 group">
                       <iframe 
                        src={getEmbedLink(activeConcept.link)}
                        className="w-full h-full border-none"
                        title={activeConcept.title}
                        allow="autoplay"
                       />
                       
                       {/* Floating Focus Badge */}
                       <div className="absolute bottom-6 left-6 px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span className="text-xs font-bold text-white uppercase tracking-widest">Biometric Tracking Enabled</span>
                       </div>
                    </div>

                    {/* Right Side Panel */}
                    <div className="w-64 flex flex-col gap-6">
                      {/* Camera Tracker starts only here when activeConcept is set */}
                      <CameraTracker 
                        onEmotionDetected={handleEmotionDetected} 
                        userId={user?.id || user?._id}
                        lessonId={activeConcept?.id || activeConcept?._id}
                      />

                      {/* Stats Card */}
                      <div className="glass-card rounded-[2rem] p-6 border border-glass-border space-y-6">
                         <div className="space-y-2">
                           <div className="flex items-center gap-2 text-text-muted">
                              <Clock className="w-4 h-4" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Time Spent</span>
                           </div>
                           <p className="text-2xl font-black text-white">{Math.floor(totalTime / 60)}<span className="text-sm font-medium text-text-muted ml-1">m</span></p>
                         </div>

                         <div className="space-y-2">
                           <div className="flex items-center gap-2 text-text-muted">
                              <TrendingUp className="w-4 h-4 text-cyan-500" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Retention Score</span>
                           </div>
                           <div className="flex items-end gap-2">
                              <p className="text-2xl font-black text-brand-500">{stats.retentionScore}%</p>
                              <div className="h-2 flex-1 bg-glass-border rounded-full mb-2 overflow-hidden">
                                 <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${stats.retentionScore}%` }}
                                  className="h-full bg-gradient-to-r from-brand-600 to-cyan-400"
                                 />
                              </div>
                           </div>
                         </div>
                      </div>

                      <div className="glass-card rounded-[2rem] p-5 border border-glass-border bg-brand-500/5">
                         <p className="text-[10px] text-text-muted leading-relaxed uppercase font-bold text-center">
                           Your emotional data helps us understand topic difficulty and improve retention.
                         </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>
        </main>
      </div>

      <AdaptiveQuizModal 
        isOpen={isQuizOpen}
        onClose={closeQuiz}
        courseId={activeConcept?.course_id || "default"}
        userId={user?.id || user?._id}
        emotion={currentEmotion}
        emotionHistory={emotionHistory}
      />

      {/* Frustration Break Popup */}
      <AnimatePresence>
        {isPausedByEmotion && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <div className="bg-zinc-900 rounded-3xl border border-red-500/30 p-10 text-center max-w-md mx-4">
               <Coffee className="w-16 h-16 text-red-500 mx-auto mb-6 animate-bounce" />
               <h2 className="text-3xl font-bold text-white mb-4">You seem frustrated</h2>
               <p className="text-zinc-400 mb-8 text-lg">
                 Let's take a quick 2-minute break.
               </p>
               <div className="text-5xl font-mono font-bold text-red-500 mb-8">
                 {Math.floor(pauseCountdown / 60)}:{String(pauseCountdown % 60).padStart(2, '0')}
               </div>
               <button 
                onClick={() => setIsPausedByEmotion(false)}
                className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition font-bold"
               >
                 Resume Reading
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartReader;
