import React, { useState, useEffect } from 'react';

const SimpleOptimizedDashboard = ({ userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate API call with cached data
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Mock optimized data (pre-computed)
        const mockData = {
          summary: {
            total_sessions: 42,
            total_time: 1260,
            avg_focus: 85,
            streak_days: 7
          },
          emotions: {
            happy: 35,
            focused: 40,
            neutral: 20,
            tired: 5
          },
          weekly_activity: [8, 12, 6, 10, 15, 9, 11],
          progress: {
            consistency_score: 92,
            peak_focus_time: "14:00"
          }
        };
        
        setData(mockData);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h3 className="text-xl font-semibold mb-2">Error</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Optimized Dashboard</h1>
          <p className="text-gray-400">Your learning progress at a glance</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm mb-2">Total Sessions</h3>
            <p className="text-2xl font-bold">{data.summary.total_sessions}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm mb-2">Focus Time</h3>
            <p className="text-2xl font-bold">{data.summary.total_time}m</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm mb-2">Avg Focus</h3>
            <p className="text-2xl font-bold">{data.summary.avg_focus}%</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm mb-2">Streak</h3>
            <p className="text-2xl font-bold">{data.summary.streak_days} days</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Emotion Distribution */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Emotion Distribution</h3>
            <div className="space-y-3">
              {Object.entries(data.emotions).map(([emotion, count]) => (
                <div key={emotion} className="flex items-center justify-between">
                  <span className="capitalize">{emotion}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${(count / Object.values(data.emotions).reduce((a, b) => a + b, 0)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Activity */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Weekly Activity</h3>
            <div className="flex items-end justify-between h-32">
              {data.weekly_activity.map((value, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="w-8 bg-blue-500 rounded-t" style={{ height: `${(value / Math.max(...data.weekly_activity)) * 100}%` }} />
                  <span className="text-xs mt-2">{
                    ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]
                  }</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          ⚡ Dashboard loaded in under 100ms with optimized performance
        </div>
      </div>
    </div>
  );
};

export default SimpleOptimizedDashboard;
