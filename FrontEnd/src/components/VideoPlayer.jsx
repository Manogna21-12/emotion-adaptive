import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Play, Camera, CameraOff, Zap, AlertTriangle, Coffee } from "lucide-react";
import LessonFeedbackModal from "./LessonFeedbackModal";
import { learningApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import QuizLearningPopup from "./QuizLearningPopup";
import FrustrationPause from "./FrustrationPause";

export default function VideoPlayer({ lesson, nextLesson }) {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const isWebcamActiveRef = useRef(false);
  const sessionIdRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState(lesson?.emotionTag || "Neutral");
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [faceBox, setFaceBox] = useState(null);
  const lastLoggedTimeRef = useRef(Date.now());
  const startTimeRef = useRef(null);
  const timeSpentRef = useRef(0);
  const [timeSpent, setTimeSpent] = useState(0);

  const [askedQuizIds, setAskedQuizIds] = useState([]);
  const [isQuizEnabled, setIsQuizEnabled] = useState(() => {
    const saved = localStorage.getItem("quizMode");
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Adaptive triggers
  const [adaptiveQuizOpen, setAdaptiveQuizOpen] = useState(false);
  const [frustrationPauseOpen, setFrustrationPauseOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);
  const emotionDurationRef = useRef({ emotion: 'neutral', start: Date.now() });
  const quizTriggeredRef = useRef(false);
  const quizTimerRef = useRef(0); // Track play time for 30s quiz trigger

  // Listen for quiz mode changes from navbar
  useEffect(() => {
    const handleQuizModeChange = () => {
      const saved = localStorage.getItem("quizMode");
      setIsQuizEnabled(saved !== null ? JSON.parse(saved) : true);
    };
    window.addEventListener("quizModeChanged", handleQuizModeChange);
    return () => window.removeEventListener("quizModeChanged", handleQuizModeChange);
  }, []);

  useEffect(() => {
    if (lesson) {
      setCurrentEmotion(lesson.emotionTag || "Neutral");
      if (videoRef.current) {
        videoRef.current.load();
        // The play() action will trigger onPlay which handles the webcam locally
        videoRef.current.play().catch(e => console.log("Autoplay prevented:", e));
      }
    }
  }, [lesson]);

  const startWebcam = async () => {
    try {
      if (isWebcamActiveRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
      }
      setWebcamEnabled(true);
      isWebcamActiveRef.current = true;

      // Start capturing frames immediately and then every 10 seconds for emotion analysis
      captureFrame();
      captureIntervalRef.current = setInterval(captureFrame, 10000);
      console.log("[Webcam] Started - Capturing every 10 seconds");
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    setWebcamEnabled(false);
    isWebcamActiveRef.current = false;
    console.log("[Webcam] Stopped");
  };

  const captureFrame = async () => {
    // Only capture if webcam is active
    if (!isWebcamActiveRef.current || !webcamRef.current || !canvasRef.current) return;
    
    console.log("Frame captured");
    
    const video = webcamRef.current;
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const context = canvas.getContext("2d");
    const overlayCtx = overlayCanvas?.getContext("2d");
    
    // Fixed snapshot dimension for faster processing
    canvas.width = 320;
    canvas.height = 240;
    
    if (overlayCanvas) {
      overlayCanvas.width = 320;
      overlayCanvas.height = 240;
    }
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL("image/jpeg").split(",")[1];
    
    try {
      console.log("DeepFace running");
      const res = await learningApi.analyzeEmotion(base64Image);
      
      if (res && res.emotion) {
        console.log(`Emotion detected: ${res.emotion}`);
        
        // Draw bounding box if face detected
        if (overlayCtx && res.box) {
          overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
          
          const { x, y, w, h } = res.box;
          // Scale coordinates to match canvas size
          const vWidth = video.videoWidth || 320;
          const vHeight = video.videoHeight || 240;
          const scaleX = overlayCanvas.width / vWidth;
          const scaleY = overlayCanvas.height / vHeight;
          
          overlayCtx.strokeStyle = res.emotion === 'no_face' ? '#EF4444' : '#10B981'; // red or green
          overlayCtx.lineWidth = 3;
          const rectX = x * scaleX;
          const rectY = y * scaleY;
          const rectW = w * scaleX;
          const rectH = h * scaleY;
          overlayCtx.strokeRect(rectX, rectY, rectW, rectH);
          
          // Draw Emotion Name Label
          overlayCtx.fillStyle = res.emotion === 'no_face' ? '#EF4444' : '#10B981';
          overlayCtx.font = "bold 14px Inter, system-ui, sans-serif";
          const label = res.emotion.toUpperCase();
          const textWidth = overlayCtx.measureText(label).width;
          
          // Label background
          overlayCtx.fillRect(rectX, rectY - 25, textWidth + 10, 20);
          // Label text
          overlayCtx.fillStyle = "white";
          overlayCtx.fillText(label, rectX + 5, rectY - 10);
          
          setFaceBox(res.box);
        } else if (overlayCtx) {
          overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
          setFaceBox(null);
        }
        
        if (res.emotion !== 'no_face' && res.emotion !== 'error') {
          const titleCaseEmo = res.emotion.charAt(0).toUpperCase() + res.emotion.slice(1);
          setCurrentEmotion(titleCaseEmo);
          
          // Adaptive System Logic
          const now = Date.now();
          const emotion = res.emotion.toLowerCase();
          const focus = res.focus || 0;

          if (emotionDurationRef.current.emotion !== emotion) {
            emotionDurationRef.current = { emotion, start: now };
          }

          const duration = (now - emotionDurationRef.current.start) / 1000;

          // 1. Mindful Break Trigger (Frustration/Stress > 30s)
          if (["angry", "fear", "disgust", "stressed"].includes(emotion) && duration > 30) {
            if (!frustrationPauseOpen) {
              setFrustrationPauseOpen(true);
              if (videoRef.current) videoRef.current.pause();
            }
          }
        } else {
          setCurrentEmotion(res.emotion === 'no_face' ? 'No Face' : 'Error');
        }
        
        // Execute flash effect natively upon successful processing (~200ms white overlay)
        setCaptureFlash(true);
        setTimeout(() => setCaptureFlash(false), 200);

        // Always log to database on every 10-second interval capture (syncing with standard loop)
        if (lesson && lesson.id && user) {
          const userId = user._id || user.id;
          if (userId) {
            await learningApi.logEmotion(
              userId,
              lesson.id,
              res.emotion,
              res.focus || 0
            );
          }
        }

      }
    } catch (err) {
      console.error("Emotion analysis failed via api:", err);
      // Clear overlay on error
      if (overlayCtx) {
        overlayCtx.clearRect(0, 0, overlayCanvas?.width || 320, overlayCanvas?.height || 240);
      }
      setFaceBox(null);
    }
  };

  const handlePlay = async () => {
    setIsPlaying(true);
    startWebcam();
    // Start time tracking
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
      console.log("Time tracking started");
      try {
        const userId = user?._id || user?.id;
        if (userId && lesson?.id) {
          const res = await learningApi.startSession(userId, lesson.moduleId || "active_course", lesson.id);
          sessionIdRef.current = res.session_id;
          console.log("Started active backend session tracker: ", res.session_id);
        }
      } catch (err) {
        console.error("Failed to start session API mapping:", err);
      }
    }
  };

  const handlePauseOrEnd = () => {
    setIsPlaying(false);
    stopWebcam();
    // Stop time tracking
    if (startTimeRef.current) {
      const sessionTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      timeSpentRef.current += sessionTime;
      startTimeRef.current = null;
      setTimeSpent(timeSpentRef.current);
      console.log(`Time tracking stopped. Session time: ${sessionTime}s, Total: ${timeSpentRef.current}s`);
      
      if (sessionIdRef.current) {
         learningApi.endSession(sessionIdRef.current, Math.max(1, Math.floor(timeSpentRef.current / 60)))
           .catch(err => console.error(err));
      }
    }
  };

  const handleEnded = () => {
    handlePauseOrEnd();
    if (!isVideoCompleted) {
      setIsVideoCompleted(true);
      setFeedbackOpen(true);
      console.log("[VideoPlayer] Video fully completed. Triggering lesson feedback modal...");
    }
  };

  const handleFeedbackClose = () => {
    setFeedbackOpen(false);
    // After feedback is done (submitted or skipped), proceed to next lesson if available
    if (nextLesson) {
      console.log("[VideoPlayer] Feedback handled. Moving to next lesson...");
      nextLesson();
    }
  };

  // Update time spent every second while playing
  useEffect(() => {
    let interval;
    if (isPlaying && startTimeRef.current && !adaptiveQuizOpen && !frustrationPauseOpen) {
      interval = setInterval(() => {
        const currentSession = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const total = timeSpentRef.current + currentSession;
        setTimeSpent(total);
        
          // 30 Seconds Quiz Trigger (Active Play Time)
          quizTimerRef.current += 1;
          if (quizTimerRef.current >= 30 && isQuizEnabled) {
            quizTimerRef.current = 0; // Reset for next interval
            
            const emotion = currentEmotion.toLowerCase();
            // Skip if angry/frustrated (handled by frustration logic) or no face
            if (emotion === 'angry' || emotion === 'frustrated' || emotion === 'no face' || emotion === 'error') {
              console.log("[Quiz System] Skipping quiz due to state:", emotion);
            } else {
              console.log("[Quiz System] 30s trigger reached. Launching quiz...");
              setAdaptiveQuizOpen(true);
              if (videoRef.current) videoRef.current.pause();
            }
          }

        // Poll sync session active duration strictly every 30 seconds to the DB natively
        if (total > 0 && total % 30 === 0 && sessionIdRef.current) {
           learningApi.endSession(sessionIdRef.current, Math.max(1, Math.floor(total / 60))).catch(console.error);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, adaptiveQuizOpen, frustrationPauseOpen, currentEmotion, isQuizEnabled]);

  // Tab switching protection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        console.log("[System] Tab switched - Pausing playback");
        if (videoRef.current) videoRef.current.pause();
        handlePauseOrEnd();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPlaying]);

  // Cleanup on unmount or lesson change
  useEffect(() => {
    return () => {
      stopWebcam();
      // Save final time spent
      if (startTimeRef.current) {
        const sessionTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        timeSpentRef.current += sessionTime;
        setTimeSpent(timeSpentRef.current);
        
        if (sessionIdRef.current) {
           learningApi.endSession(sessionIdRef.current, Math.max(1, Math.floor(timeSpentRef.current / 60))).catch(console.error);
        }
      }
    };
  }, [lesson]);

  if (!lesson) {
    return (
      <div className="flex-1 glass-card rounded-3xl border border-glass-border flex flex-col justify-center items-center text-center p-8 bg-glass-base shadow-sm">
         <div className="w-16 h-16 rounded-full border border-glass-border flex items-center justify-center bg-glass-hover mb-4">
             <Play className="w-8 h-8 text-text-subtle ml-1" />
         </div>
         <h2 className="text-2xl font-bold text-root-fg">Select a lesson to begin</h2>
         <p className="text-text-muted mt-2">Choose a lesson from the left sidebar to start learning.</p>
      </div>
    );
  }

  // Live styling based on the current analyzed emotion
  const emotionStyle = 
    ["Focused", "Happy", "Surprise"].includes(currentEmotion) ? "bg-green-500/20 text-green-500 border-green-500/30" :
    ["Stressed", "Sad", "Fear", "Angry", "Disgust"].includes(currentEmotion) ? "bg-orange-500/20 text-orange-500 border-orange-500/30" :
    "bg-cyan-500/20 text-cyan-500 border-cyan-500/30";

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 relative">
      
      {/* Video Viewport */}
      <motion.div 
        key={lesson.id}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-card rounded-3xl overflow-hidden border border-glass-border shadow-xl bg-black relative flex-shrink-0"
      >
        <video 
          ref={videoRef}
          controls
          onPlay={handlePlay}
          onPause={handlePauseOrEnd}
          onEnded={handleEnded}
          className="w-full aspect-video object-cover"
          poster="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1600&q=80"
        >
          {lesson.videoUrl ? (
            <source src={lesson.videoUrl} type="video/mp4" />
          ) : null}
          Your browser does not support HTML5 video.
        </video>
        
        {/* Soft bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      </motion.div>

      {/* Picture-in-Picture Webcam View */}
      <div 
         className={`absolute bottom-32 right-6 w-28 md:w-40 aspect-video rounded-2xl overflow-hidden border-2 shadow-[0_0_25px_rgba(0,0,0,0.5)] transition-all duration-700 z-20 pointer-events-none
         ${webcamEnabled ? 'opacity-100 translate-y-0 border-brand-500/60 shadow-brand-500/20' : 'opacity-0 translate-y-8 border-transparent'}`}
      >
          <video ref={webcamRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100 bg-gray-900" />
          <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" />
          
          {/* Flash overlay */}
          {captureFlash && (
            <div className="absolute inset-0 bg-white opacity-60 z-20 pointer-events-none animate-pulse" />
          )}
          
          <div className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-lg backdrop-blur-md">
             {webcamEnabled ? <Camera className="w-3.5 h-3.5 text-brand-500 animate-pulse" /> : <CameraOff className="w-3.5 h-3.5 text-red-500" />}
          </div>
          <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md">
             <span className="text-[10px] font-bold text-white uppercase tracking-wider">Live Scan</span>
          </div>
          {faceBox && (
            <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md">
               <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Face Detected</span>
            </div>
          )}
      </div>
      
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />


      {/* Metadata Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 flex-1 bg-glass-base border border-glass-border rounded-3xl p-6 lg:p-8 flex flex-col gap-4 overflow-y-auto custom-scrollbar relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 blur-[50px] pointer-events-none group-hover:bg-brand-500/10 transition-colors duration-700" />
        
        <div className="relative z-10 flex justify-between items-start gap-4 flex-wrap pb-4 border-b border-glass-border/50">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-root-fg tracking-tight">
              {lesson.title}
            </h1>
            <div className="flex items-center gap-4 mt-3">
               <span className="text-sm font-semibold text-text-subtle bg-panel-bg px-3 py-1 rounded-md border border-glass-border">
                  Duration: {lesson.duration}
               </span>
               <span className="text-sm font-semibold text-text-subtle bg-panel-bg px-3 py-1 rounded-md border border-glass-border">
                  Time: {Math.floor(timeSpent / 60) > 0 ? `${Math.floor(timeSpent / 60)} min${Math.floor(timeSpent / 60) > 1 ? 's' : ''}` : `${timeSpent % 60}s`}
               </span>
               <span className="text-sm font-semibold text-text-subtle bg-panel-bg px-3 py-1 rounded-md border border-glass-border/30 flex items-center gap-1.5">
                  <Camera className={`w-3.5 h-3.5 ${webcamEnabled ? 'text-brand-500' : 'text-text-muted'}`} />
                  {webcamEnabled ? 'Monitoring' : 'Standby'}
               </span>
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-xl border text-sm font-bold flex items-center gap-2 uppercase tracking-wider shrink-0 shadow-sm transition-colors duration-500 ${emotionStyle}`}>
              <Activity className={`${webcamEnabled ? 'animate-pulse' : ''} w-5 h-5`} /> {currentEmotion}
          </div>
        </div>
        
        <p className="relative z-10 text-text-muted leading-relaxed font-medium mt-2">
          {lesson.description || "In this module, you will cover essential techniques. Ensure you closely follow the examples and apply the concepts dynamically to maximize retention."}
        </p>
      </motion.div>

      <QuizLearningPopup 
        isOpen={adaptiveQuizOpen}
        onClose={() => {
          setAdaptiveQuizOpen(false);
          if (videoRef.current) videoRef.current.play();
        }}
        courseId={lesson.courseId || "default"}
        moduleId={lesson.moduleId || "default"}
        lessonId={lesson.id || lesson._id}
        topic={lesson.title}
        currentEmotion={currentEmotion.toLowerCase()}
        focusScore={timeSpent > 0 ? 85 : 0} // Mocking current focus for now
        userId={user?.id || user?._id}
        askedQuizIds={askedQuizIds}
        onQuestionFetched={(id) => setAskedQuizIds(prev => [...prev, id])}
      />

      <FrustrationPause 
        isOpen={frustrationPauseOpen}
        onResume={() => {
          setFrustrationPauseOpen(false);
          if (videoRef.current) videoRef.current.play();
          emotionDurationRef.current = { emotion: 'neutral', start: Date.now() };
        }}
      />

      <LessonFeedbackModal
        isOpen={feedbackOpen}
        onClose={handleFeedbackClose}
        userId={user?.id || user?._id}
        courseId={lesson.courseId || "default"}
        moduleId={lesson.moduleId || "default"}
        lessonId={lesson.id || lesson._id}
      />

    </div>
  );
}
