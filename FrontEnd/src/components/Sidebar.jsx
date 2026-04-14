import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  BookOpen, 
  TrendingUp, 
  Target, 
  FileText, 
  Settings, 
  LogOut,
  Smile,
  Frown,
  Meh,
  Zap
} from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

// A small utility for Tailwind class merging
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SIDEBAR_ITEMS = [
  { name: "Progress Dashboard", path: "/student-dashboard", icon: LayoutDashboard },
  { name: "Learning", path: "/courses", icon: BookOpen },
  { name: "Progress", path: "/progress", icon: TrendingUp },
  { name: "Smart Reader", path: "/reader", icon: FileText },
  { name: "Settings", path: "/profile", icon: Settings },
];

const EMOTIONS = [
  { icon: Smile, label: "Happy", color: "text-green-500" },
  { icon: Meh, label: "Neutral", color: "text-cyan-500" },
  { icon: Frown, label: "Confused", color: "text-orange-500" },
];

function Sidebar({ role }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [emotionIndex, setEmotionIndex] = useState(0);

  // Simulate real-time emotion changes
  useEffect(() => {
    const interval = setInterval(() => {
      setEmotionIndex((prev) => (prev + 1) % EMOTIONS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
  };

  const CurrentEmotionIcon = EMOTIONS[emotionIndex].icon;

  return (
    <motion.div 
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      className="w-64 h-screen fixed top-0 left-0 flex flex-col glass-panel border-r border-glass-border z-50 shadow-2xl transition-colors duration-500"
    >
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-400 flex items-center justify-center shadow-lg animate-glow">
          <Zap className="text-white w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-root-fg to-text-muted">
          EmotionLearn
        </h2>
      </div>

      <div className="px-6 pb-6">
        <div className="glass-card rounded-2xl p-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden group">
          <div className="absolute inset-0 bg-brand-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Live Emotion</span>
          <motion.div 
            key={emotionIndex}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex items-center gap-2"
          >
            <CurrentEmotionIcon className={cn("w-8 h-8", EMOTIONS[emotionIndex].color)} />
            <span className={cn("font-medium", EMOTIONS[emotionIndex].color)}>
              {EMOTIONS[emotionIndex].label}
            </span>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 px-4 overflow-y-auto space-y-1 scrollbar-hide">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link to={item.path} key={item.name}>
              <motion.div 
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer",
                  isActive 
                    ? "bg-brand-500/20 text-brand-600 dark:text-brand-300 border border-brand-500/30 shadow-[0_0_15px_rgba(var(--brand-500),0.2)]" 
                    : "text-text-muted hover:text-root-fg hover:bg-glass-hover"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-brand-500" : "text-text-subtle")} />
                <span className="font-medium text-sm">{item.name}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 mt-auto border-t border-glass-border">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Logout</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

export default Sidebar;