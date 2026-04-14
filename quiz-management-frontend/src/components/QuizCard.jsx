import React, { useState, useEffect } from 'react';
import './QuizCard.css';

const QuizCard = ({ 
  quiz, 
  isNew = false, 
  onAnimationEnd,
  onAnswer,
  showAnswer = false 
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    if (showAnswer && quiz.correctAnswer) {
      setIsAnswered(true);
      setIsCorrect(selectedAnswer === quiz.correctAnswer);
    }
  }, [showAnswer, selectedAnswer, quiz.correctAnswer]);

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    const correct = answer === quiz.correctAnswer;
    setIsAnswered(true);
    setIsCorrect(correct);
    
    onAnswer?.(answer, correct, quiz);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getEmotionColor = (emotionTag) => {
    switch (emotionTag) {
      case 'happy': return '#fbbf24';
      case 'sad': return '#60a5fa';
      case 'confused': return '#a78bfa';
      case 'angry': return '#f87171';
      default: return '#9ca3af';
    }
  };

  const getEmotionIcon = (emotionTag) => {
    switch (emotionTag) {
      case 'happy': return '😊';
      case 'sad': return '😢';
      case 'confused': return '🤔';
      case 'angry': return '😠';
      default: return '🤷';
    }
  };

  return (
    <div 
      className={`quiz-card ${isNew ? 'new-quiz' : ''} ${isAnswered ? 'answered' : ''}`}
      onAnimationEnd={onAnimationEnd}
    >
      {/* New Quiz Badge */}
      {isNew && (
        <div className="new-quiz-badge">
          🆕 NEW
        </div>
      )}

      {/* Quiz Header */}
      <div className="quiz-header">
        <div className="quiz-title">
          <h3>{quiz.title}</h3>
          <div className="quiz-meta">
            <span 
              className="difficulty-badge"
              style={{ backgroundColor: getDifficultyColor(quiz.difficulty) }}
            >
              {quiz.difficulty}
            </span>
            <span 
              className="emotion-badge"
              style={{ backgroundColor: getEmotionColor(quiz.emotionTag) }}
            >
              {getEmotionIcon(quiz.emotionTag)} {quiz.emotionTag}
            </span>
          </div>
        </div>
        
        {quiz.category && (
          <div className="quiz-category">
            📁 {quiz.category}
          </div>
        )}
      </div>

      {/* Quiz Question */}
      <div className="quiz-question">
        <p>{quiz.question}</p>
      </div>

      {/* Quiz Options */}
      <div className="quiz-options">
        {quiz.options.map((option, index) => (
          <button
            key={index}
            className={`quiz-option ${isAnswered ? 'disabled' : ''} ${
              isAnswered && option === quiz.correctAnswer ? 'correct' : ''
            } ${
              isAnswered && option === selectedAnswer && option !== quiz.correctAnswer ? 'incorrect' : ''
            }`}
            onClick={() => handleAnswerSelect(option)}
            disabled={isAnswered}
          >
            <span className="option-letter">
              {String.fromCharCode(65 + index)}
            </span>
            <span className="option-text">{option}</span>
            {isAnswered && option === quiz.correctAnswer && (
              <span className="correct-indicator">✓</span>
            )}
            {isAnswered && option === selectedAnswer && option !== quiz.correctAnswer && (
              <span className="incorrect-indicator">✗</span>
            )}
          </button>
        ))}
      </div>

      {/* Answer Feedback */}
      {isAnswered && (
        <div className={`answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
          {isCorrect ? (
            <div className="feedback-content">
              <span className="feedback-icon">🎉</span>
              <span className="feedback-text">Correct! Well done!</span>
              <span className="feedback-points">+{quiz.points || 10} points</span>
            </div>
          ) : (
            <div className="feedback-content">
              <span className="feedback-icon">💭</span>
              <span className="feedback-text">Not quite right. The correct answer is: {quiz.correctAnswer}</span>
            </div>
          )}
        </div>
      )}

      {/* Quiz Footer */}
      <div className="quiz-footer">
        <div className="quiz-info">
          <span className="time-limit">
            ⏱️ {quiz.timeLimit || 30}s
          </span>
          <span className="points">
            🏆 {quiz.points || 10} pts
          </span>
        </div>
        
        {quiz.createdAt && (
          <div className="quiz-date">
            {new Date(quiz.createdAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizCard;
