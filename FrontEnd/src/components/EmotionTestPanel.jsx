import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getApiBaseUrl } from '../services/http';
import './EmotionTestPanel.css';

const EmotionTestPanel = ({ userId }) => {
  const { currentEmotion } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastLoggedEmotion, setLastLoggedEmotion] = useState(null);

  const emotions = [
    { value: 'happy', label: 'Happy', icon: '😊', color: '#10b981' },
    { value: 'sad', label: 'Sad', icon: '😢', color: '#3b82f6' },
    { value: 'confused', label: 'Confused', icon: '🤔', color: '#f59e0b' },
    { value: 'angry', label: 'Angry', icon: '😠', color: '#ef4444' }
  ];

  const logEmotion = async (emotion) => {
    if (isSubmitting || !userId) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/emotion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          emotion,
          metadata: {
            source: 'test-panel',
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setLastLoggedEmotion(emotion);
        console.log('✅ Emotion logged successfully:', emotion);
      } else {
        console.error('❌ Failed to log emotion:', data.message);
      }
    } catch (error) {
      console.error('❌ Error logging emotion:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="emotion-test-panel">
      <div className="test-panel-header">
        <h3>🧪 Test Emotion Updates</h3>
        <p>Click an emotion to test real-time updates</p>
      </div>

      <div className="current-emotion-display">
        <span className="current-label">Current Emotion:</span>
        <span className="current-value" style={{ 
          color: emotions.find(e => e.value === currentEmotion)?.color || '#6b7280' 
        }}>
          {emotions.find(e => e.value === currentEmotion)?.icon || '⏳'} {' '}
          {emotions.find(e => e.value === currentEmotion)?.label || 'Loading...'}
        </span>
      </div>

      <div className="emotion-buttons">
        {emotions.map((emotion) => (
          <button
            key={emotion.value}
            className={`emotion-btn ${currentEmotion === emotion.value ? 'active' : ''}`}
            onClick={() => logEmotion(emotion.value)}
            disabled={isSubmitting}
            style={{
              '--emotion-color': emotion.color,
              '--emotion-icon': `"${emotion.icon}"`
            }}
          >
            <span className="btn-icon">{emotion.icon}</span>
            <span className="btn-label">{emotion.label}</span>
          </button>
        ))}
      </div>

      {lastLoggedEmotion && (
        <div className="last-logged">
          <span className="last-label">Last Logged:</span>
          <span className="last-emotion">
            {emotions.find(e => e.value === lastLoggedEmotion)?.icon} {' '}
            {emotions.find(e => e.value === lastLoggedEmotion)?.label}
          </span>
        </div>
      )}

      {isSubmitting && (
        <div className="submitting">
          <div className="spinner"></div>
          <span>Logging emotion...</span>
        </div>
      )}
    </div>
  );
};

export default EmotionTestPanel;
