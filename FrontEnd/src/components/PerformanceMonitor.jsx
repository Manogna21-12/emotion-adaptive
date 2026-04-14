import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../services/websocketService';
import { performanceUtils } from '../services/optimizedApi';

const PerformanceMonitor = ({ userId }) => {
  const { isConnected, metrics, lastMessage, send, subscribe } = useWebSocket(userId);
  const [apiMetrics, setApiMetrics] = useState([]);
  const [renderMetrics, setRenderMetrics] = useState({});
  const [isVisible, setIsVisible] = useState(false);
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(performance.now());

  // Monitor render performance
  useEffect(() => {
    renderCountRef.current += 1;
    const currentTime = performance.now();
    const renderTime = currentTime - lastRenderTime.current;
    
    setRenderMetrics(prev => ({
      renderCount: renderCountRef.current,
      lastRenderTime: renderTime,
      averageRenderTime: prev.averageRenderTime 
        ? (prev.averageRenderTime + renderTime) / 2 
        : renderTime,
      fps: Math.round(1000 / renderTime)
    }));
    
    lastRenderTime.current = currentTime;
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (isConnected) {
      subscribe(['real_time_update', 'user_update', 'status']);
    }
  }, [isConnected, subscribe]);

  // Collect API metrics
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    const logAPICall = (level, ...args) => {
      const message = args.join(' ');
      if (message.includes('API Request:') || message.includes('Fast API:') || message.includes('Slow API:')) {
        const duration = parseFloat(message.match(/took ([\d.]+)ms/)?.[1]) || 0;
        const endpoint = message.match(/(\/[\w\/-]+)/)?.[1] || 'unknown';
        
        setApiMetrics(prev => {
          const newMetrics = [...prev, {
            endpoint,
            duration,
            timestamp: Date.now(),
            level: duration > 100 ? 'slow' : duration > 50 ? 'medium' : 'fast'
          }];
          
          // Keep only last 50 metrics
          return newMetrics.slice(-50);
        });
      }
      
      // Call original log function
      if (level === 'error') originalError(...args);
      else if (level === 'warn') originalWarn(...args);
      else originalLog(...args);
    };
    
    console.log = (...args) => logAPICall('log', ...args);
    console.warn = (...args) => logAPICall('warn', ...args);
    console.error = (...args) => logAPICall('error', ...args);
    
    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  // Calculate performance stats
  const performanceStats = useMemo(() => {
    if (apiMetrics.length === 0) return null;
    
    const durations = apiMetrics.map(m => m.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    const slowRequests = apiMetrics.filter(m => m.level === 'slow').length;
    const fastRequests = apiMetrics.filter(m => m.level === 'fast').length;
    
    return {
      totalRequests: apiMetrics.length,
      avgDuration: avgDuration.toFixed(2),
      maxDuration: maxDuration.toFixed(2),
      minDuration: minDuration.toFixed(2),
      slowRequests,
      fastRequests,
      performanceScore: Math.max(0, 100 - (slowRequests / apiMetrics.length) * 100)
    };
  }, [apiMetrics]);

  // Performance grades
  const getPerformanceGrade = (score) => {
    if (score >= 95) return { grade: 'A+', color: 'text-green-500' };
    if (score >= 90) return { grade: 'A', color: 'text-green-500' };
    if (score >= 85) return { grade: 'B+', color: 'text-blue-500' };
    if (score >= 80) return { grade: 'B', color: 'text-blue-500' };
    if (score >= 75) return { grade: 'C+', color: 'text-yellow-500' };
    if (score >= 70) return { grade: 'C', color: 'text-yellow-500' };
    return { grade: 'D', color: 'text-red-500' };
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors shadow-lg"
      >
        📊 Performance
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 bg-root-bg/90 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-glass-base border border-glass-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-glass-base border-b border-glass-border p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-root-fg">Performance Monitor</h2>
          <button
            onClick={() => setIsVisible(false)}
            className="p-2 hover:bg-glass-hover rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${
              isConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">WebSocket</span>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              </div>
              <div className="text-lg font-semibold text-root-fg">
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              {isConnected && (
                <div className="text-sm text-text-muted">
                  Latency: {metrics.latency}ms
                </div>
              )}
            </div>

            <div className="p-4 bg-glass-hover rounded-lg border border-glass-border">
              <div className="text-text-muted">Render Performance</div>
              <div className="text-lg font-semibold text-root-fg">
                {renderMetrics.fps || 0} FPS
              </div>
              <div className="text-sm text-text-muted">
                Avg: {renderMetrics.averageRenderTime?.toFixed(2) || 0}ms
              </div>
            </div>

            <div className="p-4 bg-glass-hover rounded-lg border border-glass-border">
              <div className="text-text-muted">Total Renders</div>
              <div className="text-lg font-semibold text-root-fg">
                {renderMetrics.renderCount || 0}
              </div>
              <div className="text-sm text-text-muted">
                Last: {renderMetrics.lastRenderTime?.toFixed(2) || 0}ms
              </div>
            </div>
          </div>

          {/* API Performance Stats */}
          {performanceStats && (
            <div className="bg-glass-base border border-glass-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-root-fg mb-4">API Performance</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-text-muted text-sm">Total Requests</div>
                  <div className="text-xl font-bold text-root-fg">{performanceStats.totalRequests}</div>
                </div>
                <div>
                  <div className="text-text-muted text-sm">Avg Duration</div>
                  <div className="text-xl font-bold text-root-fg">{performanceStats.avgDuration}ms</div>
                </div>
                <div>
                  <div className="text-text-muted text-sm">Slow Requests</div>
                  <div className="text-xl font-bold text-red-500">{performanceStats.slowRequests}</div>
                </div>
                <div>
                  <div className="text-text-muted text-sm">Performance Score</div>
                  <div className={`text-xl font-bold ${getPerformanceGrade(performanceStats.performanceScore).color}`}>
                    {getPerformanceGrade(performanceStats.performanceScore).grade}
                  </div>
                </div>
              </div>

              {/* Performance Bar */}
              <div className="w-full bg-glass-hover rounded-full h-4 mb-2">
                <motion.div
                  className="h-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${performanceStats.performanceScore}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="text-sm text-text-muted text-center">
                Performance Score: {performanceStats.performanceScore.toFixed(1)}%
              </div>
            </div>
          )}

          {/* Recent API Calls */}
          <div className="bg-glass-base border border-glass-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-root-fg mb-4">Recent API Calls</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <AnimatePresence>
                {apiMetrics.slice(-10).reverse().map((metric, index) => (
                  <motion.div
                    key={metric.timestamp}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-3 bg-glass-hover rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        metric.level === 'fast' ? 'bg-green-500' :
                        metric.level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span className="text-root-fg font-mono">{metric.endpoint}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`text-sm ${
                        metric.level === 'fast' ? 'text-green-500' :
                        metric.level === 'medium' ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {metric.duration}ms
                      </span>
                      <span className="text-xs text-text-muted">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* WebSocket Metrics */}
          {isConnected && (
            <div className="bg-glass-base border border-glass-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-root-fg mb-4">WebSocket Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-text-muted text-sm">Connection State</div>
                  <div className="text-lg font-bold text-root-fg">{metrics.connectionState}</div>
                </div>
                <div>
                  <div className="text-text-muted text-sm">Latency</div>
                  <div className="text-lg font-bold text-root-fg">{metrics.latency}ms</div>
                </div>
                <div>
                  <div className="text-text-muted text-sm">Reconnect Attempts</div>
                  <div className="text-lg font-bold text-root-fg">{metrics.reconnectAttempts}</div>
                </div>
                <div>
                  <div className="text-text-muted text-sm">Queued Messages</div>
                  <div className="text-lg font-bold text-root-fg">{metrics.queuedMessages}</div>
                </div>
              </div>
            </div>
          )}

          {/* Last WebSocket Message */}
          {lastMessage && (
            <div className="bg-glass-base border border-glass-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-root-fg mb-4">Last WebSocket Message</h3>
              <pre className="text-sm text-text-muted overflow-x-auto">
                {JSON.stringify(lastMessage, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PerformanceMonitor;
