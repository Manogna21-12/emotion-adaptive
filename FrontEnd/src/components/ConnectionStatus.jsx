import React, { useState, useEffect } from 'react';
import { checkBackendConnection } from '../services/apiService';
import './ConnectionStatus.css';

const ConnectionStatus = ({ showDetails = false }) => {
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [lastCheck, setLastCheck] = useState(null);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Check connection status
  const checkConnection = async () => {
    try {
      setConnectionStatus('checking');
      setError(null);
      
      const isConnected = await checkBackendConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      setLastCheck(new Date());
      
      if (!isConnected) {
        setError('Backend server is not accessible');
      }
    } catch (error) {
      setConnectionStatus('error');
      setError(error.message);
      setLastCheck(new Date());
    }
  };

  // Retry connection
  const retryConnection = async () => {
    setIsRetrying(true);
    await checkConnection();
    setIsRetrying(false);
  };

  // Auto-check connection every 30 seconds
  useEffect(() => {
    checkConnection();
    
    const interval = setInterval(() => {
      checkConnection();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Get status icon and color
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: '🟢',
          color: '#10b981',
          text: 'Connected',
          description: 'Backend is accessible'
        };
      case 'disconnected':
        return {
          icon: '🔴',
          color: '#ef4444',
          text: 'Disconnected',
          description: 'Backend is not accessible'
        };
      case 'error':
        return {
          icon: '🟡',
          color: '#f59e0b',
          text: 'Error',
          description: error || 'Connection error'
        };
      case 'checking':
        return {
          icon: '🔄',
          color: '#6b7280',
          text: 'Checking...',
          description: 'Verifying connection'
        };
      default:
        return {
          icon: '❓',
          color: '#6b7280',
          text: 'Unknown',
          description: 'Status unknown'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`connection-status ${connectionStatus}`}>
      <div className="status-indicator">
        <span className="status-icon">{statusInfo.icon}</span>
        <span className="status-text" style={{ color: statusInfo.color }}>
          {statusInfo.text}
        </span>
        {connectionStatus === 'checking' && (
          <div className="spinner"></div>
        )}
      </div>

      {showDetails && (
        <div className="status-details">
          <div className="status-description">
            {statusInfo.description}
          </div>
          
          {lastCheck && (
            <div className="last-check">
              Last check: {lastCheck.toLocaleTimeString()}
            </div>
          )}

          {error && (
            <div className="error-message">
              Error: {error}
            </div>
          )}

          {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
            <button 
              className="retry-button"
              onClick={retryConnection}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <div className="button-spinner"></div>
                  Retrying...
                </>
              ) : (
                'Retry Connection'
              )}
            </button>
          )}

          <div className="connection-tips">
            <div className="tips-title">💡 Troubleshooting:</div>
            <ul>
              <li>Ensure backend is accessible at {import.meta.env.VITE_API_URL}</li>
              <li>Check for port conflicts (use PORT=8000)</li>
              <li>Verify CORS configuration</li>
              <li>Check browser console for errors</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
