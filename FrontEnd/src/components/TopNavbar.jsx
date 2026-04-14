import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, User, ChevronDown, Moon, Sun, Palette, Check, BookOpen, Presentation, LayoutDashboard, Brain } from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";
import { useNavigate } from "react-router-dom";
import { learningApi } from "../services/api";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const toggleMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await learningApi.getCourses();
        if (data && data.courses) setCourses(data.courses);
        else if (Array.isArray(data)) setCourses(data);
      } catch (err) {
         console.error("Search courses load error", err);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim() === "") {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = [];

    // Static pages with keywords for broad matching
    const pages = [
      { id: "dashboard learning home", title: "Dashboard", type: "Page", url: user?.role === "admin" ? "/admin-dashboard" : "/student-dashboard", icon: <LayoutDashboard className="w-5 h-5 text-indigo-500" /> },
      { id: "progress stats analytics emotion", title: "My Progress", type: "Page", url: "/progress", icon: <Presentation className="w-5 h-5 text-green-500" /> },
      { id: "reader smart article pdf", title: "Smart Reader", type: "Page", url: "/reader", icon: <Brain className="w-5 h-5 text-purple-500" /> },
      { id: "courses learning lessons catalog", title: "All Courses", type: "Page", url: "/courses", icon: <BookOpen className="w-5 h-5 text-brand-500" /> },
      { id: "profile settings account user", title: "My Profile", type: "Page", url: "/profile", icon: <User className="w-5 h-5 text-orange-500" /> },
    ];

    pages.forEach(p => {
      if (p.title.toLowerCase().includes(lowerQuery) || p.id.includes(lowerQuery)) {
        results.push({ ...p, id: p.id.split(" ")[0] }); // clean id for key
      }
    });

    // Static fallback courses (mirrors LessonView COURSE_CONTENT) — works offline
    const staticCourses = [
      { id: "emotion-ai-architecture", title: "Emotion AI Architecture", keywords: "emotion ai machine learning neural" },
      { id: "quantum-computing-basics", title: "Quantum Computing Basics", keywords: "quantum computing qubits physics" },
      { id: "advanced-react-patterns", title: "Advanced React Patterns", keywords: "react hooks frontend web javascript learning" },
      { id: "neural-networks-101", title: "Neural Networks 101", keywords: "neural networks deep learning backpropagation ai" },
      { id: "fluid-ui-animations", title: "Fluid UI Animations", keywords: "animations ui ux design spring" },
      { id: "building-deep-learning-models", title: "Building Deep Learning Models", keywords: "deep learning cnn convolutional ai model" },
    ];

    // Merge with API courses, dedup by id
    const apiCourseIds = new Set(courses.map(c => String(c.id || c._id)));
    const allCourses = [
      ...staticCourses.filter(sc => !apiCourseIds.has(sc.id)),
      ...courses.map(c => ({
        id: String(c.id || c._id || c.title),
        title: c.title,
        keywords: c.description || ""
      }))
    ];

    allCourses.forEach(c => {
      if (
        c.title.toLowerCase().includes(lowerQuery) ||
        (c.keywords && c.keywords.toLowerCase().includes(lowerQuery))
      ) {
        results.push({
          id: c.id,
          title: c.title,
          type: "Course",
          url: `/lesson/${c.id}`,
          icon: <BookOpen className="w-5 h-5 text-brand-500" />
        });
      }
    });

    setSearchResults(results.slice(0, 7));
    setIsSearchOpen(true);
  };

  return (
    <nav className="h-20 w-full flex items-center justify-between px-10 bg-panel-bg/80 backdrop-blur-xl border-b border-glass-border sticky top-0 z-40 transition-colors duration-500">
      
      {/* Search Bar */}
      <div className="relative group w-96 flex-shrink-0" ref={searchRef}>
        <label className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <Search className="w-5 h-5 text-text-subtle group-focus-within:text-brand-500 transition-colors" />
        </label>
        <input 
          type="text" 
          value={searchQuery}
          onChange={handleSearch}
          onFocus={handleSearch}
          placeholder="Search lessons, progress, reports..."
          className="block w-full pl-10 pr-3 py-2 border border-glass-border rounded-2xl leading-5 bg-glass-base text-root-fg placeholder:text-text-muted hover:bg-glass-hover focus:outline-none focus:bg-glass-base focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all focus:shadow-[0_0_20px_-5px_rgba(var(--brand-500),0.3)] shadow-inner relative z-10"
        />
        
        <AnimatePresence>
          {isSearchOpen && searchResults.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-12 left-0 w-full bg-root-bg border border-glass-border rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
            >
              <div className="p-2 flex flex-col gap-1">
                <span className="text-xs font-bold text-text-subtle uppercase tracking-wider px-3 pt-2 pb-1">Search Results</span>
                {searchResults.map((res, i) => (
                  <button 
                    key={`${res.type}-${res.id}-${i}`}
                    onClick={() => {
                       navigate(res.url);
                       setIsSearchOpen(false);
                       setSearchQuery("");
                    }}
                    className="w-full text-left flex items-center justify-between p-3 rounded-xl hover:bg-glass-hover transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-glass-base rounded-lg group-hover:bg-root-bg transition-colors">
                         {res.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-root-fg group-hover:text-brand-500 transition-colors">{res.title}</span>
                        <span className="text-xs text-text-muted">{res.type}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          {isSearchOpen && searchResults.length === 0 && searchQuery.trim() !== "" && (
             <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-12 left-0 w-full bg-root-bg border border-glass-border rounded-xl shadow-2xl overflow-hidden z-50 flex py-8 flex-col items-center justify-center text-text-muted"
            >
               <Search className="w-8 h-8 opacity-20 mb-2" />
               No results found for "{searchQuery}"
            </motion.div>
          )}
        </AnimatePresence>
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
                <button onClick={() => { navigate('/profile'); setIsProfileOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-brand-500/20 hover:text-brand-500 transition-colors mt-1">
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

