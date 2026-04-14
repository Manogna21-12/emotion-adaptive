import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [primaryColor, setPrimaryColor] = useState(localStorage.getItem("primaryColor") || "indigo");
  const [currentEmotion, setCurrentEmotion] = useState("loading");
  const [emotionData, setEmotionData] = useState(null);
  const [emotionUpdatedAt, setEmotionUpdatedAt] = useState(null);

  // Emotion configuration
  const emotionConfig = {
    happy: { color: '#10b981', label: 'Happy' },
    sad: { color: '#3b82f6', label: 'Sad' },
    confused: { color: '#f59e0b', label: 'Confused' },
    angry: { color: '#ef4444', label: 'Angry' },
    loading: { color: '#6b7280', label: 'Loading...' }
  };

  // Update emotion state
  const updateEmotion = (emotion, data) => {
    setCurrentEmotion(emotion);
    setEmotionData(data);
    setEmotionUpdatedAt(new Date());
    
    // Apply emotion-based theme adjustments
    applyEmotionTheme(emotion);
  };

  // Apply emotion-based theme adjustments
  const applyEmotionTheme = (emotion) => {
    const root = document.documentElement;
    const config = emotionConfig[emotion];
    
    if (config) {
      // Set CSS custom properties for emotion-based styling
      root.style.setProperty('--emotion-color', config.color);
      root.style.setProperty('--emotion-label', `"${config.label}"`);
      
      // Add emotion class to root
      root.classList.remove('emotion-happy', 'emotion-sad', 'emotion-confused', 'emotion-angry', 'emotion-loading');
      root.classList.add(`emotion-${emotion}`);
    }
  };

  useEffect(() => {
    localStorage.setItem("theme", theme);
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("primaryColor", primaryColor);
    const root = document.documentElement;
    // Remove previous color classes
    ["theme-indigo", "theme-cyan", "theme-purple", "theme-green", "theme-orange"].forEach(c => root.classList.remove(c));
    root.classList.add(`theme-${primaryColor}`);
  }, [primaryColor]);

  // Initialize emotion theme on mount
  useEffect(() => {
    applyEmotionTheme(currentEmotion);
  }, []);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      primaryColor, 
      setPrimaryColor,
      currentEmotion,
      setCurrentEmotion: updateEmotion,
      emotionData,
      setEmotionData,
      emotionUpdatedAt,
      emotionConfig
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
