import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useTheme } from '../contexts/ThemeContext';
import './LiveEmotionSidebar.css';

const LiveEmotionSidebar = ({ userId, className = '' }) => {
  const { setCurrentEmotion, currentEmotion, emotionData, emotionConfig } = useTheme();
  const [isConnected, setIsConnected] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const socketRef = useRef(null);
  const emotionTimeoutRef = useRef(null);
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
      // Update ThemeContext emotion state
      setCurrentEmotion(newEmotion, newEmotionData);
      setLastUpdate(new Date());
      
      // Show pulse effect for new emotions
      if (newEmotion !== 'Loading...' && newEmotion !== currentEmotion) {
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 1000);
      }
    }, 300); // 300ms debounce
  }, [currentEmotion, setCurrentEmotion]);

  // Fetch initial emotion
  const fetchLatestEmotion = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/emotion/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        debouncedSetEmotion(data.data.emotion, data.data);
      } else {
        console.error('Failed to fetch latest emotion:', data.message);
        debouncedSetEmotion('No data', null);
      }
    } catch (error) {
      console.error('Error fetching latest emotion:', error);
      debouncedSetEmotion('Error', null);
    }
  }, [userId, debouncedSetEmotion]);

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;

    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('🔌 Connected to emotion stream');
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Join emotion stream for this user
      socket.emit('joinEmotionStream', { userId });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from emotion stream');
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      setConnectionStatus('error');
    });

    // Emotion stream events
    socket.on('emotionStreamConnected', (data) => {
      console.log('📡 Emotion stream connected:', data);
    });

    socket.on('emotionStreamJoined', (data) => {
      console.log('👤 Joined emotion stream:', data);
    });

    // Real-time emotion updates
    socket.on('emotionUpdate', (data) => {
      console.log('📊 Real-time emotion update:', data);
      
      // Only update if it's for this user
      if (data.userId === userId) {
        setIsUpdating(true);
        
        // Add a small delay for smooth transition
        setTimeout(() => {
          debouncedSetEmotion(data.emotion, data.displayData);
          setIsUpdating(false);
        }, 100);
      }
    });

    // User-specific emotion updates
    socket.on('userEmotionUpdate', (data) => {
      console.log('📊 User-specific emotion update:', data);
      setIsUpdating(true);
      
      setTimeout(() => {
        debouncedSetEmotion(data.emotion, data.displayData);
        setIsUpdating(false);
      }, 100);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('🔌 Socket error:', error);
      setConnectionStatus('error');
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveEmotionStream');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
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

  // Get current emotion configuration (use enhanced config, fallback to ThemeContext)
  const currentEmotionConfig = enhancedEmotionConfig[currentEmotion] || enhancedEmotionConfig.loading;

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

  return (
    <div className={`live-emotion-sidebar ${className} ${showPulse ? 'pulse' : ''} ${isUpdating ? 'updating' : ''} emotion-${currentEmotion}`}>
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
          data-emotion={currentEmotion}
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
      </div>

      {/* Pulse Effect Overlay */}
      {showPulse && (
        <div className="pulse-overlay" />
      )}
    </div>
  );
};

export default LiveEmotionSidebar;
