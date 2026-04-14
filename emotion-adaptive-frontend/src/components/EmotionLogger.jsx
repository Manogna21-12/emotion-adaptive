import React, { useState, useCallback } from 'react';
import './EmotionLogger.css';

const EmotionLogger = ({ userId, onEmotionLogged }) => {
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastLoggedTime, setLastLoggedTime] = useState(null);

  const emotions = [
    { value: 'happy', label: 'Happy', icon: '😊', color: '#10b981' },
    { value: 'sad', label: 'Sad', icon: '😢', color: '#3b82f6' },
    { value: 'confused', label: 'Confused', icon: '🤔', color: '#f59e0b' },
    { value: 'angry', label: 'Angry', icon: '😠', color: '#ef4444' }
  ];

  // Debounce emotion logging (prevent spam)
  const debouncedLogEmotion = useCallback(async (emotion) => {
    const now = Date.now();
    
    // Prevent logging same emotion within 30 seconds
    if (lastLoggedTime && (now - lastLoggedTime) < 30000) {
      console.log('🚫 Emotion logging debounced (30-second cooldown)');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Log emotion via API
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/emotion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          emotion
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setLastLoggedTime(now);
        setSelectedEmotion('');
        onEmotionLogged?.(emotion, data.data);
        console.log('✅ Emotion logged successfully:', emotion);
      } else {
        console.error('❌ Failed to log emotion:', data.message);
      }
    } catch (error) {
      console.error('❌ Error logging emotion:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, lastLoggedTime, onEmotionLogged]);

  const handleEmotionSelect = (emotion) => {
    if (isSubmitting) return;
    
    setSelectedEmotion(emotion.value);
    debouncedLogEmotion(emotion.value);
  };

  const getTimeUntilNextLog = () => {
    if (!lastLoggedTime) return 0;
    
    const timeSinceLastLog = Date.now() - lastLoggedTime;
    const cooldownPeriod = 30000; // 30 seconds
    const remainingTime = Math.max(0, cooldownPeriod - timeSinceLastLog);
    
    return Math.ceil(remainingTime / 1000);
  };

  const canLogEmotion = () => {
    return getTimeUntilNextLog() === 0;
  };

  return (
    <div className="emotion-logger">
      <div className="emotion-logger-header">
        <h3>How are you feeling?</h3>
        <p>Your emotion helps us personalize your learning experience</p>
        {!canLogEmotion() && (
          <div className="cooldown-message">
            ⏰ Please wait {getTimeUntilNextLog()} seconds before logging another emotion
          </div>
        )}
      </div>
      
      <div className="emotion-grid">
        {emotions.map((emotion) => (
          <button
            key={emotion.value}
            className={`emotion-button ${selectedEmotion === emotion.value ? 'selected' : ''}`}
            onClick={() => handleEmotionSelect(emotion)}
            disabled={isSubmitting || !canLogEmotion()}
            style={{
              '--emotion-color': emotion.color,
              '--emotion-icon': `"${emotion.icon}"`
            }}
          >
            <div className="emotion-icon-display">
              {emotion.icon}
            </div>
            <span className="emotion-label">{emotion.label}</span>
            {isSubmitting && selectedEmotion === emotion.value && (
              <div className="loading-spinner" />
            )}
          </button>
        ))}
      </div>
      
      <div className="emotion-logger-footer">
        <small>
          💡 Your emotions help us provide personalized content and support
        </small>
      </div>
    </div>
  );
};

export default EmotionLogger;
