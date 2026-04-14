import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { learningApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Camera, Sparkles, AlertTriangle, AlertCircle, PlayCircle, PauseCircle } from "lucide-react";

export default function VideoPlayerPage() {
  const { user } = useAuth();
  const { lessonId } = useParams();
  const navigate = useNavigate();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [cameraAccess, setCameraAccess] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState("neutral");
  const [focusScore, setFocusScore] = useState(100);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [timeSpent, setTimeSpent] = useState(0);

  const mainVideoRef = useRef(null);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const lastLoggedTimeRef = useRef(Date.now());

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const data = await learningApi.getVideo(lessonId);
        setVideo(data);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch video details");
        setLoading(false);
      }
    };
    fetchVideo();
  }, [lessonId]);

  // Handle Webcam based on isPlaying state
  useEffect(() => {
    let stream = null;
    let timeInterval = null;

    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
        }
        console.log("Camera started");
        setCameraAccess(true);
        setStartTime(Date.now());
        
        // Start time tracking
        timeInterval = setInterval(() => {
          if (startTime) {
            setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
          }
        }, 1000);
      } catch (err) {
        console.error("Webcam access error:", err);
        setCameraAccess(false);
      }
    };

    const stopWebcam = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timeInterval) {
        clearInterval(timeInterval);
      }
      setCameraAccess(false);
      setStartTime(null);
    };

    if (isPlaying) {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [isPlaying, startTime]);

  // Capture Frame Every 90 Seconds
  useEffect(() => {
    if (!isPlaying || !cameraAccess) return;

    const captureAndAnalyze = async () => {
      if (webcamRef.current && canvasRef.current && overlayCanvasRef.current) {
        const videoEl = webcamRef.current;
        const canvasEl = canvasRef.current;
        const overlayEl = overlayCanvasRef.current;
        const context = canvasEl.getContext("2d");
        const overlayCtx = overlayEl.getContext("2d");

        canvasEl.width = videoEl.videoWidth || 640;
        canvasEl.height = videoEl.videoHeight || 480;
        overlayEl.width = videoEl.videoWidth || 640;
        overlayEl.height = videoEl.videoHeight || 480;

        context.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
        const base64Image = canvasEl.toDataURL("image/jpeg", 0.7);
        console.log("90-second emotion frame captured");

        try {
          const result = await learningApi.analyzeEmotion(base64Image);
          
          setDetectedEmotion(result.emotion);
          setFocusScore(result.focus);

          // Draw Bounding Box
          overlayCtx.clearRect(0, 0, overlayEl.width, overlayEl.height);
          if (result.box) {
             const { x, y, w, h } = result.box;
             overlayCtx.strokeStyle = result.emotion === 'no_face' ? 'red' : '#10B981'; // green or red
             overlayCtx.lineWidth = 4;
             overlayCtx.strokeRect(x, y, w, h);
          }

          const now = Date.now();
          // Log to DB every 90 seconds (90000 ms)
          if (now - lastLoggedTimeRef.current >= 90000) {
            console.log("90-second emotion logging triggered");
            setCaptureFlash(true);
            setTimeout(() => setCaptureFlash(false), 500);
            lastLoggedTimeRef.current = now;

            if (user) {
              const userId = user._id || user.id;
              if (userId) {
                console.log("API called for 90-second emotion logging");
                await learningApi.logEmotion(userId, lessonId, result.emotion, result.focus);
                console.log("Emotion data stored in DB (90-second interval)");
                
                // Get AI Suggestion dynamically
                const recommendation = await learningApi.getAdaptiveContent(userId);
                if (recommendation && recommendation.suggestion) {
                  setAiSuggestion({ message: recommendation.suggestion, action: recommendation.action });
                  setTimeout(() => setAiSuggestion(null), 6000);
                }
              }
            }
          } else {
            console.log(`Next emotion capture in ${Math.round((30000 - (now - lastLoggedTimeRef.current)) / 1000)}s`);
          }
        } catch (err) {
          console.error("[DEBUG Frontend Error] Failed to analyze/log emotion payload:", err);
        }
      }
    };

    // Every 30 seconds (30000 ms) for emotion capture and logging
    const interval = setInterval(captureAndAnalyze, 30000);
    return () => clearInterval(interval);
  }, [isPlaying, cameraAccess, lessonId, user]);

  // Trigger video_started
  const hasLoggedStart = useRef(false);
  useEffect(() => {
    if (isPlaying && !hasLoggedStart.current && user && (user._id || user.id)) {
        hasLoggedStart.current = true;
        learningApi.logEmotion(user._id || user.id, lessonId, "video_started", 100)
             .catch(err => console.error("Initial log error:", err));
    }
  }, [isPlaying, lessonId, user]);

  const getThemeClasses = () => {
    if (["confused", "sad"].includes(detectedEmotion)) return "from-blue-500/10 via-root-bg to-root-bg";
    if (["happy", "neutral", "surprise"].includes(detectedEmotion)) return "from-green-500/10 via-root-bg to-root-bg";
    if (["frustrated", "angry", "fear", "no_face"].includes(detectedEmotion)) return "from-red-500/10 via-root-bg to-root-bg";
    return "from-brand-500/10 via-root-bg to-root-bg";
  };

  const getEmotionColorText = () => {
    if (["happy", "neutral", "surprise"].includes(detectedEmotion)) return "text-green-500";
    if (["confused", "sad"].includes(detectedEmotion)) return "text-blue-500";
    if (["frustrated", "angry", "fear", "no_face"].includes(detectedEmotion)) return "text-red-500";
    return "text-brand-500";
  };

  return (
    <DashboardLayout>
      <div className={`transition-colors duration-1000 bg-gradient-to-br ${getThemeClasses()} absolute inset-0 -z-10`} />

      <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-glass-border shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-glass-hover rounded-xl transition text-text-subtle hover:text-root-fg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-root-fg capitalize">
              {loading ? "Loading..." : video?.title || "Video Lesson"}
            </h1>
          </div>
        </div>

        {/* Dynamic AI Suggestion */}
        <AnimatePresence>
          {aiSuggestion && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-24 right-10 z-50 flex items-center gap-3 glass-card bg-panel-bg p-4 rounded-2xl border-l-4 shadow-xl border-l-brand-500"
            >
              <Sparkles className="w-5 h-5 text-brand-500" />
              <div>
                <p className="text-xs text-brand-500 font-bold uppercase mb-1">AI Suggestion</p>
                <p className="text-sm font-semibold text-root-fg">{aiSuggestion.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
            <div className="flex-1 flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div>
        ) : error ? (
            <div className="flex-1 flex justify-center items-center"><p className="text-red-500">{error}</p></div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
            
            {/* Main Content (Video Player) */}
            <div className={`flex-1 glass-card overflow-hidden flex flex-col relative rounded-3xl border ${detectedEmotion === 'no_face' ? 'border-red-500/50' : 'border-glass-border'} shrink-0 transition-colors duration-500`}>
              <video 
                ref={mainVideoRef}
                className="w-full h-full object-cover bg-black"
                src={video?.video_url || video?.videoUrl || undefined} 
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
              
              {!isPlaying && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <PlayCircle className="w-24 h-24 text-white/50 mb-4 mx-auto" />
                        <h2 className="text-2xl font-bold text-white">Video Paused</h2>
                        <p className="text-white/70">Webcam tracking is paused</p>
                    </div>
                </div>
              )}
            </div>

            {/* Right Sidebar - Webcam & Analysis Dashboard */}
            <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
              
              <div className={`glass-card rounded-3xl overflow-hidden border ${captureFlash ? 'border-brand-500 shadow-[0_0_20px_rgba(var(--brand-500),0.5)]' : 'border-glass-border'} relative shrink-0 transition-all duration-300`}>
                <div className="bg-panel-bg p-4 flex justify-between items-center border-b border-glass-border">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-brand-500" />
                    <span className="text-sm font-semibold text-root-fg">Live Tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPlaying && cameraAccess ? (
                        <>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-xs text-red-500 font-bold uppercase tracking-wider">Rec</span>
                        </>
                    ) : (
                        <span className="text-xs text-text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                            <PauseCircle className="w-3 h-3" /> Paused
                        </span>
                    )}
                  </div>
                </div>
                
                <div className="h-48 bg-black/90 relative flex items-center justify-center overflow-hidden">
                  <video 
                      ref={webcamRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                  <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Glow overlay during flash/analysis */}
                  <div className={`w-3/4 h-3/4 border-2 border-dashed rounded-full flex flex-col items-center justify-center z-10 transition-colors duration-500 ${
                      detectedEmotion === 'no_face' ? 'border-red-500/50' : 'border-brand-500/50'
                  }`}>
                     <div className={`w-16 h-16 rounded-full blur-md mb-2 transition-all duration-500 ${
                         captureFlash ? 'bg-white opacity-80 scale-150' : 
                         (!isPlaying ? 'opacity-0' : detectedEmotion === 'no_face' ? 'bg-red-500/20 animate-pulse' : 'bg-brand-500/20 animate-pulse')
                     }`} />
                  </div>
                  
                  {/* Analysis Box */}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-10 flex justify-between items-end">
                    <div>
                        <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Live Emotion</p>
                        <motion.p 
                        key={detectedEmotion}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`font-bold text-lg capitalize drop-shadow-lg ${getEmotionColorText()}`}
                        >
                        {detectedEmotion.replace('_', ' ')}
                        </motion.p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Focus</p>
                        <p className={`font-bold text-lg ${focusScore > 80 ? 'text-green-500' : focusScore < 50 ? 'text-red-500' : 'text-yellow-500'}`}>{focusScore}%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel flex-1 rounded-3xl p-6 border border-glass-border flex flex-col justify-center items-center text-center">
                {detectedEmotion === 'no_face' ? (
                   <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                ) : focusScore > 80 ? (
                   <Sparkles className="w-12 h-12 text-green-500 mb-4" />
                ) : (
                   <AlertCircle className="w-12 h-12 text-blue-500 mb-4" />
                )}
                  <h3 className="text-lg font-bold text-root-fg mb-2">Cognitive State Flow</h3>
                <p className="text-sm text-text-muted mb-4">
                    {detectedEmotion === 'no_face' 
                        ? 'Ensure your face is visible to the camera for adaptive learning features.' 
                        : focusScore > 80 
                            ? 'Optimal focus state! Retention rate is highly elevated.'
                            : 'Focus seems to be dropping. AI will tailor recommendations smoothly.'}
                </p>
                <div className="text-xs text-text-subtle font-semibold bg-glass-hover px-3 py-2 rounded-lg border border-glass-border/30">
                  Time: {Math.floor(timeSpent / 60) > 0 ? `${Math.floor(timeSpent / 60)} min${Math.floor(timeSpent / 60) > 1 ? 's' : ''}` : `${timeSpent % 60}s`}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
