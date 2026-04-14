import React, { useState, useEffect, useCallback } from 'react';
import QuizList from './components/QuizList';
import socketService from './services/socketService';
import apiService from './services/apiService';
import './App.css';

function App() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    socketId: null
  });
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    socketService.connect();

    // Setup socket event listeners
    socketService.on('connected', (data) => {
      console.log('🔌 Connected to server:', data);
      setConnectionStatus({
        isConnected: true,
        socketId: data.socketId
      });
    });

    socketService.on('disconnected', (data) => {
      console.log('🔌 Disconnected from server:', data);
      setConnectionStatus({
        isConnected: false,
        socketId: null
      });
    });

    socketService.on('newQuiz', (data) => {
      console.log('🆕 New quiz received:', data);
      handleNewQuiz(data);
    });

    socketService.on('welcome', (data) => {
      console.log('👋 Welcome message:', data);
    });

    socketService.on('error', (error) => {
      console.error('🔌 Socket error:', error);
      setError('Socket connection error');
    });

    // Cleanup on unmount
    return () => {
      socketService.off('connected');
      socketService.off('disconnected');
      socketService.off('newQuiz');
      socketService.off('welcome');
      socketService.off('error');
      socketService.disconnect();
    };
  }, []);

  // Fetch initial quizzes
  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getQuizzes({ limit: 50 });
      
      if (response.success) {
        setQuizzes(response.data.quizzes);
        console.log(`✅ Loaded ${response.data.quizzes.length} quizzes`);
      } else {
        throw new Error(response.message || 'Failed to fetch quizzes');
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setError(error.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiService.getQuizStats();
      
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchQuizzes();
    fetchStats();
  }, [fetchQuizzes, fetchStats]);

  // Handle new quiz from real-time update
  const handleNewQuiz = useCallback((data) => {
    const { quiz } = data;
    
    // Add new quiz to the beginning of the list
    setQuizzes(prevQuizzes => {
      // Check if quiz already exists (prevent duplicates)
      const exists = prevQuizzes.some(q => q._id === quiz._id);
      if (exists) return prevQuizzes;
      
      return [quiz, ...prevQuizzes];
    });
    
    // Update statistics
    fetchStats();
    
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Quiz Available!', {
        body: `"${quiz.title}" - ${quiz.difficulty} difficulty`,
        icon: '/favicon.ico'
      });
    }
  }, [fetchStats]);

  // Handle quiz answer
  const handleQuizAnswer = useCallback((answer, isCorrect, quiz) => {
    console.log(`📝 Quiz answered: ${answer} (${isCorrect ? 'Correct' : 'Incorrect'})`);
    
    // You could send answer to backend here
    // For now, just log it
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Refresh quizzes
  const handleRefresh = () => {
    fetchQuizzes();
    fetchStats();
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>📝 Real-Time Quiz Management</h1>
            <p>Live quiz updates without page refresh</p>
          </div>
          
          <div className="header-controls">
            {/* Connection Status */}
            <div className={`connection-status ${connectionStatus.isConnected ? 'connected' : 'disconnected'}`}>
              <div className="status-indicator" />
              <span>
                {connectionStatus.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </span>
            </div>
            
            {/* Refresh Button */}
            <button 
              onClick={handleRefresh}
              className="refresh-btn"
              disabled={loading}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Statistics Bar */}
      {stats && (
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">Total Quizzes:</span>
            <span className="stat-value">{stats.totalQuizzes}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Difficulty:</span>
            <span className="stat-value">
              🟢 {stats.easyQuizzes} | 
              🟡 {stats.mediumQuizzes} | 
              🔴 {stats.hardQuizzes}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Attempts:</span>
            <span className="stat-value">{stats.totalAttempts}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Success Rate:</span>
            <span className="stat-value">
              {stats.totalAttempts > 0 
                ? Math.round((stats.totalCorrect / stats.totalAttempts) * 100) 
                : 0}%
            </span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button onClick={() => setError(null)} className="error-close">✕</button>
        </div>
      )}

      {/* Main Content */}
      <main className="app-main">
        <QuizList 
          quizzes={quizzes}
          loading={loading}
          onQuizAnswer={handleQuizAnswer}
          maxDisplay={50}
          showFilters={true}
        />
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>
            🚀 Real-time quiz management with MongoDB Change Streams and Socket.IO
          </p>
          <div className="footer-info">
            <span>Socket ID: {connectionStatus.socketId || 'N/A'}</span>
            <span>•</span>
            <span>Total Quizzes: {quizzes.length}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
