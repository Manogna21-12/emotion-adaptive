import React, { useState, useEffect } from 'react';
import EmotionLogger from './components/EmotionLogger';
import EmotionPopup from './components/EmotionPopup';
import socketService from './services/socketService';
import apiService from './services/apiService';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import QuizList from './components/QuizList';
import './App.css';

function App() {
  const [user, setUser] = useState({ id: 'user_123', name: 'Demo Student' });
  const [showPopup, setShowPopup] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    apiService.getLatestEmotion(user.id).then(res => res.success && setEmotion(res.data.emotion)).catch(() => {});
    socketService.connect(user.id);
    socketService.on('connect', () => setIsConnected(true));
    socketService.on('disconnect', () => setIsConnected(false));
    
    socketService.on('emotionUpdate', async (data) => {
      if (data.userId === user.id) setEmotion(data.emotion);
    });

    socketService.on('recommendation', (data) => {
      if (data.success && data.data) {
        setRecommendation(data.data);
        setShowPopup(true);
      }
    });

    return () => { socketService.disconnect(); }
  }, [user.id]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#1e293b' }}>
      <Sidebar emotion={emotion} isConnected={isConnected} />
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
           <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Learning Dashboard</h1>
           <SearchBar />
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
           <QuizList emotion={emotion} />
           <div><EmotionLogger userId={user.id} onEmotionLogged={() => {}} /></div>
        </div>
      </div>
      <EmotionPopup isOpen={showPopup} onClose={() => setShowPopup(false)} recommendation={recommendation} />
    </div>
  );
}

export default App;
