import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, User, ChevronDown, Moon, Sun, Palette, Check } from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";

const COLORS = [
  { id: "indigo", name: "Indigo", hex: "#6366f1" },
  { id: "cyan", name: "Cyan", hex: "#06b6d4" },
  { id: "purple", name: "Purple", hex: "#a855f7" },
  { id: "green", name: "Green", hex: "#22c55e" },
  { id: "orange", name: "Orange", hex: "#f97316" },
];

export default function TopNavbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  const toggleMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <nav className="h-20 w-full flex items-center justify-between px-10 bg-panel-bg/80 backdrop-blur-xl border-b border-glass-border sticky top-0 z-40 transition-colors duration-500">
      
      {/* Search Bar */}
      <div className="relative group w-96">
        <label className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-text-subtle group-focus-within:text-brand-500 transition-colors" />
        </label>
        <input 
          type="text" 
          placeholder="Search lessons, progress, reports..."
          className="block w-full pl-10 pr-3 py-2 border border-glass-border rounded-2xl leading-5 bg-glass-base text-root-fg placeholder:text-text-muted hover:bg-glass-hover focus:outline-none focus:bg-glass-base focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all focus:shadow-[0_0_20px_-5px_rgba(var(--brand-500),0.3)] shadow-inner"
        />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-6">
        
        {/* Quick Theme Toggle & Global Color Picker */}
        <div className="relative flex items-center gap-2">
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMode}
            className="p-2 rounded-full text-text-muted hover:text-brand-500 hover:bg-glass-base transition-colors focus:ring-2 focus:ring-brand-500/50"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </motion.button>

          <div className="relative">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsThemeOpen(!isThemeOpen)}
              className="p-2 rounded-full text-text-muted hover:text-brand-500 hover:bg-glass-base transition-colors focus:ring-2 focus:ring-brand-500/50"
              title="Change Theme Color"
            >
              <Palette className="w-5 h-5" />
            </motion.button>
            
            <AnimatePresence>
              {isThemeOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-56 bg-root-bg rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-3 z-50 border border-glass-border"
                >
                  <p className="text-xs font-semibold text-text-subtle uppercase tracking-widest mb-3">Accent Color</p>
                  <div className="grid grid-cols-5 gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setPrimaryColor(c.id);
                          setIsThemeOpen(false);
                        }}
                        style={{ backgroundColor: c.hex }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          primaryColor === c.id ? "scale-110 ring-2 ring-offset-2 ring-offset-panel-bg ring-brand-500" : "opacity-80 hover:opacity-100 hover:scale-105"
                        }`}
                      >
                        {primaryColor === c.id && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        <div className="w-[1px] h-6 bg-glass-border"></div>

        {/* Notifications */}
        <NotificationDropdown />

        {/* Profile Dropdown */}
        <div className="relative">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-glass-hover transition-all border border-b border-transparent focus:ring-2 focus:ring-brand-500/50 hover:border-glass-border"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 p-[2px]">
              <div className="w-full h-full bg-root-bg rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-text-muted" />
              </div>
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-sm font-semibold text-root-fg">{user?.name || "Student User"}</span>
              <span className="text-xs text-brand-500">{user?.role || "Learner"}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-text-subtle" />
          </motion.button>
          
          <AnimatePresence>
            {isProfileOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-3 w-48 bg-root-bg rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] py-1 z-50 border border-glass-border"
              >
                <div className="px-4 py-2 border-b border-glass-border">
                  <p className="text-sm font-medium text-root-fg truncate">{user?.email || "student@example.com"}</p>
                </div>
                <button className="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-brand-500/20 hover:text-brand-500 transition-colors mt-1">
                  My Profile
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-brand-500/20 hover:text-brand-500 transition-colors">
                  Settings
                </button>
                <div className="border-t border-glass-border my-1"></div>
                <button 
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}
