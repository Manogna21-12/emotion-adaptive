import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Timer, Info, Sparkles } from 'lucide-react';
import { Card } from './ui/Card';

export default function FrustrationPause({ isOpen, onResume }) {
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(120);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onResume();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onResume]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md text-center"
      >
        <div className="mb-8 flex justify-center">
            <div className="relative">
                <div className="absolute inset-0 bg-brand-500 blur-3xl opacity-20 animate-pulse" />
                <div className="w-24 h-24 bg-brand-500/10 rounded-full flex items-center justify-center border-2 border-brand-500/30 relative z-10">
                    <Coffee className="w-10 h-10 text-brand-500" />
                </div>
            </div>
        </div>

        <h2 className="text-3xl font-black text-white mb-4">Mindful Break</h2>
        <p className="text-text-muted mb-8 font-medium leading-relaxed">
          "Take a short break for 2 minutes to reset your focus."
        </p>

        <div className="bg-glass-panel p-8 rounded-[40px] border border-glass-border shadow-2xl mb-8">
           <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Resuming In Pulse</span>
              <div className="text-6xl font-black text-white flex items-baseline tabular-nums">
                 {minutes}<span className="text-2xl text-text-muted mx-1">m</span>
                 {seconds < 10 ? `0${seconds}` : seconds}<span className="text-2xl text-text-muted ml-1">s</span>
              </div>
           </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-text-muted text-xs font-bold uppercase tracking-widest">
           <Timer className="w-4 h-4" />
           Automatic sync enabled
        </div>

        <div className="mt-12 p-6 bg-brand-500/10 rounded-3xl border border-brand-500/20 flex gap-4 text-left">
           <Info className="w-6 h-6 text-brand-500 shrink-0" />
           <p className="text-sm text-root-fg leading-snug">
              Tip: Deep breathing for 60 seconds lowers cortisol and improves logical reasoning.
           </p>
        </div>
      </motion.div>
    </div>
  );
}
