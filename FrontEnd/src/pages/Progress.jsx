import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion } from "framer-motion";
import { Card, CardContent } from "../components/ui/Card";
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { learningApi, progressApi } from "../services/api";

export default function Progress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState(null);
  const [data, setData] = useState({
    emotionDistribution: {},
    weeklyActivity: [],
    consistency: { consistency_score: 0 },
    peakFocus: { peak_time: "No data", avg_focus: 0 },
    emotionTrend: { trend: "stable", insight: "Start learning to see trends" }
  });

  const fetchProgressCards = async () => {
    const userId = user?._id || user?.id;
    if (!userId) return;
    try {
      setProgressError(null);
      setProgressLoading(true);
      const p = await progressApi.getProgress(userId);
      setProgress(p);
    } catch (e) {
      setProgressError(e?.message || "Failed to load progress metrics");
      setProgress(null);
    } finally {
      setProgressLoading(false);
    }
  };

  const fetchAllProgressData = async () => {
    if (!user?._id && !user?.id) return;
    
    try {
      console.log("Fetching all progress data...");
      const userId = user._id || user.id;
      
      const [emotionDist, weeklyAct, consistency, peakFocus, emotionTrend] = await Promise.all([
        learningApi.getEmotionDistribution(userId).catch(err => {
          console.error("Emotion distribution error:", err);
          return {};
        }),
        learningApi.getWeeklyActivity(userId).catch(err => {
          console.error("Weekly activity error:", err);
          return [];
        }),
        learningApi.getConsistencyScore(userId).catch(err => {
          console.error("Consistency error:", err);
          return { consistency_score: 0 };
        }),
        learningApi.getPeakFocusTime(userId).catch(err => {
          console.error("Peak focus error:", err);
          return { peak_time: "No data", avg_focus: 0 };
        }),
        learningApi.getEmotionTrend(userId).catch(err => {
          console.error("Emotion trend error:", err);
          return { trend: "stable", insight: "Start learning to see trends" };
        })
      ]);

      console.log("Progress data received:", { emotionDist, weeklyAct, consistency, peakFocus, emotionTrend });
      
      setData({
        emotionDistribution: emotionDist,
        weeklyActivity: weeklyAct,
        consistency,
        peakFocus,
        emotionTrend
      });
      setLoading(false);
    } catch (err) {
      console.error("Progress fetch error:", err);
      setError("Failed to load progress data");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProgressData();
    fetchProgressCards();
    const interval = setInterval(fetchAllProgressData, 10000); // Refresh every 10 seconds
    const progressInterval = setInterval(fetchProgressCards, 5000); // Refresh cards frequently
    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [user]);

  // Map emotions to categories
  const getEmotionCategory = (emotion) => {
    if (emotion === 'happy' || emotion === 'focused') return 'Focused';
    if (emotion === 'neutral') return 'Neutral';
    return 'Distracted';
  };

  // Prepare emotion distribution data for donut chart
  const emotionChartData = React.useMemo(() => {
    if (!data.emotionDistribution || Object.keys(data.emotionDistribution).length === 0) {
      return [];
    }
    
    const categories = { Focused: 0, Neutral: 0, Distracted: 0 };
    
    Object.entries(data.emotionDistribution).forEach(([emotion, count]) => {
      const category = getEmotionCategory(emotion);
      categories[category] += count;
    });
    
    const total = Object.values(categories).reduce((sum, val) => sum + val, 0);
    
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
      fill: name === 'Focused' ? '#10B981' : name === 'Neutral' ? '#3B82F6' : '#F97316'
    }));
  }, [data.emotionDistribution]);

  // Prepare weekly activity data
  const weeklyChartData = React.useMemo(() => {
    return (data.weeklyActivity || []).map(day => ({
      day: day.day,
      focus: day.focus || 0,
      lessons: day.lessons || 0
    }));
  }, [data.weeklyActivity]);

  // Check if user has any data
  const hasData = React.useMemo(() => {
    return Object.keys(data.emotionDistribution).length > 0 || 
           data.weeklyActivity.length > 0 || 
           data.consistency.consistency_score > 0;
  }, [data]);

  // Dynamic text functions
  const getConsistencyText = (score) => {
    if (score === 0) return "No activity yet";
    if (score <= 20) return "Just getting started";
    if (score <= 50) return "Building momentum";
    if (score <= 80) return "Good consistency";
    return "Excellent consistency";
  };

  const getPeakFocusText = (avgFocus) => {
    if (avgFocus === 0) return "Start learning to find peak time";
    if (avgFocus <= 60) return "Room for improvement";
    if (avgFocus <= 80) return "Good focus level";
    return "Excellent focus";
  };

  const getTrendText = (trend) => {
    if (trend === 'improving') return "Your focus is consistently improving!";
    if (trend === 'declining') return "Consider taking more breaks";
    return "Your focus remains stable";
  };

  const trendFromProgress = (t) => {
    const v = (t || "").toLowerCase();
    if (v.includes("improv")) return "improving";
    if (v.includes("declin")) return "declining";
    return "stable";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-solid border-brand-500 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center p-20">
          <Card>
            <CardContent className="text-center p-8">
              <h3 className="text-xl font-bold text-red-600 mb-2">Progress Error</h3>
              <p className="text-gray-600">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                Retry
              </button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 pb-12 w-full">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-glass-base p-8 rounded-3xl border border-glass-border/50 shadow-sm relative overflow-hidden"
        >
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-root-fg to-text-muted tracking-tight">
              Learning Progress
            </h1>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Emotion Distribution - Donut Chart */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="h-full"
          >
            <Card className="h-full flex flex-col p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-root-fg">Emotion Distribution</h3>
                  <p className="text-sm text-text-muted mt-1 font-medium">Your learning state breakdown</p>
                </div>
              </div>
              
              <div className="flex-1 min-h-[300px] relative z-10">
                {emotionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={emotionChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {emotionChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(var(--panel-bg-rgb), 0.9)', 
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          color: 'var(--root-fg)'
                        }} 
                        formatter={(value, name, props) => [
                          `${props.payload.percentage}%`,
                          props.payload.name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-text-muted">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 mb-4"></div>
                    <p className="text-center">Start learning to generate data</p>
                  </div>
                )}
              </div>
              
              {/* Legend */}
              {emotionChartData.length > 0 && (
                <div className="flex justify-center gap-6 mt-4">
                  {emotionChartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
                      <span className="text-sm font-medium">{item.name} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Weekly Activity - Line + Bar Combo */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="h-full"
          >
            <Card className="h-full flex flex-col p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-root-fg">Weekly Activity</h3>
                  <p className="text-sm text-text-muted mt-1 font-medium">Focus trends and lesson completion</p>
                </div>
              </div>
              
              <div className="flex-1 min-h-[300px] relative z-10">
                {weeklyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" opacity={0.3} />
                      <XAxis 
                        dataKey="day" 
                        stroke="var(--text-subtle)" 
                        tick={{ fill: 'var(--text-subtle)', fontSize: 13 }} 
                        axisLine={false}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="var(--text-subtle)" 
                        tick={{ fill: 'var(--text-subtle)', fontSize: 13 }} 
                        axisLine={false}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="var(--text-subtle)" 
                        tick={{ fill: 'var(--text-subtle)', fontSize: 13 }} 
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(var(--panel-bg-rgb), 0.9)', 
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          color: 'var(--root-fg)'
                        }} 
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="focus" 
                        stroke="url(#focusGradient)" 
                        strokeWidth={3}
                        dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                        name="Focus"
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="lessons" 
                        fill="#3B82F6" 
                        radius={[4, 4, 0, 0]}
                        name="Lessons"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-text-muted">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 mb-4"></div>
                    <p className="text-center">No weekly activity data</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

        </div>

        {/* Unique Features Row - Perfectly Aligned */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Learning Consistency Score */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="h-[180px]"
          >
            <Card className="h-full p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-root-fg mb-2">Learning Consistency</h3>
              </div>
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  {progressLoading ? (
                    <div className="animate-pulse">
                      <div className="h-10 w-24 bg-glass-border/40 rounded-xl mx-auto" />
                      <div className="h-4 w-32 bg-glass-border/30 rounded-lg mx-auto mt-3" />
                    </div>
                  ) : progressError ? (
                    <div className="text-sm text-red-500 font-bold">{progressError}</div>
                  ) : !progress ? (
                    <div className="text-sm text-text-muted font-semibold">No data available</div>
                  ) : (
                    <>
                      <motion.div
                        key={`consistency-${progress.learning_consistency}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl font-bold text-brand-500"
                      >
                        {Math.round(progress.learning_consistency)}%
                      </motion.div>
                      <div className="text-sm text-text-muted">
                        {getConsistencyText(Math.round(progress.learning_consistency))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Peak Focus Time */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="h-[180px]"
          >
            <Card className="h-full p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-root-fg mb-2">Peak Focus Time</h3>
              </div>
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  {progressLoading ? (
                    <div className="animate-pulse">
                      <div className="h-10 w-40 bg-glass-border/40 rounded-xl mx-auto" />
                      <div className="h-4 w-36 bg-glass-border/30 rounded-lg mx-auto mt-3" />
                    </div>
                  ) : progressError ? (
                    <div className="text-sm text-red-500 font-bold">{progressError}</div>
                  ) : !progress ? (
                    <div className="text-sm text-text-muted font-semibold">No data available</div>
                  ) : (
                    <>
                      <motion.div
                        key={`peak-${progress.peak_focus_time}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl font-bold text-brand-500"
                      >
                        {progress.peak_focus_time || "No data"}
                      </motion.div>
                      <div className="text-sm text-text-muted">
                        {getPeakFocusText(progress.focus_score || 0)}
                      </div>
                      {progress.focus_score > 0 && (
                        <div className="text-xs text-green-500 mt-1">
                          {Math.round(progress.focus_score)}% avg
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Emotion Trend Insight */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="h-[180px]"
          >
            <Card className="h-full p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-root-fg mb-2">Trend Insight</h3>
              </div>
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  {progressLoading ? (
                    <div className="animate-pulse">
                      <div className="h-6 w-36 bg-glass-border/40 rounded-lg mx-auto" />
                      <div className="h-4 w-40 bg-glass-border/30 rounded-lg mx-auto mt-3" />
                    </div>
                  ) : progressError ? (
                    <div className="text-sm text-red-500 font-bold">{progressError}</div>
                  ) : !progress ? (
                    <div className="text-sm text-text-muted font-semibold">No data available</div>
                  ) : (
                    (() => {
                      const t = trendFromProgress(progress.trend);
                      return (
                        <>
                          <motion.div
                            key={`trend-${progress.trend}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`text-lg font-bold mb-1 ${
                              t === "improving"
                                ? "text-green-500"
                                : t === "declining"
                                ? "text-red-500"
                                : "text-blue-500"
                            }`}
                          >
                            {t === "improving"
                              ? "Improving"
                              : t === "declining"
                              ? "Declining"
                              : "Stable"}
                          </motion.div>
                          <div className="text-sm text-text-muted">{getTrendText(t)}</div>
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

        </div>

        {/* Empty State */}
        {!hasData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-glass-base rounded-2xl border border-glass-border">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300"></div>
              <div>
                <h3 className="text-lg font-bold text-root-fg mb-1">Start learning to generate insights</h3>
                <p className="text-text-muted">Complete lessons to see your progress analytics</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
