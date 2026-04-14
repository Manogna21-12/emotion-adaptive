import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, UserX, Camera } from "lucide-react";
import { learningApi } from "../services/api";

const CameraTracker = ({ onEmotionDetected, status, userId, lessonId }) => {

  const videoRef = useRef(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastEmotion, setLastEmotion] = useState("neutral");

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        // Aligned with LessonView: remove restrictive low resolution
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setLoading(false);
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const isAnalyzing = useRef(false);

  useEffect(() => {
    if (loading) return;

    const interval = setInterval(async () => {
      // 1. Prevent overlapping requests (important for ML backend)
      if (isAnalyzing.current || !videoRef.current) return;
      
      const video = videoRef.current;
      if (video.readyState < 2) return; // Ensure video is ready

      isAnalyzing.current = true;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvas.toDataURL("image/jpeg", 0.7); // Slightly lower quality for speed
      
      try {
        const response = await learningApi.analyzeEmotion(imageData);

        if (!response || response.emotion === "no_face" || response.emotion === "error") {
          setFaceDetected(false);
        } else {
          const emotion = response.emotion;
          setFaceDetected(true);
          setLastEmotion(emotion);
          if (onEmotionDetected) onEmotionDetected(emotion);
        }
      } catch (err) {
        console.error("[CameraTracker] API Error:", err.message);
        setFaceDetected(false);
      } finally {
        isAnalyzing.current = false;
      }
    }, 2000); // 2s interval to give the backend breathing room

    return () => clearInterval(interval);
  }, [loading, onEmotionDetected]);

  const emotionEmojis = {
    happy: "😊",
    neutral: "😐",
    sad: "😔",
    angry: "😠",
    surprise: "😲",
    fear: "😨",
    disgust: "🤢"
  };

  return (
    <div className="relative group">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-48 h-36 rounded-2xl overflow-hidden border-2 transition-colors duration-300 relative shadow-2xl ${
          faceDetected ? "border-emerald-500 shadow-emerald-500/20" : "border-red-500 shadow-red-500/20"
        }`}
      >
        {loading && (
          <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        <video 
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${loading ? "opacity-0" : "opacity-100"}`}
        />

        {/* Status Overlay */}
        <div className={`absolute bottom-0 left-0 right-0 py-1.5 px-3 text-[10px] font-bold flex items-center justify-between backdrop-blur-md ${
          faceDetected ? "bg-emerald-500/80 text-white" : "bg-red-500/80 text-white"
        }`}>
          <span className="flex items-center gap-1">
            {faceDetected ? <User className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
            {faceDetected ? "FACE DETECTED" : "NO FACE"}
          </span>
          {faceDetected && <span>{emotionEmojis[lastEmotion] || "😐"}</span>}
        </div>
      </motion.div>
      
      {/* Mini Label */}
      <AnimatePresence>
        {!faceDetected && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-10 left-0 right-0 bg-red-500 text-white text-[10px] font-bold py-1 px-2 rounded-lg text-center shadow-lg"
          >
            Please adjust your position ⚠️
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CameraTracker;
