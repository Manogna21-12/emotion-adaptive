import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Maximize, PlayCircle, FileText, CheckCircle, Video, ArrowLeft, Loader2, Sparkles, Frown, Zap, Coffee, AlertTriangle, PauseCircle } from "lucide-react";
import axios from 'axios';
import { learningApi, streakApi, adaptiveQuizApi } from '../services/api';
import { useAuth } from "../contexts/AuthContext";
import QuizLearningPopup from "../components/QuizLearningPopup";
import FrustrationPause from "../components/FrustrationPause";

const COURSE_CONTENT = {
  "emotion-ai-architecture": {
    title: "Emotion AI Architecture",
    videoTitle: "Neural Pathways & Emotion",
    videoPart: "Part 2 of 5",
    notesTitle: "Understanding Emotion AI",
    notesContent: "Emotion AI involves analyzing facial expressions, voice, and biometric data to infer human emotions. This allows systems to adapt dynamically to user states.",
    keyTakeaway: "Emotion AI builds on computer vision and natural language processing to decode real-time emotional states.",
    quizQuestion: "Which modality is NOT typically used in Emotion AI?",
    quizOptions: ["Facial Expressions", "Heart Rate", "Skeletal Structure", "Vocal Tone"],
    correctQuizOption: "Skeletal Structure"
  },
  "quantum-computing-basics": {
    title: "Quantum Computing Basics",
    videoTitle: "Qubits and Superposition",
    videoPart: "Part 1 of 4",
    notesTitle: "Quantum Mechanics for Computing",
    notesContent: "Unlike classical bits that are 0 or 1, qubits can exist in a superposition of states. This enables quantum computers to solve certain problems exponentially faster.",
    keyTakeaway: "Superposition allows a quantum computer to evaluate many possibilities simultaneously.",
    quizQuestion: "What is the basic unit of information in quantum computing?",
    quizOptions: ["Bit", "Byte", "Qubit", "Quantum"],
    correctQuizOption: "Qubit"
  },
  "advanced-react-patterns": {
    title: "Advanced React Patterns",
    videoTitle: "Custom Hooks & Context",
    videoPart: "Part 3 of 6",
    notesTitle: "Reusable Logic with Hooks",
    notesContent: "Custom hooks allow you to extract component logic into reusable functions. When combined with Context API, they provide a powerful state management solution.",
    keyTakeaway: "Abstracting logic into custom hooks keeps your components clean and declarative.",
    quizQuestion: "Which hook is used to consume context in React?",
    quizOptions: ["useEffect", "useContext", "useReducer", "useState"],
    correctQuizOption: "useContext"
  },
  "neural-networks-101": {
    title: "Neural Networks 101",
    videoTitle: "Backpropagation",
    videoPart: "Part 4 of 8",
    notesTitle: "Learning via Backpropagation",
    notesContent: "Backpropagation is the algorithm used to train neural networks. It computes the gradient of the loss function with respect to the weights by applying the chain rule.",
    keyTakeaway: "Weights are updated backward through the network to minimize predictive error.",
    quizQuestion: "What mathematical rule is the foundation of backpropagation?",
    quizOptions: ["Product Rule", "Chain Rule", "Quotient Rule", "Power Rule"],
    correctQuizOption: "Chain Rule"
  },
  "fluid-ui-animations": {
    title: "Fluid UI Animations",
    videoTitle: "Spring Physics",
    videoPart: "Part 2 of 3",
    notesTitle: "Natural Motion with Springs",
    notesContent: "Using spring physics rather than duration-based easing creates more natural and interruptible animations, significantly improving the perceived responsiveness of your UI.",
    keyTakeaway: "Springs depend on mass, tension, and friction rather than simple timing functions.",
    quizQuestion: "Which parameter does NOT typically belong to a spring physics model?",
    quizOptions: ["Tension", "Friction", "Mass", "Duration"],
    correctQuizOption: "Duration"
  },
  "building-deep-learning-models": {
    title: "Building Deep Learning Models",
    videoTitle: "Convolutional Layers",
    videoPart: "Part 5 of 10",
    notesTitle: "Feature Extraction with CNNs",
    notesContent: "Convolutional layers apply filters to input images to create feature maps. They are especially effective for visual data, capturing spatial hierarchies automatically.",
    keyTakeaway: "CNNs learn local patterns rather than global patterns, making them highly efficient for images.",
    quizQuestion: "What operation does a CNN use to reduce spatial dimensions?",
    quizOptions: ["Padding", "Convolution", "Pooling", "Activation"],
    correctQuizOption: "Pooling"
  },
  "default": {
    title: "Advanced Machine Learning",
    videoTitle: "Visual Recognition & OpenCV",
    videoPart: "Part 3 of 8",
    notesTitle: "Simplified Notes: OpenCV Basics",
    notesContent: "It seems the previous concept was tricky. Let's break it down into simpler terms. Computer vision is basically giving eyes to a computer!",
    keyTakeaway: "Images are represented as matrices of pixels. OpenCV helps manipulate these matrices to extract features like edges and faces.",
    quizQuestion: "What is the open-source library primarily used for computer vision in Python?",
    quizOptions: ["NumPy", "OpenCV", "Pandas", "Django"],
    correctQuizOption: "OpenCV"
  }
};

export default function LessonView() {
  const { user } = useAuth();
  const { courseName } = useParams();
  const navigate = useNavigate();
  const courseData = COURSE_CONTENT[courseName] || COURSE_CONTENT["default"];
  const [contentType, setContentType] = useState("video"); 
  const [detectedEmotion, setDetectedEmotion] = useState("neutral"); 
  const [notification, setNotification] = useState(null);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [cameraAccess, setCameraAccess] = useState(false);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [focusScore, setFocusScore] = useState(100);
  const [emotionTimeline, setEmotionTimeline] = useState([]);
  const [adaptiveQuizOpen, setAdaptiveQuizOpen] = useState(false);
  const [frustrationPauseOpen, setFrustrationPauseOpen] = useState(false);
  
  const emotionDurationRef = useRef({ emotion: 'neutral', start: Date.now() });
  const quizTriggeredRef = useRef(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const lastLoggedTimeRef = useRef(Date.now());

  // Initialize Webcam
  useEffect(() => {
    let stream;
    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        console.log("Camera started");
        setCameraAccess(true);
      } catch (err) {
        console.error("Camera access denied:", err);
        setCameraAccess(false);
        triggerNotification("Please allow camera access. AI tutoring requires it.", "red");
      }
    };
    startWebcam();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Frame Capture every 5s UI & 2m Log
  useEffect(() => {
    if (!cameraAccess) return;

    const captureFrame = async () => {
      if (videoRef.current && canvasRef.current && overlayCanvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const overlayEl = overlayCanvasRef.current;
        const context = canvas.getContext('2d');
        const overlayCtx = overlayEl.getContext("2d");
        
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        overlayEl.width = video.videoWidth || 640;
        overlayEl.height = video.videoHeight || 480;
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        console.log("Frame captured");
        
        try {
          const res = await learningApi.analyzeEmotion(base64Image);
          
          if (res && res.emotion) {
            handleEmotionDetection(res.emotion);
            setFocusScore(res.focus || 100);

            // Draw Bounding Box
            overlayCtx.clearRect(0, 0, overlayEl.width, overlayEl.height);
            if (res.box) {
               const { x, y, w, h } = res.box;
               overlayCtx.strokeStyle = res.emotion === 'no_face' ? 'red' : '#10B981'; // green or red
               overlayCtx.lineWidth = 4;
               overlayCtx.strokeRect(x, y, w, h);
            }
            
            const now = Date.now();
            if (now - lastLoggedTimeRef.current >= 30000) {
              setCaptureFlash(true);
              setTimeout(() => setCaptureFlash(false), 800);
              lastLoggedTimeRef.current = now;

              // Log to backend
              if (user && (user.id || user._id)) {
                const uid = user.id || user._id;
                console.log("API called");
                await learningApi.logEmotion(uid, courseName, res.emotion, res.focus || 100)
                  .catch(err => console.error("Failed to log emotion to DB:", err));

                // Get Adaptive Content
                const adaptiveData = await learningApi.getAdaptiveContent(uid);
                if (adaptiveData && adaptiveData.suggestion) {
                  triggerNotification(adaptiveData.suggestion, adaptiveData.action === 'alert_focus' ? 'red' : 'green');
                }
              }
            }
          }
        } catch (error) {
           console.error("Emotion API error:", error);
        }
      }
    };

    const interval = setInterval(() => {
      captureFrame();
    }, 1500);

    return () => clearInterval(interval);
  }, [cameraAccess]);

  // REAL-TIME TRACKING: Send 1-minute session heartbeats to backend
  useEffect(() => {
    if (!user || !(user.id || user._id)) return;
    const userId = user.id || user._id;

    const trackSession = async () => {
      console.log("⏱️ Sending 1-minute lesson heartbeat...");
      try {
        await streakApi.heartbeat(userId, 1); // 1 minute
        console.log("✅ [LIVE] Lesson heartbeat success. UI Synced.");
        triggerNotification("⏱️ Stay focused! +1 Minute learning streak saved.", "green");
      } catch (err) {
        console.error("❌ Lesson heartbeat failed:", err);
      }
    };

    // Initial heartbeat
    trackSession();

    const interval = setInterval(trackSession, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [user]);

  // Trigger video_started on play
  const hasLoggedStart = useRef(false);
  useEffect(() => {
    if (isPlaying && !hasLoggedStart.current && user && (user.id || user._id) && contentType === "video") {
        hasLoggedStart.current = true;
        learningApi.logEmotion(user.id || user._id, courseName, "video_started", 100)
             .catch(err => console.error("Initial log error:", err));
    }
  }, [isPlaying, courseName, user, contentType]);

  const handleEmotionDetection = (emotion) => {
    setDetectedEmotion(emotion);
    
    // update timeline
    setEmotionTimeline(prev => {
        const newTimeline = [...prev, { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), emotion }];
        // calculate focus score from last 5 captures
        const recentEmotions = newTimeline.slice(-5);
        const focusedCount = recentEmotions.filter(e => ["happy", "neutral", "focused", "surprise"].includes(e.emotion)).length;
        setFocusScore(Math.round((focusedCount / recentEmotions.length) * 100) || 100);
        return newTimeline;
    });

    switch(emotion) {
      case "happy":
      case "focused":
      case "neutral":
      case "surprise":
        // Track duration for adaptive quiz
        const now = Date.now();
        if (emotionDurationRef.current.emotion !== emotion) {
           emotionDurationRef.current = { emotion, start: now };
        } else {
           const duration = (now - emotionDurationRef.current.start) / 1000;
           // Prompt: happy + focus > 90 continuously for 2 minutes → Set difficulty = HARD
           // (For demo purposes and UX, I'll trigger it after 30-60s of sustained high performance if focus is good)
           if (emotion === 'happy' && focusScore > 90 && duration > 60 && !quizTriggeredRef.current) {
              setAdaptiveQuizOpen(true);
              quizTriggeredRef.current = true;
           } else if (emotion === 'neutral' && focusScore > 80 && duration > 120 && !quizTriggeredRef.current) {
              setAdaptiveQuizOpen(true);
              quizTriggeredRef.current = true;
           }
        }
        if (!isPlaying && !frustrationPauseOpen) setIsPlaying(true);
        break;
      case "bored":
        if (contentType !== "quiz") {
          triggerNotification("You seem bored, switching to quiz!", "cyan");
          setContentType("quiz");
        }
        break;
      case "confused":
      case "fear":
      case "angry":
      case "disgust":
        // Prompt: angry or frustrated → PAUSE SYSTEM: Resume after 2 minutes automatically
        if (emotion === 'angry' || emotion === 'confused') {
           if (!frustrationPauseOpen) {
              setFrustrationPauseOpen(true);
              setIsPlaying(false);
           }
        }
        if (contentType !== "notes") {
          triggerNotification("You look confused. Let's review the notes.", "orange");
          setContentType("notes");
        }
        break;
      case "sad":
        triggerNotification("You seem tired/sad. Take a quick break.", "blue");
        break;
      case "no_face":
        triggerNotification("No face detected! Pausing video.", "red");
        setIsPlaying(false);
        break;
      default:
        break;
    }
  };

  const triggerNotification = (message, color) => {
    setNotification({ message, color });
    setTimeout(() => setNotification(null), 4000);
  };

  const getThemeClasses = () => {
    if (["confused", "fear", "angry"].includes(detectedEmotion)) return "from-orange-500/10 via-root-bg to-root-bg";
    if (["bored", "sad"].includes(detectedEmotion)) return "from-cyan-500/10 via-root-bg to-root-bg";
    if (detectedEmotion === "no_face") return "from-red-500/10 via-root-bg to-root-bg";
    return "from-brand-500/10 via-root-bg to-root-bg";
  };
  
  const getEmotionColorText = () => {
    if (["happy", "neutral", "focused", "surprise"].includes(detectedEmotion)) return "text-green-500";
    if (["confused", "fear", "angry"].includes(detectedEmotion)) return "text-orange-500";
    if (["bored", "sad"].includes(detectedEmotion)) return "text-cyan-500";
    if (detectedEmotion === "no_face") return "text-red-500";
    return "text-gray-300";
  };

  return (
    <>
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
            <h1 className="text-2xl font-bold text-root-fg capitalize">{courseData.title}</h1>
          </div>
          
          <div className="flex items-center gap-3 bg-glass-base rounded-xl p-1 shrink-0">
            <button
              onClick={() => setContentType("video")}
              className={`p-2 px-4 rounded-xl flex items-center gap-2 transition-all ${contentType === "video" ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30" : "text-text-muted hover:text-root-fg"}`}
            >
              <Video className="w-4 h-4" /> <span className="text-sm font-medium">Video</span>
            </button>
            <button
              onClick={() => setContentType("notes")}
              className={`p-2 px-4 rounded-xl flex items-center gap-2 transition-all ${contentType === "notes" ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30" : "text-text-muted hover:text-root-fg"}`}
            >
              <FileText className="w-4 h-4" /> <span className="text-sm font-medium">Notes</span>
            </button>
            <button
              onClick={() => setContentType("quiz")}
              className={`p-2 px-4 rounded-xl flex items-center gap-2 transition-all ${contentType === "quiz" ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30" : "text-text-muted hover:text-root-fg"}`}
            >
              <CheckCircle className="w-4 h-4" /> <span className="text-sm font-medium">Quiz</span>
            </button>
          </div>
        </div>

        {/* Dynamic Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-24 right-10 z-50 flex items-center gap-3 glass-card bg-panel-bg p-4 rounded-2xl border-l-4 shadow-xl"
              style={{ borderLeftColor: 
                notification.color === "orange" ? "#f97316" : 
                notification.color === "cyan" ? "#06b6d4" : 
                notification.color === "red" ? "#ef4444" : 
                notification.color === "blue" ? "#3b82f6" : "#22c55e" }}
            >
              {notification.color === "red" ? <AlertTriangle className={`w-5 h-5 text-red-500`} /> : <Sparkles className={`w-5 h-5 text-${notification.color}-500`} />}
              <p className="text-sm font-semibold text-root-fg">{notification.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
          
          {/* Main Content (Adaptive) */}
          <div className={`flex-1 glass-card overflow-hidden flex flex-col relative rounded-3xl border ${detectedEmotion==='no_face' ? 'border-red-500/50' : 'border-glass-border'} shrink-0 transition-colors duration-500`}>
            
            {contentType === "video" && !isPlaying && detectedEmotion === 'no_face' && (
                <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                    <PauseCircle className="w-24 h-24 text-red-500 mb-4 animate-pulse" />
                    <h2 className="text-3xl font-bold text-white mb-2">Video Paused</h2>
                    <p className="text-red-400 font-medium text-lg">Face tracking lost. Please look at the camera to resume.</p>
                </div>
            )}
            
            <AnimatePresence mode="wait">
              {contentType === "video" && (
                <motion.div 
                  key="video"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full flex items-center justify-center bg-black relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  {isPlaying ? (
                    <PlayCircle className="w-20 h-20 text-white/50 hover:text-white transition-colors cursor-pointer z-10" onClick={() => setIsPlaying(false)} />
                  ) : (
                    <PauseCircle className="w-20 h-20 text-white/80 hover:text-white transition-colors cursor-pointer z-10" onClick={() => setIsPlaying(true)} />
                  )}
                  <div className="absolute bottom-6 left-6 z-10">
                    <h3 className="text-2xl font-bold text-white">{courseData.videoTitle}</h3>
                    <p className="text-gray-300 mt-2">{courseData.videoPart}</p>
                  </div>
                </motion.div>
              )}
              {contentType === "notes" && (
                <motion.div 
                  key="notes"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full p-8 overflow-y-auto"
                >
                  <div className="max-w-3xl mx-auto space-y-6 mt-4">
                    <h2 className="text-3xl font-bold text-root-fg mb-8 border-b border-glass-border pb-4">{courseData.notesTitle}</h2>
                    <p className="text-lg text-text-muted leading-relaxed font-light">
                      {courseData.notesContent}
                    </p>
                    <div className="bg-orange-500/10 border border-orange-500/30 p-6 rounded-2xl flex gap-4 mt-6">
                      <Sparkles className="w-6 h-6 text-orange-500 shrink-0" />
                      <div>
                        <h4 className="text-orange-500 font-semibold mb-2">Key Takeaway</h4>
                        <p className="text-root-fg">{courseData.keyTakeaway}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {contentType === "quiz" && (
                <motion.div 
                  key="quiz"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full p-8 flex flex-col items-center justify-center"
                >
                  <div className="max-w-2xl w-full mx-auto text-center">
                    <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Zap className="w-8 h-8 text-cyan-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-root-fg mb-8">Pop Quiz: Stay Engaged!</h2>
                    <p className="text-lg text-text-muted mb-8 font-medium">{courseData.quizQuestion}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courseData.quizOptions.map((opt) => (
                        <button 
                          key={opt} 
                          onClick={() => {
                            if (opt === courseData.correctQuizOption) {
                                triggerNotification("Correct! Incredible focus.", "cyan");
                                setTimeout(() => setContentType("video"), 2000);
                            } else {
                                triggerNotification("Incorrect. Try again!", "orange");
                            }
                          }}
                          className="p-4 rounded-2xl border border-glass-border bg-glass-base hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:scale-105 transition-all outline-none text-left"
                        >
                          <span className="font-semibold text-root-fg block text-center">{opt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar - Camera & AI Panel */}
          <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
            
            <div className={`glass-card rounded-3xl overflow-hidden border ${captureFlash ? 'border-brand-500 shadow-[0_0_20px_rgba(var(--brand-500),0.5)]' : 'border-glass-border'} relative shrink-0 transition-all duration-300`}>
              <div className="bg-panel-bg p-4 flex justify-between items-center border-b border-glass-border">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-brand-500" />
                  <span className="text-sm font-semibold text-root-fg">Live AI Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="text-xs text-red-500 font-bold uppercase tracking-wider">Rec</span>
                </div>
              </div>
              
              <div className="h-48 bg-black/90 relative flex items-center justify-center overflow-hidden">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
                <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Glow ring mimicking facial scanning */}
                <div className={`w-3/4 h-3/4 border-2 border-dashed rounded-full flex flex-col items-center justify-center z-10 transition-colors duration-500 ${
                    detectedEmotion === 'no_face' ? 'border-red-500/50' : 'border-brand-500/50'
                }`}>
                   <div className={`w-16 h-16 rounded-full blur-md mb-2 transition-all duration-500 ${
                       captureFlash ? 'bg-white opacity-80 scale-150' : 
                       detectedEmotion === 'no_face' ? 'bg-red-500/20 animate-pulse' : 'bg-brand-500/20 animate-pulse'
                   }`} />
                </div>
                
                {/* AI Overlay Stats */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-10">
                  <p className="text-xs text-white/70 uppercase tracking-wider font-semibold">Detected State:</p>
                  <motion.p 
                    key={detectedEmotion}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring" }}
                    className={`font-bold text-lg capitalize drop-shadow-lg ${getEmotionColorText()}`}
                  >
                    {detectedEmotion.replace('_', ' ')}
                  </motion.p>
                </div>
              </div>
            </div>

            <div className="glass-panel flex-1 rounded-3xl p-6 border border-glass-border flex flex-col">
              <h3 className="text-sm font-bold text-text-subtle uppercase tracking-wider mb-4">Focus Optimizer</h3>
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-4">
                   <Sparkles className="w-8 h-8 text-brand-500" />
                </div>
                <p className="text-sm text-text-muted font-medium mb-6">
                  Content adapts dynamically based on emotion.
                </p>
                
                <div className="w-full">
                  <div className="flex justify-between text-xs font-medium mb-2 text-text-subtle">
                    <span>Engagement Level</span>
                    <span className="text-brand-500">{focusScore}%</span>
                  </div>
                  <div className="h-2 w-full bg-glass-base rounded-full overflow-hidden border border-glass-border">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-brand-500 to-cyan-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${focusScore}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
                
                {emotionTimeline.length > 0 && (
                    <div className="mt-6 w-full text-left">
                        <h4 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-2">Recent Timeline</h4>
                        <div className="space-y-2 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                            {[...emotionTimeline].reverse().slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-lg bg-glass-base border border-glass-border">
                                    <span className="text-text-muted">{item.time}</span>
                                    <span className="capitalize text-root-fg font-medium">{item.emotion.replace('_', ' ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
              </div>
            </div>

          </div>

        </div>
      </div>

    </DashboardLayout>
    <QuizLearningPopup 
        isOpen={adaptiveQuizOpen}
        onClose={() => {
          setAdaptiveQuizOpen(false);
          // Wait 5 minutes before triggering again
          setTimeout(() => { quizTriggeredRef.current = false; }, 300000);
        }}
        courseId={courseName}
        moduleId="dynamic_mod"
        lessonId={courseName}
        topic="General"
        currentEmotion={detectedEmotion}
        focusScore={focusScore}
        userId={user?.id || user?._id}
      />

      <FrustrationPause 
        isOpen={frustrationPauseOpen}
        onResume={() => {
          setFrustrationPauseOpen(false);
          setIsPlaying(true);
        }}
      />
    </>
  );
}