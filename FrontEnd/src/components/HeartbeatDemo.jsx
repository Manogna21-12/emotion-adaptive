import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import heartbeatService from '../services/heartbeatService';
import ConnectionStatus from './ConnectionStatus';
import './HeartbeatDemo.css';

const HeartbeatDemo = () => {
  const [userId, setUserId] = useState('demo-user-123');
  const [isHeartbeatRunning, setIsHeartbeatRunning] = useState(false);
  const [heartbeatStatus, setHeartbeatStatus] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [manualResult, setManualResult] = useState(null);
  const [isSendingManual, setIsSendingManual] = useState(false);

  // Initialize heartbeat service
  useEffect(() => {
    // Set up callbacks
    heartbeatService.setCallbacks({
      onHeartbeatSuccess: (result) => {
        console.log('💓 Heartbeat success callback:', result);
        setLastResult({
          type: 'success',
          data: result,
          timestamp: new Date()
        });
      },
      onHeartbeatError: (error, retryCount) => {
        console.log('💔 Heartbeat error callback:', error, retryCount);
        setLastResult({
          type: 'error',
          error: error.message,
          retryCount,
          timestamp: new Date()
        });
      },
      onConnectionChange: (status) => {
        console.log('🔄 Connection change callback:', status);
        setHeartbeatStatus(status);
      }
    });

    // Cleanup on unmount
    return () => {
      heartbeatService.stop();
    };
  }, []);

  // Start heartbeat service
  const startHeartbeat = async () => {
    if (!userId.trim()) {
      alert('Please enter a user ID');
      return;
    }

    try {
      await heartbeatService.initialize(userId, {
        interval: 30000, // 30 seconds for demo
        maxRetries: 3
      });
      setIsHeartbeatRunning(true);
      console.log('💓 Heartbeat service started');
    } catch (error) {
      console.error('❌ Failed to start heartbeat service:', error);
      setManualResult({
        type: 'error',
        error: error.message,
        timestamp: new Date()
      });
    }
  };

  // Stop heartbeat service
  const stopHeartbeat = () => {
    heartbeatService.stop();
    setIsHeartbeatRunning(false);
    setHeartbeatStatus(null);
    console.log('🛑 Heartbeat service stopped');
  };

  // Send manual heartbeat
  const sendManualHeartbeat = async () => {
    if (!userId.trim()) {
      alert('Please enter a user ID');
      return;
    }

    setIsSendingManual(true);
    setManualResult(null);

    try {
      const result = await apiService.sendHeartbeat(userId);
      setManualResult({
        type: 'success',
        data: result,
        timestamp: new Date()
      });
      console.log('💓 Manual heartbeat successful:', result);
    } catch (error) {
      setManualResult({
        type: 'error',
        error: error.message,
        timestamp: new Date()
      });
      console.error('❌ Manual heartbeat failed:', error);
    } finally {
      setIsSendingManual(false);
    }
  };

  // Get heartbeat service status
  const getStatus = () => {
    return heartbeatService.getStatus();
  };

  const status = getStatus();

  return (
    <div className="heartbeat-demo">
      <div className="demo-header">
        <h2>💓 Heartbeat API Demo</h2>
        <p>Test real-time heartbeat functionality with backend connection</p>
      </div>

      {/* Connection Status */}
      <ConnectionStatus showDetails={true} />

      {/* User ID Input */}
      <div className="user-input-section">
        <label htmlFor="userId">User ID:</label>
        <input
          id="userId"
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter user ID"
          disabled={isHeartbeatRunning}
        />
      </div>

      {/* Control Buttons */}
      <div className="control-section">
        <div className="heartbeat-controls">
          <button
            onClick={startHeartbeat}
            disabled={isHeartbeatRunning || !userId.trim()}
            className="btn btn-start"
          >
            🚀 Start Heartbeat
          </button>
          <button
            onClick={stopHeartbeat}
            disabled={!isHeartbeatRunning}
            className="btn btn-stop"
          >
            🛑 Stop Heartbeat
          </button>
        </div>

        <div className="manual-controls">
          <button
            onClick={sendManualHeartbeat}
            disabled={isSendingManual || !userId.trim()}
            className="btn btn-manual"
          >
            {isSendingManual ? (
              <>
                <div className="btn-spinner"></div>
                Sending...
              </>
            ) : (
              '📤 Send Manual Heartbeat'
            )}
          </button>
        </div>
      </div>

      {/* Status Display */}
      <div className="status-section">
        <h3>📊 Service Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <label>Service Running:</label>
            <span className={`value ${isHeartbeatRunning ? 'running' : 'stopped'}`}>
              {isHeartbeatRunning ? '🟢 Running' : '🔴 Stopped'}
            </span>
          </div>
          <div className="status-item">
            <label>Connection:</label>
            <span className={`value ${heartbeatStatus}`}>
              {heartbeatStatus === 'connected' ? '🟢 Connected' :
               heartbeatStatus === 'error' ? '🟡 Error' :
               heartbeatStatus === 'disconnected' ? '🔴 Disconnected' :
               '⚪ Unknown'}
            </span>
          </div>
          <div className="status-item">
            <label>User ID:</label>
            <span className="value">{userId || 'Not set'}</span>
          </div>
          <div className="status-item">
            <label>Last Heartbeat:</label>
            <span className="value">
              {status.lastHeartbeat ? status.lastHeartbeat.toLocaleTimeString() : 'Never'}
            </span>
          </div>
          <div className="status-item">
            <label>Retry Count:</label>
            <span className="value">{status.retryCount}</span>
          </div>
          <div className="status-item">
            <label>Interval:</label>
            <span className="value">{status.heartbeatInterval}ms</span>
          </div>
        </div>
      </div>

      {/* Results Display */}
      <div className="results-section">
        <h3>📋 Recent Activity</h3>
        
        {lastResult && (
          <div className={`result-item ${lastResult.type}`}>
            <div className="result-header">
              <span className="result-type">
                {lastResult.type === 'success' ? '✅ Success' : '❌ Error'}
              </span>
              <span className="result-time">
                {lastResult.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="result-content">
              {lastResult.type === 'success' ? (
                <pre>{JSON.stringify(lastResult.data, null, 2)}</pre>
              ) : (
                <div>
                  <div className="error-message">{lastResult.error}</div>
                  {lastResult.retryCount && (
                    <div className="retry-info">Retry attempt: {lastResult.retryCount}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {manualResult && (
          <div className={`result-item ${manualResult.type}`}>
            <div className="result-header">
              <span className="result-type">
                Manual {manualResult.type === 'success' ? '✅ Success' : '❌ Error'}
              </span>
              <span className="result-time">
                {manualResult.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="result-content">
              {manualResult.type === 'success' ? (
                <pre>{JSON.stringify(manualResult.data, null, 2)}</pre>
              ) : (
                <div className="error-message">{manualResult.error}</div>
              )}
            </div>
          </div>
        )}

        {!lastResult && !manualResult && (
          <div className="no-results">
            <p>No activity yet. Start the heartbeat service or send a manual heartbeat.</p>
          </div>
        )}
      </div>

      {/* API Info */}
      <div className="api-info">
        <h3>🔧 API Information</h3>
        <div className="api-details">
          <div className="api-item">
            <strong>Base URL:</strong> http://localhost:8000
          </div>
          <div className="api-item">
            <strong>Heartbeat Endpoint:</strong> POST /streak/heartbeat
          </div>
          <div className="api-item">
            <strong>Health Check:</strong> GET /health
          </div>
          <div className="api-item">
            <strong>Test Endpoint:</strong> GET /api/test
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeartbeatDemo;
