import React, { useState } from 'react';
import HeartbeatDemo from './components/HeartbeatDemo';
import ConnectionStatus from './components/ConnectionStatus';
import './App.css';

function AppDemo() {
  const [currentView, setCurrentView] = useState('demo');

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔗 Backend Connectivity Demo</h1>
        <p>Test CORS, API communication, and heartbeat functionality</p>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-btn ${currentView === 'demo' ? 'active' : ''}`}
          onClick={() => setCurrentView('demo')}
        >
          💓 Heartbeat Demo
        </button>
        <button
          className={`nav-btn ${currentView === 'status' ? 'active' : ''}`}
          onClick={() => setCurrentView('status')}
        >
          🔌 Connection Status
        </button>
      </nav>

      <main className="app-main">
        {currentView === 'demo' && <HeartbeatDemo />}
        {currentView === 'status' && (
          <div className="status-view">
            <ConnectionStatus showDetails={true} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-info">
          <div className="server-info">
            <strong>Backend Server:</strong> {import.meta.env.VITE_API_URL}
          </div>
          <div className="frontend-info">
            <strong>Frontend:</strong> http://localhost:5173
          </div>
          <div className="cors-info">
            <strong>CORS Status:</strong> Configured for localhost:5173
          </div>
        </div>
        <div className="footer-links">
          <a href={`${import.meta.env.VITE_API_URL}/health`} target="_blank" rel="noopener noreferrer">
            🏥 Health Check
          </a>
          <a href={`${import.meta.env.VITE_API_URL}/api/test`} target="_blank" rel="noopener noreferrer">
            🧪 Test API
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            📚 Documentation
          </a>
        </div>
      </footer>
    </div>
  );
}

export default AppDemo;
