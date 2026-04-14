import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import socketService from '../services/socketService';

const QuizList = ({ emotion }) => {
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    // Initial fetch
    apiService.getQuizzes({ limit: 10 }).then(res => {
      if (res.success) setQuizzes(res.data.quizzes);
    }).catch(console.error);

    // Dynamic real-time sync with MongoDB
    socketService.on('quizAdded', (newQuiz) => {
      setQuizzes(prev => [newQuiz, ...prev].slice(0, 10)); // keep latest 10
    });

    return () => socketService.off('quizAdded');
  }, []);

  return (
    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Recommended for you</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {quizzes.length === 0 ? <p>No quizzes available.</p> : quizzes.map(q => (
          <div key={q._id || Math.random()} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600' }}>{q.title}</span>
              <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>{q.difficulty}</span>
            </div>
            <p style={{ color: '#475569', fontSize: '14px' }}>{q.question}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuizList;
