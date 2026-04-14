import React, { useState, useEffect, useRef, useCallback } from 'react';
import emotionSocketService from '../services/emotionSocketService';
import './LiveEmotionSidebar.css';

const LiveEmotionSidebarFixed = ({ userId, className = '' }) => {
  const [emotion, setEmotion] = useState('Loading...');
  const [emotionData, setEmotionData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const debounceTimeoutRef = useRef(null);

  // Enhanced emotion configuration with animations
  const enhancedEmotionConfig = {
    happy: {
      icon: '😊',
      color: '#10b981',
      label: 'Happy',
      bgGradient: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      borderColor: '#10b981',
      animation: 'bounce'
    },
    sad: {
      icon: '😢',
      color: '#3b82f6',
      label: 'Sad',
      bgGradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      borderColor: '#3b82f6',
      animation: 'gentleWave'
    },
    confused: {
      icon: '🤔',
      color: '#f59e0b',
      label: 'Confused',
      bgGradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      borderColor: '#f59e0b',
      animation: 'rotate'
    },
    angry: {
      icon: '😠',
      color: '#ef4444',
      label: 'Angry',
      bgGradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      borderColor: '#ef4444',
      animation: 'shake'
    },
    loading: {
      icon: '⏳',
      color: '#6b7280',
      label: 'Loading...',
      bgGradient: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
      borderColor: '#6b7280',
      animation: 'pulse'
    }
  };

  // Debounce emotion updates to prevent flickering
  const debouncedSetEmotion = useCallback((newEmotion, newEmotionData) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setEmotion(newEmotion);
      setEmotionData(newEmotionData);
      setLastUpdate(new Date());
      
      // Show pulse effect for new emotions
      if (newEmotion !== 'Loading...' && newEmotion !== emotion) {
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 1000);
      }
    }, 300); // 300ms debounce
  }, [emotion]);

  // Fetch initial emotion
  const fetchLatestEmotion = useCallback(async () => {
    if (!userId) return;

    try {
      console.log(`📊 Fetching latest emotion for user: ${userId}`);
      const latestEmotion = await emotionSocketService.getLatestEmotion(userId);
      
      if (latestEmotion) {
        debouncedSetEmotion(latestEmotion.emotion, latestEmotion);
      } else {
        debouncedSetEmotion('No data', null);
      }
    } catch (error) {
      console.error('❌ Error fetching latest emotion:', error);
      debouncedSetEmotion('Error', null);
    }
  }, [userId, debouncedSetEmotion]);

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;

    console.log(`🔌 Initializing emotion socket for user: ${userId}`);
    
    // Initialize socket service
    emotionSocketService.initialize(userId);

    // Set up socket event listeners
    const handleConnected = () => {
      console.log('🔌 Emotion socket connected');
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Join user room
      emotionSocketService.joinUserRoom(userId);
    };

    const handleDisconnected = (reason) => {
      console.log('🔌 Emotion socket disconnected:', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };

    const handleConnectionError = (error) => {
      console.error('🔌 Emotion socket connection error:', error);
      setIsConnected(false);
      setConnectionStatus('error');
    };

    const handlePersonalizedRecommendation = (data) => {
      console.log('📊 Personalized recommendation received:', data);
      
      // Only update if it's for this user
      if (data.userId === userId) {
        setIsUpdating(true);
        
        // Add a small delay for smooth transition
        setTimeout(() => {
          debouncedSetEmotion(data.emotion, data);
          setIsUpdating(false);
        }, 100);
      }
    };

    // Register event listeners
    emotionSocketService.on('connected', handleConnected);
    emotionSocketService.on('disconnected', handleDisconnected);
    emotionSocketService.on('connectionError', handleConnectionError);
    emotionSocketService.on('personalizedRecommendation', handlePersonalizedRecommendation);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up emotion socket listeners');
      emotionSocketService.off('connected', handleConnected);
      emotionSocketService.off('disconnected', handleDisconnected);
      emotionSocketService.off('connectionError', handleConnectionError);
      emotionSocketService.off('personalizedRecommendation', handlePersonalizedRecommendation);
      emotionSocketService.leaveUserRoom();
      emotionSocketService.disconnect();
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [userId, debouncedSetEmotion]);

  // Fetch initial emotion on mount
  useEffect(() => {
    if (userId) {
      fetchLatestEmotion();
    }
  }, [userId, fetchLatestEmotion]);

  // Get current emotion configuration
  const currentEmotionConfig = enhancedEmotionConfig[emotion] || enhancedEmotionConfig.loading;

  // Format last update time
  const formatLastUpdate = () => {
    if (!lastUpdate) return '';
    
    const now = new Date();
    const diff = now - lastUpdate;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return lastUpdate.toLocaleDateString();
  };

  // Test emotion logging
  const testEmotion = async (testEmotion) => {
    if (!userId) return;
    
    console.log(`🧪 Testing emotion: ${testEmotion}`);
    const result = await emotionSocketService.logEmotion(userId, testEmotion, 'test-button');
    
    if (result) {
      console.log('✅ Test emotion logged successfully:', result);
    } else {
      console.log('❌ Failed to log test emotion');
    }
  };

  return (
    <div className={`live-emotion-sidebar ${className} ${showPulse ? 'pulse' : ''} ${isUpdating ? 'updating' : ''} emotion-${emotion}`}>
      {/* Connection Status Indicator */}
      <div className={`connection-status ${connectionStatus}`}>
        <div className="status-dot" />
        <span className="status-text">
          {connectionStatus === 'connected' ? '🟢 Live' : 
           connectionStatus === 'error' ? '🔴 Error' : '🔴 Offline'}
        </span>
      </div>

      {/* Live Emotion Display */}
      <div className="emotion-display">
        <div className="emotion-header">
          <h3>LIVE EMOTION</h3>
          {isUpdating && <div className="updating-indicator">Updating...</div>}
        </div>
        
        <div 
          className="emotion-content"
          style={{
            background: currentEmotionConfig.bgGradient,
            borderColor: currentEmotionConfig.borderColor,
            '--emotion-animation': currentEmotionConfig.animation
          }}
          data-emotion={emotion}
        >
          <div className="emotion-icon">
            {currentEmotionConfig.icon}
          </div>
          
          <div className="emotion-info">
            <div className="emotion-label">
              {currentEmotionConfig.label}
            </div>
            
            {emotionData && (
              <div className="emotion-details">
                <div className="emotion-timestamp">
                  {formatLastUpdate()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="test-controls">
        <h4>🧪 Test Emotion Updates</h4>
        <div className="test-buttons">
          <button 
            onClick={() => testEmotion('happy')}
            className="test-btn happy"
            disabled={!userId}
          >
            😊 Happy
          </button>
          <button 
            onClick={() => testEmotion('sad')}
            className="test-btn sad"
            disabled={!userId}
          >
            😢 Sad
          </button>
          <button 
            onClick={() => testEmotion('confused')}
            className="test-btn confused"
            disabled={!userId}
          >
            🤔 Confused
          </button>
          <button 
            onClick={() => testEmotion('angry')}
            className="test-btn angry"
            disabled={!userId}
          >
            😠 Angry
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="user-info">
        <div className="user-id">
          User: {userId ? userId.substring(0, 8) + '...' : 'Unknown'}
        </div>
        {lastUpdate && (
          <div className="last-update">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
        <div className="socket-status">
          Socket: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

      {/* Pulse Effect Overlay */}
      {showPulse && (
        <div className="pulse-overlay" />
      )}
    </div>
  );
};

export default LiveEmotionSidebarFixed;
