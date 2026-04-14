import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { learningApi } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, UserCheck, AlertCircle } from 'lucide-react';

export default function CameraTracker({ onEmotionUpdate, onFocusUpdate, interval = 3000, autoStart = false }) {
  const webcamRef = useRef(null);
  const [isActive, setIsActive] = useState(autoStart);
  const [error, setError] = useState(null);
  const [lastEmotion, setLastEmotion] = useState('neutral');
  const [lastFocus, setLastFocus] = useState(0);
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    if (autoStart) setIsActive(true);
  }, [autoStart]);

  useEffect(() => {
    let timer;
    if (isActive) {
      timer = setInterval(async () => {
        if (webcamRef.current) {
          const imageSrc = webcamRef.current.getScreenshot();
          if (imageSrc) {
            try {
              // Convert dataURL to base64
              const base64Image = imageSrc.split(',')[1];
              const result = await learningApi.analyzeEmotion(base64Image);
              
              if (result.emotion) {
                if (result.emotion === 'no_face') {
                  setError("Please adjust your position");
                } else {
                  setLastEmotion(result.emotion);
                  setLastFocus(result.focus || 0);
                  if (onEmotionUpdate) onEmotionUpdate(result.emotion, result.focus || 0);
                  if (onFocusUpdate) onFocusUpdate(result.focus || 0);
                  setError(null);
                }
              }
            } catch (err) {
              console.error("Camera Tracking Error:", err);
              setError("Analysis failed");
            }
          }
        }
        setRequestCount(prev => prev + 1);
      }, interval);
    }
    return () => clearInterval(timer);
  }, [isActive, interval, onEmotionUpdate, onFocusUpdate]);

  return (
    <div className="relative group">
      <div className="w-full aspect-video rounded-3xl overflow-hidden bg-gray-900 border-2 border-glass-border shadow-2xl relative">
        <AnimatePresence>
          {!isActive && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white"
            >
              <div className="w-16 h-16 rounded-full bg-glass-base flex items-center justify-center mb-4">
                <CameraOff className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-semibold mb-4">Camera is disabled</p>
              <button 
                onClick={() => setIsActive(true)}
                className="bg-brand-500 hover:bg-brand-600 px-6 py-2 rounded-xl transition-all shadow-lg"
              >
                Enable Tracking
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {isActive && (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            className="w-full h-full object-cover"
            onUserMediaError={() => setError("Camera access denied")}
          />
        )}

        {/* HUD Overlay */}
        <div className="absolute top-4 right-4 z-30 flex gap-2">
          {isActive && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">Live</span>
            </motion.div>
          )}
          <button 
            onClick={() => setIsActive(!isActive)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 transition-all"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Emotion Indicator */}
        <div className="absolute bottom-4 left-4 z-30">
          <AnimatePresence mode="wait">
            {isActive && !error && (
              <motion.div
                key={lastEmotion}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-brand-500/80 backdrop-blur-lg px-4 py-2 rounded-2xl border border-white/20 shadow-xl"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-white" />
                  <span className="text-sm font-bold text-white capitalize">{lastEmotion}</span>
                  <div className="w-px h-3 bg-white/30" />
                  <span className="text-sm font-bold text-white">{lastFocus}% Focus</span>
                </div>
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/80 backdrop-blur-lg px-4 py-2 rounded-2xl border border-white/20 shadow-xl flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white uppercase leading-none">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
