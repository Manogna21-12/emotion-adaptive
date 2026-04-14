import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import CameraTracker from '../components/CameraTracker';
import { motion, AnimatePresence } from 'framer-motion';
import { smartReaderApi, convertDriveLink, learningApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import FrustrationPause from '../components/FrustrationPause';
import { 
  Book, 
  Sparkles, 
  BrainCircuit, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Info,
  ChevronRight,
  Target,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Card } from '../components/ui/Card';

export default function SmartReader() {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [viewMode, setViewMode] = useState('explorer'); // 'explorer' or 'reader'
  const [loading, setLoading] = useState(true);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [focusScore, setFocusScore] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  // Real-time Stats from DB
  const [stats, setStats] = useState({
    avg_focus: 0,
    time_spent: "0m 0s",
    retention_score: 0,
    dominant_emotion: "neutral"
  });

  const [frustrationPauseOpen, setFrustrationPauseOpen] = useState(false);
  
  const emotionDurationRef = useRef({ emotion: 'neutral', start: Date.now() });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const data = await smartReaderApi.getArticles();
      setArticles(data || []);
    } catch (err) {
      console.error("Failed to fetch articles:", err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTimeStats = useCallback(async () => {
    if (selectedArticle && user) {
        try {
            const data = await smartReaderApi.getStats(user.id || user._id, selectedArticle.id);
            setStats(data);
        } catch (err) {
            console.error("Failed to fetch reader stats:", err);
        }
    }
  }, [selectedArticle, user]);

  // Task 1 & 2: Reuse Learning Mode Camera + Auto Start
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraAccess, setCameraAccess] = useState(false);

  useEffect(() => {
    let stream;
    const startWebcam = async () => {
      if (viewMode === 'reader') {
        try {
          console.log("🔥 [SMART READER] Starting camera exactly like Learning Mode...");
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraAccess(true);
          console.log("✅ Camera started successfully");
        } catch (err) {
          console.error("❌ Camera access denied:", err);
          setCameraAccess(false);
        }
      }
    };
    startWebcam();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        console.log("🛑 Camera stopped");
      }
    };
  }, [viewMode]);

  // Task 3 & 4: Emotion Capture Pipeline (Every 3 seconds)
  useEffect(() => {
    if (!cameraAccess || viewMode !== 'reader' || !selectedArticle) return;

    const captureInterval = setInterval(async () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const base64Image = canvas.toDataURL('image/jpeg', 0.8);
            console.log("📸 Capture running...");

            try {
                const res = await learningApi.analyzeEmotion(base64Image.split('base64,')[1]);
                console.log("📊 Detected emotion:", res);

                if (res && res.emotion && res.emotion !== 'no_face') {
                    const emotion = res.emotion;
                    const focus = res.focus || 0;
                    setCurrentEmotion(emotion);
                    setFocusScore(focus);

                    // Track duration for stats tracking (can be extended later)
                    const now = Date.now();
                    if (emotionDurationRef.current.emotion !== emotion) {
                        emotionDurationRef.current = { emotion, start: now };
                    }

                    // Trigger pause for frustration
                    if (emotion === 'angry' || emotion === 'confused' || emotion === 'frustrated') {
                        if (!frustrationPauseOpen) {
                            setFrustrationPauseOpen(true);
                        }
                    }

                    // Task 4: Save to database (reader_emotion_logs)
                    console.log("🚀 API called (trackReaderEmotion)...");
                    const response = await smartReaderApi.trackReaderEmotion({
                        user_id: user.id || user._id,
                        document_id: selectedArticle.id,
                        emotion: emotion,
                        confidence: focus,
                        timestamp: new Date().toISOString()
                    });
                    console.log("✅ DB response:", response);
                } else if (res && res.emotion === 'no_face') {
                    console.warn("⚠️ face missing - adjust position");
                }
            } catch (err) {
                console.error("❌ Emotion capture/save failed:", err);
            }
        }
    }, 3000);

    return () => clearInterval(captureInterval);
  }, [cameraAccess, viewMode, selectedArticle, user]);


  // Task 5 & 6: Real-time dynamic fetch (Every 2 seconds)
  useEffect(() => {
    let fetchInterval;
    if (viewMode === 'reader' && selectedArticle && user) {
        console.log("📈 Starting 2s stats polling...");
        fetchInterval = setInterval(async () => {
            try {
                const data = await smartReaderApi.getReaderStats(user.id || user._id, selectedArticle.id);
                console.log("📉 Polled stats:", data);
                if (data && !data.error) {
                    setStats({
                        avg_focus: data.avg_focus || 0,
                        time_spent: data.time_spent || "0m 0s",
                        retention_score: data.retention || data.retention_score || 0,
                        dominant_emotion: data.dominant_emotion || "neutral"
                    });
                }
            } catch (err) {
                console.error("❌ Failed to fetch polled stats:", err);
            }
        }, 2000);
    }

    return () => {
        if (fetchInterval) {
            clearInterval(fetchInterval);
            console.log("🛑 Stats polling stopped");
        }
    };
  }, [viewMode, selectedArticle, user]);

  const startReading = (article) => {
    console.log("🚀 Starting camera and session for article:", article.id);
    setSelectedArticle(article);
    setViewMode('reader');
    setSessionStartTime(Date.now());
  };

  const exitReader = () => {
    setViewMode('explorer');
    setSelectedArticle(null);
    setSessionStartTime(null);
  };

  return (
    <>
    <DashboardLayout>
      <div className="h-full pb-8">
        
        <AnimatePresence mode="wait">
          {viewMode === 'explorer' ? (
            <motion.div 
              key="explorer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-8"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-500 shadow-lg">
                   <Book className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-root-fg">Smart Reader</h1>
                  <p className="text-text-muted font-bold">AI-Enhanced Reading & Emotion Tracking</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  [1, 2, 3].map(i => <Card key={i} className="h-64 bg-glass-hover animate-pulse rounded-[32px]" />)
                ) : (
                  (articles || []).map((article) => (
                    <motion.div
                      key={article.id}
                      whileHover={{ y: -10 }}
                      className="group cursor-pointer"
                      onClick={() => startReading(article)}
                    >
                      <Card className="overflow-hidden border-2 border-glass-border hover:border-brand-500/50 transition-all rounded-[32px] shadow-xl group-hover:shadow-2xl">
                        <div className="aspect-[16/10] relative">
                          <img 
                            src={article.image_url || 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5'} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            alt={article.title}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
                        </div>
                        <div className="p-6">
                          <h4 className="font-black text-xl text-root-fg mb-2 line-clamp-1">{article.title}</h4>
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1 text-xs text-text-muted font-bold">
                                <Clock className="w-3.5 h-3.5" /> {article.read_time}m
                              </div>
                              <div className="flex items-center gap-1 text-xs text-text-muted font-bold">
                                <Zap className="w-3.5 h-3.5 text-yellow-500" /> {article.difficulty}
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-brand-500 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            selectedArticle && (
            <motion.div 
              key="reader"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col gap-6"
            >
              {/* READER HEADER */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-glass-panel p-6 rounded-[32px] border border-glass-border shadow-lg">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={exitReader}
                    className="p-3 rounded-2xl bg-glass-base hover:bg-glass-hover text-brand-500 border border-glass-border transition-all"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-black text-root-fg">{selectedArticle.title}</h2>
                  </div>
                </div>

                <div className="flex items-center gap-8 px-6 py-2 bg-glass-base rounded-2xl border border-glass-border">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Time Spent</span>
                      <span className="text-lg font-black text-brand-500">{stats.time_spent}</span>
                   </div>
                   <div className="w-px h-8 bg-glass-border" />
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Avg Focus</span>
                      <span className="text-lg font-black text-orange-500">{stats.avg_focus}%</span>
                   </div>
                   <div className="w-px h-8 bg-glass-border" />
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Retention Score</span>
                      <span className="text-lg font-black text-green-500">{stats.retention_score}%</span>
                   </div>
                </div>
              </div>

              {/* MAIN CONTENT GRID */}
              <div className="grid grid-cols-12 gap-8">
                
                {/* PDF VIEWER */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
                  <div className="relative w-full aspect-[4/3] md:aspect-[16/10] bg-gray-900 rounded-[32px] overflow-hidden border-2 border-glass-border shadow-2xl">
                    <iframe 
                      src={convertDriveLink(selectedArticle.pdf_url) || "about:blank"}
                      className="w-full h-full border-0"
                      title={selectedArticle.title}
                      allow="autoplay"
                    />
                  </div>
                </div>

                {/* SIDEBAR: CAMERA & STATS */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                  
                  {/* Task 1: Auto-start Camera Logic (Integrated) */}
                  <div className="relative group rounded-[32px] overflow-hidden border-2 border-glass-border shadow-2xl bg-black aspect-video">
                    <video 
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover opacity-80"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Emotion HUD Overlay */}
                    <div className="absolute bottom-4 left-4 z-30">
                      <AnimatePresence mode="wait">
                        {cameraAccess && (
                          <motion.div
                            key={currentEmotion}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-brand-500/80 backdrop-blur-lg px-4 py-2 rounded-2xl border border-white/20 shadow-xl"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white capitalize">{currentEmotion}</span>
                              <div className="w-px h-3 bg-white/30" />
                              <span className="text-sm font-bold text-white">{focusScore}% Focus</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="absolute top-4 right-4 z-30">
                       <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">Live</span>
                       </div>
                    </div>
                  </div>

                  {/* Dynamic Stats Visualization */}
                  <Card className="p-6 bg-glass-panel border border-glass-border rounded-[32px] shadow-xl">
                    <div className="flex flex-col gap-6">
                       <div className="flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-500">
                             <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Session Duration</span>
                            <span className="text-xl font-black text-root-fg">{stats.time_spent}</span>
                          </div>
                       </div>

                       <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-orange-500" />
                              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Attention Level</span>
                            </div>
                            <span className="text-lg font-black text-orange-500">{stats.avg_focus}%</span>
                          </div>
                          <div className="h-2 w-full bg-glass-hover rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${stats.avg_focus}%` }}
                               className="h-full bg-orange-500"
                             />
                          </div>
                       </div>

                       <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-green-500" />
                              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Read Retention</span>
                            </div>
                            <span className="text-lg font-black text-green-500">{stats.retention_score}%</span>
                          </div>
                          <div className="h-2 w-full bg-glass-hover rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${stats.retention_score}%` }}
                               className="h-full bg-green-500"
                             />
                          </div>
                       </div>
                    </div>
                  </Card>

                  {/* Focus Tip */}
                  <div className="bg-glass-panel p-6 border border-glass-border rounded-[32px] shadow-sm italic text-sm text-text-muted text-center">
                    "Reading with active focus improves memory long-term by up to 2.5x."
                  </div>

                </div>

              </div>
            </motion.div>
            )
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>

    <FrustrationPause 
        isOpen={frustrationPauseOpen}
        onResume={() => {
            setFrustrationPauseOpen(false);
        }}
    />
    </>
  );
}
