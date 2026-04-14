import React, { useState, useEffect, useCallback, useRef } from 'react';
import QuizCard from './QuizCard';
import './QuizList.css';

const QuizList = ({ 
  quizzes, 
  loading, 
  onQuizAnswer,
  maxDisplay = 50,
  showFilters = true 
}) => {
  const [displayedQuizzes, setDisplayedQuizzes] = useState([]);
  const [newQuizzes, setNewQuizzes] = useState(new Set());
  const [filters, setFilters] = useState({
    emotionTag: '',
    difficulty: '',
    search: ''
  });
  const [sortBy, setSortBy] = useState('newest');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const notificationTimeoutRef = useRef(null);

  // Debounce notification display
  const debouncedNotification = useCallback((message) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }

    setNotificationMessage(message);
    setShowNotification(true);

    notificationTimeoutRef.current = setTimeout(() => {
      setShowNotification(false);
      setNotificationMessage('');
    }, 3000);
  }, []);

  // Filter and sort quizzes
  const filteredQuizzes = React.useMemo(() => {
    let filtered = [...quizzes];

    // Apply filters
    if (filters.emotionTag) {
      filtered = filtered.filter(quiz => quiz.emotionTag === filters.emotionTag);
    }

    if (filters.difficulty) {
      filtered = filtered.filter(quiz => quiz.difficulty === filters.difficulty);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(quiz => 
        quiz.title.toLowerCase().includes(searchTerm) ||
        quiz.question.toLowerCase().includes(searchTerm) ||
        (quiz.category && quiz.category.toLowerCase().includes(searchTerm))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'difficulty-easy':
          return a.difficulty.localeCompare(b.difficulty);
        case 'difficulty-hard':
          return b.difficulty.localeCompare(a.difficulty);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [quizzes, filters, sortBy]);

  // Update displayed quizzes when filtered quizzes change
  useEffect(() => {
    const limited = filteredQuizzes.slice(0, maxDisplay);
    setDisplayedQuizzes(limited);
  }, [filteredQuizzes, maxDisplay]);

  // Handle new quiz from real-time update
  const handleNewQuiz = useCallback((quizData) => {
    const { quiz } = quizData;
    
    console.log('🆕 New quiz received:', quiz.title);
    
    // Add to quizzes list
    setDisplayedQuizzes(prev => [quiz, ...prev.slice(0, maxDisplay - 1)]);
    
    // Mark as new for animation
    setNewQuizzes(prev => new Set(prev).add(quiz._id));
    
    // Remove new status after animation
    setTimeout(() => {
      setNewQuizzes(prev => {
        const updated = new Set(prev);
        updated.delete(quiz._id);
        return updated;
      });
    }, 5000);
    
    // Show notification
    debouncedNotification(`🆕 New Quiz: "${quiz.title}"`);
  }, [maxDisplay, debouncedNotification]);

  // Handle quiz answer
  const handleQuizAnswer = useCallback((answer, isCorrect, quiz) => {
    onQuizAnswer?.(answer, isCorrect, quiz);
    
    if (isCorrect) {
      debouncedNotification(`🎉 Correct! +${quiz.points || 10} points`);
    } else {
      debouncedNotification(`💭 Not quite right. Keep trying!`);
    }
  }, [onQuizAnswer, debouncedNotification]);

  // Handle animation end
  const handleAnimationEnd = useCallback((quizId) => {
    setNewQuizzes(prev => {
      const updated = new Set(prev);
      updated.delete(quizId);
      return updated;
    });
  }, []);

  // Clear filters
  const clearFilters = () => {
    setFilters({
      emotionTag: '',
      difficulty: '',
      search: ''
    });
  };

  // Statistics
  const stats = React.useMemo(() => {
    const total = filteredQuizzes.length;
    const byDifficulty = {
      easy: filteredQuizzes.filter(q => q.difficulty === 'easy').length,
      medium: filteredQuizzes.filter(q => q.difficulty === 'medium').length,
      hard: filteredQuizzes.filter(q => q.difficulty === 'hard').length
    };
    const byEmotion = {
      happy: filteredQuizzes.filter(q => q.emotionTag === 'happy').length,
      sad: filteredQuizzes.filter(q => q.emotionTag === 'sad').length,
      confused: filteredQuizzes.filter(q => q.emotionTag === 'confused').length,
      angry: filteredQuizzes.filter(q => q.emotionTag === 'angry').length
    };

    return { total, byDifficulty, byEmotion };
  }, [filteredQuizzes]);

  return (
    <div className="quiz-list">
      {/* Notification */}
      {showNotification && (
        <div className="notification">
          {notificationMessage}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="quiz-filters">
          <div className="filter-section">
            <h3>🔍 Filter Quizzes</h3>
            
            <div className="filter-controls">
              <div className="filter-group">
                <label>Search:</label>
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label>Emotion:</label>
                <select
                  value={filters.emotionTag}
                  onChange={(e) => setFilters(prev => ({ ...prev, emotionTag: e.target.value }))}
                  className="filter-select"
                >
                  <option value="">All Emotions</option>
                  <option value="happy">😊 Happy</option>
                  <option value="sad">😢 Sad</option>
                  <option value="confused">🤔 Confused</option>
                  <option value="angry">😠 Angry</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Difficulty:</label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="filter-select"
                >
                  <option value="">All Levels</option>
                  <option value="easy">🟢 Easy</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="hard">🔴 Hard</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Sort By:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="newest">📅 Newest First</option>
                  <option value="oldest">📅 Oldest First</option>
                  <option value="difficulty-easy">🟢 Easy First</option>
                  <option value="difficulty-hard">🔴 Hard First</option>
                  <option value="title">🔤 Title A-Z</option>
                </select>
              </div>

              <button 
                onClick={clearFilters}
                className="clear-filters-btn"
              >
                🔄 Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="quiz-stats">
        <div className="stat-item">
          <span className="stat-label">Total Quizzes:</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Difficulty:</span>
          <span className="stat-value">
            🟢 {stats.byDifficulty.easy} | 
            🟡 {stats.byDifficulty.medium} | 
            🔴 {stats.byDifficulty.hard}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Emotions:</span>
          <span className="stat-value">
            😊 {stats.byEmotion.happy} | 
            😢 {stats.byEmotion.sad} | 
            🤔 {stats.byEmotion.confused} | 
            😠 {stats.byEmotion.angry}
          </span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading quizzes...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && displayedQuizzes.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No quizzes found</h3>
          <p>Try adjusting your filters or check back later for new quizzes.</p>
        </div>
      )}

      {/* Quiz Cards */}
      <div className="quiz-cards">
        {displayedQuizzes.map((quiz) => (
          <QuizCard
            key={quiz._id}
            quiz={quiz}
            isNew={newQuizzes.has(quiz._id)}
            onAnimationEnd={() => handleAnimationEnd(quiz._id)}
            onAnswer={handleQuizAnswer}
          />
        ))}
      </div>

      {/* Load More */}
      {displayedQuizzes.length < filteredQuizzes.length && (
        <div className="load-more">
          <button 
            className="load-more-btn"
            onClick={() => {
              const currentLength = displayedQuizzes.length;
              const nextBatch = filteredQuizzes.slice(currentLength, currentLength + 20);
              setDisplayedQuizzes(prev => [...prev, ...nextBatch]);
            }}
          >
            Load More Quizzes ({filteredQuizzes.length - displayedQuizzes.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizList;
