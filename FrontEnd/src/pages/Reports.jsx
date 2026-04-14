import React, { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion } from "framer-motion";
import { Card } from "../components/ui/Card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { reportsApi } from "../services/api";
import {
  Download,
  Clock,
  Target,
  Zap,
  Activity,
  RefreshCw,
  AlertCircle,
  FileText,
  TrendingUp,
} from "lucide-react";

// ─── Heartbeat: sends 1 minute of session data every 60s ──────────────────────
function useSessionHeartbeat(userId) {
  const intervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!userId) return;

    // Record session start; send 1-min heartbeat every 60s
    const fire = async () => {
      try {
        await reportsApi.trackSession(userId, 1); // 1 minute per tick
        console.log("[Reports] ✅ Heartbeat: +1 min recorded");
      } catch (e) {
        console.warn("[Reports] ⚠️ Heartbeat failed:", e?.message);
      }
    };

    intervalRef.current = setInterval(fire, 60_000); // every 60 s

    return () => {
      clearInterval(intervalRef.current);
      // On unmount, send whatever fractional minutes were accumulated
      const secsOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);
      const remainMins = (secsOnPage % 60) / 60;
      if (remainMins > 0.1) {
        reportsApi.trackSession(userId, remainMins).catch(() => {});
      }
    };
  }, [userId]);
}

// ─── Custom Tooltip for the Bar Chart ─────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-glass-base border border-glass-border rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-root-fg">{label}</p>
      <p className="text-brand-400 font-bold mt-0.5">{payload[0].value} mins</p>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconColor, label, value, unit, accentBorder }) {
  return (
    <Card className={`p-6 border-${accentBorder} shadow-sm`}>
      <div className={`p-2 bg-${iconColor}/10 rounded-lg w-fit mb-3`}>
        <Icon className={`w-5 h-5 text-${iconColor}`} />
      </div>
      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">{label}</h3>
      <div className="text-3xl font-black text-root-fg mt-1">
        {value}
        <span className="text-sm font-medium text-text-muted ml-1">{unit}</span>
      </div>
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Reports() {
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [summary, setSummary] = useState({
    total_time: 0,
    today_time: 0,
    sessions: 0,
    current_streak: 0,
    daily_data: [],
  });

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  useSessionHeartbeat(userId);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await reportsApi.getSummary(userId);
      if (data && data.status === "success") {
        setSummary({
          total_time: Math.round(data.total_time || 0),
          today_time: Math.round(data.today_time || 0),
          sessions: data.sessions || 0,
          current_streak: data.current_streak || 0,
          daily_data: (data.daily_data || []).map((d) => ({
            ...d,
            // Ensure "name" label exists for XAxis (backend returns it already)
            name: d.name || d.date,
          })),
        });
        setError(null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("❌ [Reports] Fetch failed:", err);
      setError("Could not load data. Retrying…");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
    // Refresh every 30s (not 5s — reduces backend hammering)
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  // ── PDF Download ───────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!userId || downloading) return;
    setDownloading(true);
    try {
      const response = await reportsApi.generateReportDirect(userId);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Learning_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch (err) {
      console.error("❌ [Reports] Download failed:", err);
      setError("PDF download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // ── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center p-20">
          <div className="flex flex-col items-center gap-4 text-brand-500">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <p className="font-semibold text-text-muted">Loading your reports…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const hasGraphData = summary.daily_data.some((d) => d.minutes > 0);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 pb-12 w-full">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-glass-base p-8 rounded-3xl border border-glass-border/50 shadow-sm"
        >
          <div>
            <h1 className="text-4xl font-extrabold text-root-fg">Learning Reports</h1>
            <p className="text-text-muted mt-1">
              Real-time analytics powered by your activity
            </p>
            {lastUpdated && (
              <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                <RefreshCw className="w-3 h-3" />
                <span>Synced at {lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-glass-border bg-glass-base text-sm font-semibold text-text-muted hover:text-root-fg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              {downloading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? "Generating PDF…" : "Download Report"}
            </button>
          </div>
        </motion.div>

        {/* ── Error Banner ── */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-5 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            icon={Clock}
            iconColor="blue-500"
            label="Today's Activity"
            value={summary.today_time}
            unit="mins"
            accentBorder="blue-500/20"
          />
          <StatCard
            icon={Target}
            iconColor="green-500"
            label="Total Sessions"
            value={summary.sessions}
            unit="sessions"
            accentBorder="green-500/20"
          />
          <StatCard
            icon={Zap}
            iconColor="orange-500"
            label="Current Streak"
            value={summary.current_streak}
            unit="days"
            accentBorder="orange-500/20"
          />
          <StatCard
            icon={TrendingUp}
            iconColor="purple-500"
            label="Total Study Time"
            value={summary.total_time}
            unit="mins"
            accentBorder="purple-500/20"
          />
        </div>

        {/* ── Study Consistency Graph ── */}
        <Card className="p-8 overflow-visible">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-2xl font-black text-root-fg">Study Consistency</h3>
              <p className="text-sm text-text-muted mt-1">
                Daily learning minutes — last 7 days
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
              <Activity className="w-3.5 h-3.5" />
              Live Sync Active
            </div>
          </div>

          <div className="h-[300px] w-full">
            {!hasGraphData ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-text-muted border-2 border-dashed border-glass-border rounded-2xl">
                <FileText className="w-8 h-8 opacity-40" />
                <p className="italic text-sm font-medium">
                  No study activity recorded yet — start learning to see your graph!
                </p>
                <p className="text-xs opacity-60">
                  Activity appears here after your first session minute is tracked.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.daily_data}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--glass-border)"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="minutes"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                    barSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

      </div>
    </DashboardLayout>
  );
}
