import React, { useState, useEffect } from 'react';
import LiveEmotionSidebarFixed from './LiveEmotionSidebarFixed';
import './EmotionTestApp.css';

const EmotionTestApp = () => {
  const [userId, setUserId] = useState('test-user-123');
  const [showSidebar, setShowSidebar] = useState(true);

  // Test user IDs
  const testUsers = [
    { id: 'test-user-123', label: 'Test User 1' },
    { id: 'student-456', label: 'Student 2' },
    { id: 'learner-789', label: 'Learner 3' }
  ];

  useEffect(() => {
    console.log('🎯 Emotion Test App mounted');
    console.log(`👤 Current user: ${userId}`);
  }, [userId]);

  return (
    <div className="emotion-test-app">
      <header className="app-header">
        <h1>🔗 Live Emotion Test App</h1>
        <p>Test real-time emotion updates and socket connections</p>
      </header>

      <div className="app-controls">
        <div className="user-selector">
          <label htmlFor="user-select">Select Test User:</label>
          <select 
            id="user-select"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="user-select"
          >
            {testUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sidebar-toggle">
          <button 
            onClick={() => setShowSidebar(!showSidebar)}
            className={`toggle-btn ${showSidebar ? 'active' : ''}`}
          >
            {showSidebar ? '🙈 Hide Sidebar' : '👁️ Show Sidebar'}
          </button>
        </div>
      </div>

      <div className="app-content">
        {showSidebar && (
          <aside className="sidebar-container">
            <LiveEmotionSidebarFixed userId={userId} />
          </aside>
        )}

        <main className="main-content">
          <div className="content-card">
            <h2>🧪 Emotion Testing Center</h2>
            
            <div className="instructions">
              <h3>📋 Instructions:</h3>
              <ol>
                <li>Select a test user from the dropdown above</li>
                <li>Use the test buttons in the sidebar to log emotions</li>
                <li>Watch the live emotion update in real-time</li>
                <li>Check browser console for detailed logs</li>
                <li>Verify socket connection status</li>
              </ol>
            </div>

            <div className="info-section">
              <h3>🔌 Connection Info:</h3>
              <div className="info-grid">
                <div className="info-item">
                  <strong>Backend URL:</strong>
                  <span>http://localhost:8000</span>
                </div>
                <div className="info-item">
                  <strong>Socket URL:</strong>
                  <span>http://localhost:8000</span>
                </div>
                <div className="info-item">
                  <strong>Current User:</strong>
                  <span>{userId}</span>
                </div>
                <div className="info-item">
                  <strong>API Endpoint:</strong>
                  <span>/api/emotion/{userId}</span>
                </div>
              </div>
            </div>

            <div className="troubleshooting">
              <h3>🛠️ Troubleshooting:</h3>
              <div className="troubleshoot-grid">
                <div className="trouble-item">
                  <h4>❌ If not working:</h4>
                  <ul>
                    <li>Check if backend is running on port 8000</li>
                    <li>Verify MongoDB is connected</li>
                    <li>Check browser console for errors</li>
                    <li>Ensure CORS is configured</li>
                  </ul>
                </div>
                <div className="trouble-item">
                  <h4>✅ Expected behavior:</h4>
                  <ul>
                    <li>Socket connects automatically</li>
                    <li>Connection status shows "Live"</li>
                    <li>Test buttons trigger real-time updates</li>
                    <li>Emotion changes animate smoothly</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <p>🔗 Live Emotion Test App - Backend Integration Test</p>
          <p>Make sure backend is running on <code>http://localhost:8000</code></p>
        </div>
      </footer>
    </div>
  );
};

export default EmotionTestApp;
