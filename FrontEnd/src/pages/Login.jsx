import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, Lock, ArrowRight, Loader2, BrainCircuit, Activity, Sparkles, User, Fingerprint, Eye, EyeOff } from "lucide-react";
import { reportsApi } from "../services/api";

// The breathtaking interactive AI Core visual
function AICoreVisual() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-root-bg">
      {/* Deep Space Background Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--brand-500),0.05)_0%,transparent_70%)]" />
      
      {/* Dynamic Nebulas */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute w-[800px] h-[800px] bg-brand-500/10 blur-[120px] rounded-full"
      />
      <motion.div 
        animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute w-[600px] h-[600px] bg-cyan-500/10 blur-[100px] rounded-full translate-x-32 translate-y-32"
      />

      {/* The Central AI Core Engine */}
      <div className="relative w-[500px] h-[500px] flex items-center justify-center">
        
        {/* Core Pulse */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-32 h-32 bg-gradient-to-tr from-brand-600 to-cyan-400 rounded-full blur-[20px] z-10"
        />
        
        {/* Central Solid Orb */}
        <div className="absolute w-24 h-24 bg-panel-bg rounded-full border border-glass-border shadow-[0_0_50px_rgba(var(--brand-500),0.6)] z-20 flex items-center justify-center overflow-hidden backdrop-blur-3xl">
          <BrainCircuit className="w-10 h-10 text-brand-500 animate-pulse" />
        </div>

        {/* Orbiting Sync Rings */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute w-[300px] h-[300px] border border-brand-500/20 rounded-full"
        >
          <div className="absolute -top-2 left-1/2 w-4 h-4 bg-brand-500 rounded-full shadow-[0_0_15px_rgba(var(--brand-500),1)]" />
        </motion.div>

        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute w-[400px] h-[400px] border border-cyan-500/20 rounded-full border-dashed"
        >
          <div className="absolute top-1/2 -left-3 w-6 h-6 bg-cyan-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,1)] flex items-center justify-center">
              <Activity className="w-3 h-3 text-white" />
          </div>
        </motion.div>

        {/* Orbiting Emotion Nodes */}
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-brand-500 to-purple-500 blur-[2px]"
            style={{ 
               width: Math.random() * 15 + 5 + 'px', 
               height: Math.random() * 15 + 5 + 'px',
            }}
            animate={{
              rotate: [0, 360],
              x: [Math.sin(i) * 150, Math.cos(i) * 250, Math.sin(i) * 150],
              y: [Math.cos(i) * 150, Math.sin(i) * 250, Math.cos(i) * 150],
              opacity: [0.2, 0.8, 0.2]
            }}
            transition={{
              duration: Math.random() * 10 + 15,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}

        {/* Interconnecting Neural Web SVG */}
        <svg className="absolute inset-0 w-full h-full opacity-30 z-0 pointer-events-none" viewBox="0 0 500 500">
           <motion.path 
              d="M250,250 L100,100 M250,250 L400,100 M250,250 L100,400 M250,250 L400,400 M100,100 L400,100 L400,400 L100,400 Z"
              stroke="url(#grad1)" 
              strokeWidth="1" 
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
           />
           <defs>
             <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stopColor="var(--brand-500)" />
               <stop offset="100%" stopColor="#06b6d4" />
             </linearGradient>
           </defs>
        </svg>

      </div>

      <div className="absolute bottom-10 text-center z-30">
        <h2 className="text-2xl font-black text-white tracking-widest drop-shadow-xl uppercase opacity-80 flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-brand-400" /> Cognitive Engine Online
        </h2>
        <p className="text-sm font-medium text-brand-200 mt-2 opacity-60 tracking-widest">Real-Time Affective State Analysis</p>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { loginUser, backendReady, recheckBackend } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (backendReady === false) {
      setError("Backend is not running. Please start the server (from project root: npm run dev).");
      return;
    }
    setLoading(true);

    try {
      const result = await loginUser(form);
      if (result.success) {
        const userId = result.user.id || result.user.user_id;
        // Logic to increment login session count in analytics
        if (userId) {
          reportsApi.logLogin(userId).catch(err => console.error("Login analytics failed:", err));
        }

        const role = result.user.role;
        setLoading(false);
        navigate(role === "admin" ? "/admin-dashboard" : "/student-dashboard");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Login failed.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-root-bg flex items-center justify-center relative overflow-hidden flex-col lg:flex-row">
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>
      
      {/* 50% LEFT - Auth Form */}
      <motion.div 
        initial={{ x: "-100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 70, damping: 20 }}
        className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center px-8 lg:px-24 xl:px-32 relative z-20 bg-panel-bg shadow-[20px_0_50px_rgba(0,0,0,0.3)] dark:shadow-[20px_0_50px_rgba(0,0,0,0.8)] border-r border-glass-border"
      >
        <div className="w-full max-w-md mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3 mb-12"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 flex items-center justify-center shadow-lg animate-glow">
               <Fingerprint className="text-white w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-root-fg">
              Emoti<span className="text-brand-500">Learn</span>
            </h1>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-4xl font-extrabold text-root-fg tracking-tight mb-2">Welcome Back</h2>
            <p className="text-text-muted font-medium mb-10">Access your adaptive learning environment.</p>

            {backendReady === false && (
              <div className="mb-6 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-500">
                Backend is not running. Start it from the project folder with{" "}
                <code className="rounded bg-root-bg/50 px-1 py-0.5 text-xs">npm run dev</code>
                .
                <button
                  type="button"
                  onClick={() => recheckBackend()}
                  className="ml-2 text-brand-500 underline underline-offset-2"
                >
                  Retry connection
                </button>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Email Address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-brand-500 transition-colors">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-glass-base border-2 border-glass-border rounded-2xl pl-12 pr-4 py-4 text-root-fg focus:outline-none focus:border-brand-500 focus:ring-0 transition-all font-semibold placeholder:text-text-muted/50 hover:bg-glass-hover focus:bg-root-bg shadow-inner shadow-black/5 dark:shadow-black/20"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex justify-between">
                  Password
                  <span onClick={() => navigate("/forgot-password")} className="text-brand-500 cursor-pointer hover:underline normal-case tracking-normal">Forgot?</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-cyan-500 transition-colors">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="w-full bg-glass-base border-2 border-glass-border rounded-2xl pl-12 pr-12 py-4 text-root-fg focus:outline-none focus:border-cyan-500 focus:ring-0 transition-all font-semibold placeholder:text-text-muted/50 hover:bg-glass-hover focus:bg-root-bg shadow-inner shadow-black/5 dark:shadow-black/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-cyan-500 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm p-4 rounded-xl font-bold flex items-center justify-center gap-2 overflow-hidden"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit" 
                disabled={loading || backendReady === false}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-[0_10px_30px_rgba(var(--brand-500),0.3)] hover:shadow-[0_10px_40px_rgba(var(--brand-500),0.5)] disabled:opacity-50 disabled:cursor-not-allowed group hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Loader2 className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <>
                    Login <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </button>

            </form>

            <p className="text-center mt-12 text-sm text-text-muted font-medium">
              New to EmotiLearn?{" "}
              <span 
                onClick={() => navigate("/register")}
                className="text-brand-500 font-bold cursor-pointer hover:text-cyan-400 transition-colors relative group inline-block"
              >
                Create Account
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </span>
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* 50% RIGHT - Magnificant Visual Core */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.2 }}
        className="hidden lg:flex w-1/2 min-h-screen relative z-0"
      >
        <AICoreVisual />
      </motion.div>

    </div>
  );
}