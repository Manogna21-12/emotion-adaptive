import React from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion } from "framer-motion";
import { Card, CardContent } from "../components/ui/Card";
import { Zap, Clock, BrainCircuit, PlayCircle, TrendingUp, Sparkles, Activity, Flame } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { dashboardApi, learningApi, reportsApi, streakApi } from "../services/api";
import { useStreakTracker } from "../hooks/useStreakTracker";
import MinimalStreakWidget, { MetricCard } from "../components/StreakWidget";

function FocusRing({ score }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center group overflow-hidden p-6">
      {/* Decorative Glow */}
      <div className="absolute inset-0 bg-brand-500/10 blur-[40px] rounded-full group-hover:bg-brand-500/20 transition-colors duration-500" />
      <svg className="transform -rotate-90 w-48 h-48 relative z-10">
        <circle 
          cx="96" cy="96" r="60" stroke="currentColor" strokeWidth="12" fill="transparent"
          className="text-glass-border/30"
        />
        <motion.circle 
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx="96" cy="96" r="60" stroke="currentColor" strokeWidth="12" fill="transparent"
          strokeDasharray={circumference}
          className="text-brand-500 drop-shadow-[0_0_15px_rgba(var(--brand-500),0.7)] transition-all duration-300"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center z-10">
        <motion.span 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-brand-400 to-cyan-400 drop-shadow-sm"
        >
          {score}
        </motion.span>
        <span className="text-xs text-text-subtle font-bold uppercase tracking-[0.2em] mt-1">Focus</span>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [userInfo, setUserInfo] = React.useState(null);
  const [summary, setSummary] = React.useState(null);
  const [emotionLogs, setEmotionLogs] = React.useState([]);
  const [timelineData, setTimelineData] = React.useState([]);
  const [emotionImpact, setEmotionImpact] = React.useState(null);
  const [currentEmotion, setCurrentEmotion] = React.useState(null);
  const [notifications, setNotifications] = React.useState([]);

  // Use the new streak tracker hook
  const streakTracker = useStreakTracker({
    onStreakUpdate: (newState) => {
      console.log('Streak updated:', newState);
    }
  });

  // Live timer ticker for "Dynamic" feel if needed for other things, 
  // but StreakWidget handles its own time now.
  const [liveSessionSeconds, setLiveSessionSeconds] = React.useState(() => streakTracker.dailyTimeSpent);

  React.useEffect(() => {
    if (loading) return;
    setLiveSessionSeconds(streakTracker.dailyTimeSpent);
  }, [streakTracker.dailyTimeSpent, loading]);

  React.useEffect(() => {
    let cancelled = false;

    const userId = user?._id || user?.id;
    if (!userId) return;

    // Debug: confirm correct user id used for all dashboard calls.
    console.log("User ID (dashboard):", userId);
    console.log("Auth user object:", user);

    const fetchAll = async () => {
      try {
        if (!cancelled) setError(null);
        console.log("🔄 Fetching dashboard data...");

        // Use dashboard API for real-time data + statistics from reports API
        const [summary, emotions, timeline, emotionImpact, liveEmotion, u, notifs, stats] = await Promise.all([
          dashboardApi.getSummary(userId).catch((err) => {
            console.error("Dashboard summary API error:", err);
            return {
              focus_score_today: 0,
              time_spent_minutes: 0,
              current_streak: 0,
              lessons_completed: 0,
              cognitive_state: "Neutral"
            };
          }),
          dashboardApi.getEmotions(userId).catch((err) => {
            console.error("Dashboard emotions API error:", err);
            return [];
          }),
          dashboardApi.getTimeline(userId).catch((err) => {
            console.error("Dashboard timeline API error:", err);
            return { timeline: [] };
          }),
          dashboardApi.getEmotionImpact(userId).catch((err) => {
            console.error("Emotion impact API error:", err);
            return {};
          }),
          dashboardApi.getLiveEmotion(userId).catch((err) => {
            console.error("Live emotion API error:", err);
            return { emotion: "neutral", focus: 0 };
          }),
          dashboardApi.getUser(userId).catch((err) => {
            console.error("User API error:", err);
            return { name: user?.name || "Student" };
          }),
          dashboardApi.getNotifications(userId).catch((err) => {
            console.error("Notifications API error:", err);
            return [];
          }),
          reportsApi.getSummary(userId).catch((err) => {
             console.error("Stats API error:", err);
             return { total_time_spent: 0, current_streak: 0, total_sessions: 0 };
          })
        ]);

        if (cancelled) return;
        
        console.log("📊 Dashboard data received:", { summary, stats, emotions, timeline, emotionImpact, liveEmotion });
        
        // Merge stats into summary for UI display
        setSummary({
          ...summary,
          time_spent_minutes: stats.total_time, // Use SQL cumulative time
          current_streak: stats.current_streak, // Use SQL streak
          total_sessions: stats.sessions
        });
        setEmotionLogs(emotions);
        setTimelineData(timeline.timeline || []);
        setEmotionImpact(emotionImpact);
        setCurrentEmotion(liveEmotion);
        setUserInfo(u);
        setNotifications(notifs || []);
        setLoading(false);
        
      } catch (e) {
        if (cancelled) return;
        console.error("❌ Dashboard fetch error:", e);
        setError(`Failed to load dashboard data: ${e.message || e}`);
        setLoading(false);
      }
    };

    setLoading(true);
    fetchAll();
    
    // Update every 3 seconds for UI elements (Dynamic responsiveness)
    const interval = setInterval(fetchAll, 3000);

    // REAL-TIME TRACKING: Send 1-minute heartbeats to backend
    const trackInterval = setInterval(async () => {
      if (userId) {
        console.log("⏱️ [DASHBOARD] Sending live session heartbeat...");
        try {
          await streakApi.heartbeat(userId, 1);
          console.log("✅ [DASHBOARD] Live update successful. Syncing UI...");
          
          // Force a UI refresh to show the "Dynamic" update
          fetchAll();
          
        } catch (err) {
          console.error("❌ Session heartbeat failed:", err);
        }
      }
    }, 60000); // 1 minute

    // Send one heartbeat immediately on mount
    if (userId) {
       streakApi.heartbeat(userId, 1).catch(err => console.error(err));
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(trackInterval);
    };
  }, [user]);

  const metrics = {
    name: userInfo?.name || user?.name || "",
    emotion: currentEmotion?.emotion || "neutral",
    focusLive: currentEmotion?.focus || 0,
    focusScore: summary?.focus_score_today || 0,
    timeSpent: summary?.time_spent_minutes || 0,
    streak: summary?.current_streak || 0,
    topics: summary?.lessons_completed || 0,
    cognitive_state: summary?.cognitive_state || "Neutral",
  };

  // Map emotions to engagement scores for better visualization
  const getEmotionScore = (emotion) => {
    const emotionMap = {
      'happy': 85,
      'focused': 95,
      'neutral': 50,
      'surprise': 70,
      'sad': 25,
      'angry': 15,
      'fear': 20,
      'disgust': 10,
      'confused': 30
    };
    return emotionMap[emotion?.toLowerCase()] || 50;
  };

  const chartData = (timelineData || [])
    .filter((l) => typeof l.focus === "number" || typeof l.focus === "string")
    .map((l) => ({
      time: l.time || "",
      focus: Number(l.focus) || 0,
      emotion: getEmotionScore(l.emotion),
      emotionLabel: l.emotion || "neutral"
    }));


  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 w-full pb-10">
        
        {/* TOP SECTION: Header & Actions */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 relative overflow-hidden"
        >
          {/* Subtle decoration inside header */}
          <div className="absolute top-0 right-[-10%] w-64 h-64 bg-cyan-100/50 rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Welcome back, {metrics.name?.split(" ")[0] || "Student"}
            </h1>
            <div className="text-lg text-gray-500 mt-2 max-w-xl font-medium flex items-center gap-2">
                <span>Live State: <span className="text-cyan-500 font-bold capitalize">{metrics.emotion}</span></span>
                <span className="text-gray-300">|</span>
                <span>Focus: <span className="text-cyan-500 font-bold">{metrics.focusLive}%</span></span>
            </div>
            {notifications && notifications.length > 0 ? (
              <p className="mt-2 text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1 rounded-lg inline-block">{notifications[0].message}</p>
            ) : null}
          </div>
          <button 
             onClick={() => navigate('/courses')}
             className="relative z-10 flex items-center gap-3 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-[0_4px_12px_rgba(6,182,212,0.3)] hover:shadow-[0_6px_16px_rgba(6,182,212,0.4)] hover:-translate-y-0.5">
            <PlayCircle className="w-5 h-5" /> Resume Learning
          </button>
        </motion.div>

        {/* MIDDLE SECTION: Secondary Metrics (4-col grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <MetricCard 
              title="Time Spent Today" 
              value={streakTracker.formattedTime} 
              subtitle="today" 
              icon={<Clock className="w-5 h-5"/>} 
              colorClass="text-blue-500" 
              bgClass="bg-blue-50" 
           />
           <MetricCard 
              title="Today's Focus" 
              value={`${metrics.focusScore}%`} 
              subtitle="From stats" 
              icon={<TrendingUp className="w-5 h-5"/>} 
              colorClass="text-green-500" 
              bgClass="bg-green-50" 
           />
           <MetricCard 
              title="Topics Mastered" 
              value={`${metrics.topics}`} 
              subtitle="Total mastered" 
              icon={<BrainCircuit className="w-5 h-5"/>} 
              colorClass="text-cyan-500" 
              bgClass="bg-cyan-50" 
           />
           <MetricCard 
              title="Learning Streak" 
              value={`${streakTracker.currentStreak}`} 
              subtitle="day streak" 
              icon={<Flame className="w-5 h-5"/>} 
              colorClass="text-orange-500" 
              bgClass="bg-orange-50" 
           />
        </div>

        {/* NEW SECTION: Primary Streak Widget 7-Day View */}
        <MinimalStreakWidget />

        {/* MAIN SECTION: Graphs & Primary Metrics (Asymmetric Layout 12-col) */}
        <div className="grid grid-cols-12 gap-8 min-h-[400px]">
          
          {/* Timeline Chart (70% width -> col-span-8) */}
          <motion.div 
            className="col-span-12 lg:col-span-8 h-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full flex flex-col p-8">
              <div className="flex justify-between items-center mb-8 shrink-0">
                <div>
                  <h3 className="text-xl font-extrabold text-root-fg flex items-center gap-2">
                    <Activity className="text-brand-500 w-5 h-5" /> Cognitive Flow Timeline
                  </h3>
                  <p className="text-sm text-text-muted mt-1 font-medium">Tracking engagement levels driven by live emotion mapping</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-text-subtle">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(var(--brand-500),0.6)]" /> Focus Level</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" /> Emotion Engagement</div>
                </div>
              </div>
              <div className="flex-1 w-full relative min-h-[300px]">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-text-muted font-semibold">
                    Loading chart…
                  </div>
                ) : error ? (
                  <div className="h-full flex items-center justify-center text-red-500 font-semibold">
                    {error}
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-text-muted font-semibold">
                    No emotion logs yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--brand-500)" stopOpacity={0.6}/>
                        <stop offset="100%" stopColor="var(--brand-500)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEmotion" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--cyan-500)" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="var(--cyan-500)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--glass-border)" vertical={false} opacity={0.5} />
                    <XAxis dataKey="time" stroke="var(--text-subtle)" tick={{ fill: 'var(--text-subtle)', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis yAxisId="left" stroke="var(--text-subtle)" tick={{ fill: 'var(--text-subtle)', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} dx={-10} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-subtle)" tick={{ fill: 'var(--text-subtle)', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} dx={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(var(--panel-bg-rgb), 0.9)', backdropFilter: 'blur(10px)', borderColor: 'var(--glass-border)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
                      itemStyle={{ color: 'var(--root-fg)', fontWeight: 'bold' }}
                      labelFormatter={(label) => `Time: ${label}`}
                      formatter={(value, name) => {
                        if (name === 'focus') return [`${value}%`, 'Focus'];
                        if (name === 'emotion') return [`${value}%`, 'Emotion Engagement'];
                        return [value, name];
                      }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="focus" stroke="var(--brand-500)" strokeWidth={3} fillOpacity={1} fill="url(#colorFocus)" activeDot={{ r: 6, strokeWidth: 0, fill: "var(--brand-500)", className: "animate-ping" }} />
                    <Line yAxisId="right" type="monotone" dataKey="emotion" stroke="var(--cyan-500)" strokeWidth={3} dot={{ fill: "var(--cyan-500)", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0, fill: "var(--cyan-500)" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Right sidebar Focus Score (30% width -> col-span-4) */}
          <motion.div 
            className="col-span-12 lg:col-span-4 h-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full flex flex-col justify-between p-8 relative overflow-hidden group">
              {/* Dynamic Aura */}
              <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-brand-500/20 blur-[80px] rounded-full group-hover:bg-brand-500/30 transition-colors duration-700" />
              
              <div className="relative z-10 text-center flex flex-col items-center flex-1 justify-center">
                <h3 className="text-xl font-extrabold text-root-fg mb-6">Real-Time State</h3>
                <FocusRing score={metrics.focusLive || 0} />
                <p className="text-sm text-text-muted mt-8 font-medium leading-relaxed bg-glass-hover p-4 rounded-2xl border border-glass-border/30">
                  {notifications && notifications.length > 0
                    ? notifications[0].message
                    : loading
                      ? "Loading insights…"
                      : "No active insights."}
                </p>
              </div>
            </Card>
          </motion.div>

        </div>

      </div>
    </DashboardLayout>
  );
}
