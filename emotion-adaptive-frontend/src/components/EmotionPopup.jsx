import React, { useState, useEffect } from 'react';
import './EmotionPopup.css';

const EmotionPopup = ({ 
  isOpen, 
  onClose, 
  recommendation, 
  onQuizComplete,
  onVideoWatch,
  onQuoteRead 
}) => {
  const [quizAnswer, setQuizAnswer] = useState('');
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Debounce popup closing to prevent accidental closes
  const debouncedClose = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    setDebounceTimer(setTimeout(onClose, 300));
  };

  // Handle quiz submission
  const handleQuizSubmit = () => {
    if (recommendation?.content?.quiz?.correctAnswer === quizAnswer) {
      setIsCorrect(true);
      setShowQuizResult(true);
      onQuizComplete?.(true);
    } else {
      setIsCorrect(false);
      setShowQuizResult(true);
      onQuizComplete?.(false);
    }
  };

  // Render content based on emotion type
  const renderContent = () => {
    if (!recommendation) return null;

    const { type, title, message, content } = recommendation;

    switch (type) {
      case 'confused':
        return (
          <div className="emotion-popup confused">
            <div className="popup-header">
              <span className="emotion-icon">🤔</span>
              <h3>{title}</h3>
            </div>
            <p className="popup-message">{message}</p>
            
            <div className="popup-content">
              {content.video && (
                <div className="video-section">
                  <h4>📹 Helpful Video</h4>
                  <div className="video-card">
                    <h5>{content.video.title}</h5>
                    <p>{content.video.topic}</p>
                    <button 
                      className="video-btn"
                      onClick={() => onVideoWatch?.(content.video)}
                    >
                      Watch Video
                    </button>
                  </div>
                </div>
              )}
              
              {content.quiz && (
                <div className="quiz-section">
                  <h4>📝 Quick Quiz</h4>
                  <div className="quiz-card">
                    <p className="quiz-question">{content.quiz.question}</p>
                    <div className="quiz-options">
                      {content.quiz.options.map((option, index) => (
                        <label key={index} className="quiz-option">
                          <input
                            type="radio"
                            name="quiz"
                            value={option}
                            checked={quizAnswer === option}
                            onChange={(e) => setQuizAnswer(e.target.value)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    
                    {showQuizResult && (
                      <div className={`quiz-result ${isCorrect ? 'correct' : 'incorrect'}`}>
                        {isCorrect ? '✅ Correct! Great job!' : '❌ Not quite right. Try again!'}
                      </div>
                    )}
                    
                    <button 
                      className="quiz-submit-btn"
                      onClick={handleQuizSubmit}
                      disabled={!quizAnswer || showQuizResult}
                    >
                      Submit Answer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'sad':
        return (
          <div className="emotion-popup sad">
            <div className="popup-header">
              <span className="emotion-icon">😢</span>
              <h3>{title}</h3>
            </div>
            <p className="popup-message">{message}</p>
            
            <div className="popup-content">
              {content.quote && (
                <div className="quote-section">
                  <h4>💭 Motivational Quote</h4>
                  <div className="quote-card">
                    <blockquote>"{content.quote.text}"</blockquote>
                    {content.quote.author && (
                      <cite>— {content.quote.author}</cite>
                    )}
                    <button 
                      className="quote-btn"
                      onClick={() => onQuoteRead?.(content.quote)}
                    >
                      Got it!
                    </button>
                  </div>
                </div>
              )}
              
              {content.quiz && (
                <div className="quiz-section">
                  <h4>🌱 Gentle Activity</h4>
                  <div className="quiz-card">
                    <p className="quiz-question">{content.quiz.question}</p>
                    <div className="quiz-options">
                      {content.quiz.options.map((option, index) => (
                        <label key={index} className="quiz-option">
                          <input
                            type="radio"
                            name="quiz"
                            value={option}
                            checked={quizAnswer === option}
                            onChange={(e) => setQuizAnswer(e.target.value)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    
                    {showQuizResult && (
                      <div className={`quiz-result ${isCorrect ? 'correct' : 'incorrect'}`}>
                        {isCorrect ? '✅ You got it! Keep going!' : '❌ Not quite, but that\'s okay!'}
                      </div>
                    )}
                    
                    <button 
                      className="quiz-submit-btn"
                      onClick={handleQuizSubmit}
                      disabled={!quizAnswer || showQuizResult}
                    >
                      Try Answer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'happy':
        return (
          <div className="emotion-popup happy">
            <div className="popup-header">
              <span className="emotion-icon">😊</span>
              <h3>{title}</h3>
            </div>
            <p className="popup-message">{message}</p>
            
            <div className="popup-content">
              {content.quiz && (
                <div className="quiz-section">
                  <h4>🎯 Challenge Quiz</h4>
                  <div className="quiz-card">
                    <p className="quiz-question">{content.quiz.question}</p>
                    <div className="quiz-options">
                      {content.quiz.options.map((option, index) => (
                        <label key={index} className="quiz-option">
                          <input
                            type="radio"
                            name="quiz"
                            value={option}
                            checked={quizAnswer === option}
                            onChange={(e) => setQuizAnswer(e.target.value)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    
                    {showQuizResult && (
                      <div className={`quiz-result ${isCorrect ? 'correct' : 'incorrect'}`}>
                        {isCorrect ? '🎉 Excellent! You\'re on fire!' : '🤔 Good try! Want to attempt again?'}
                      </div>
                    )}
                    
                    <button 
                      className="quiz-submit-btn"
                      onClick={handleQuizSubmit}
                      disabled={!quizAnswer || showQuizResult}
                    >
                      Challenge Yourself
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'angry':
        return (
          <div className="emotion-popup angry">
            <div className="popup-header">
              <span className="emotion-icon">😠</span>
              <h3>{title}</h3>
            </div>
            <p className="popup-message">{message}</p>
            
            <div className="popup-content">
              <div className="break-section">
                <h4>🧘 Time for a Break</h4>
                <div className="break-card">
                  <p className="break-message">{content.breakMessage}</p>
                  <div className="break-duration">
                    <span className="duration-label">Duration:</span>
                    <span className="duration-value">{content.breakDuration} minutes</span>
                  </div>
                  
                  {content.suggestedActivities && (
                    <div className="activities">
                      <h5>Suggested Activities:</h5>
                      <ul>
                        {content.suggestedActivities.map((activity, index) => (
                          <li key={index} className="activity-item">
                            <span className="activity-icon">🌿</span>
                            {activity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <button 
                    className="break-btn"
                    onClick={onClose}
                  >
                    Start Break
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="emotion-popup default">
            <div className="popup-header">
              <span className="emotion-icon">📚</span>
              <h3>{title}</h3>
            </div>
            <p className="popup-message">{message}</p>
            
            <div className="popup-content">
              <div className="default-section">
                <p>{content?.message || 'Continue with your learning journey.'}</p>
                <button className="default-btn" onClick={onClose}>
                  Continue Learning
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  // Close popup on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        debouncedClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  if (!isOpen || !recommendation) return null;

  return (
    <div className="emotion-popup-overlay">
      <div className="emotion-popup-backdrop" onClick={debouncedClose} />
      <div className="emotion-popup-container">
        <button 
          className="emotion-popup-close"
          onClick={debouncedClose}
          aria-label="Close popup"
        >
          ✕
        </button>
        
        {renderContent()}
      </div>
    </div>
  );
};

export default EmotionPopup;
