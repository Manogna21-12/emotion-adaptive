import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, Lock, User, ArrowLeft, Loader2, BrainCircuit, Activity, Sparkles, Fingerprint } from "lucide-react";

// Reusable Deep Emotion Core Visual from Login (Flipped variation)
function AICoreVisual() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-root-bg">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)]" />
      
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute w-[800px] h-[800px] bg-cyan-500/10 blur-[120px] rounded-full"
      />
      <motion.div 
        animate={{ scale: [1, 1.5, 1], rotate: [0, 90, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute w-[600px] h-[600px] bg-brand-500/10 blur-[100px] rounded-full -translate-x-32 -translate-y-32"
      />

      <div className="relative w-[500px] h-[500px] flex items-center justify-center">
        
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-32 h-32 bg-gradient-to-tr from-cyan-400 to-purple-500 rounded-full blur-[25px] z-10"
        />
        
        <div className="absolute w-24 h-24 bg-panel-bg rounded-full border border-glass-border shadow-[0_0_50px_rgba(6,182,212,0.6)] z-20 flex items-center justify-center overflow-hidden backdrop-blur-3xl">
          <BrainCircuit className="w-10 h-10 text-cyan-400 animate-pulse" />
        </div>

        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          className="absolute w-[320px] h-[320px] border border-cyan-500/20 rounded-full border-dashed"
        >
          <div className="absolute top-1/2 -left-2 w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(6,182,212,1)]" />
        </motion.div>

        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          className="absolute w-[450px] h-[450px] border border-brand-500/20 rounded-full opacity-50"
        >
          <div className="absolute -top-3 left-1/3 w-6 h-6 bg-brand-500 rounded-full shadow-[0_0_20px_rgba(var(--brand-500),1)] flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
          </div>
        </motion.div>

        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-cyan-400 to-brand-500 blur-[1px]"
            style={{ 
               width: Math.random() * 10 + 4 + 'px', 
               height: Math.random() * 10 + 4 + 'px',
            }}
            animate={{
              rotate: [0, -360],
              x: [Math.sin(i) * 200, Math.cos(i) * 300, Math.sin(i) * 200],
              y: [Math.cos(i) * 200, Math.sin(i) * 300, Math.cos(i) * 200],
              opacity: [0.1, 0.7, 0.1]
            }}
            transition={{
              duration: Math.random() * 15 + 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}

        {/* Interconnecting Neural Web SVG */}
        <svg className="absolute inset-0 w-full h-full opacity-30 z-0 pointer-events-none" viewBox="0 0 500 500">
           <motion.path 
              d="M250,250 L150,150 M250,250 L350,150 M250,250 L150,350 M250,250 L350,350 M150,150 L350,150 L350,350 L150,350 Z"
              stroke="url(#grad2)" 
              strokeWidth="1.5" 
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
           />
           <defs>
             <linearGradient id="grad2" x1="100%" y1="100%" x2="0%" y2="0%">
               <stop offset="0%" stopColor="#06b6d4" />
               <stop offset="100%" stopColor="var(--brand-500)" />
             </linearGradient>
           </defs>
        </svg>

      </div>

      <div className="absolute bottom-10 text-center z-30">
        <h2 className="text-2xl font-black text-white tracking-widest drop-shadow-xl uppercase opacity-80 flex items-center gap-3">
          <Activity className="w-6 h-6 text-cyan-400" /> Neural Sync Initiated
        </h2>
        <p className="text-sm font-medium text-cyan-200 mt-2 opacity-60 tracking-widest">Connect biometric profile identity</p>
      </div>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { signupUser } = useAuth();
  
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const result = await signupUser(form);
      if (result.success) {
        setSuccessMsg("Sign Up Successful! Redirecting...");
        setTimeout(() => {
           navigate("/");
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || err.message || "Registration failed.");
      setLoading(false);
    }
  };

  return (
    // Note: flex-row-reverse flips the layout from Login.jsx! Form comes in from the RIGHT.
    <div className="min-h-screen bg-root-bg flex items-center justify-center relative overflow-hidden flex-col lg:flex-row-reverse">
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>
      
      {/* 50% RIGHT - Auth Form (Appears physically on the right now) */}
      <motion.div 
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 70, damping: 20 }}
        className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center px-8 lg:px-24 xl:px-32 relative z-20 bg-panel-bg shadow-[-20px_0_50px_rgba(0,0,0,0.3)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.8)] border-l border-glass-border"
      >
        <div className="w-full max-w-md mx-auto py-12">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3 mb-10"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-400 to-brand-500 flex items-center justify-center shadow-lg animate-glow">
               <Fingerprint className="text-white w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-root-fg">
              Emoti<span className="text-cyan-500">Learn</span>
            </h1>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-4xl font-extrabold text-root-fg tracking-tight mb-2">Create Identity</h2>
            <p className="text-text-muted font-medium mb-8">Join the neuro-adaptive learning network.</p>

            <form onSubmit={handleRegister} className="space-y-5">
              
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Full Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-brand-500 transition-colors">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    name="name"
                    type="text"
                    placeholder="Your Name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-glass-base border-2 border-glass-border rounded-xl pl-12 pr-4 py-3 text-root-fg focus:outline-none focus:border-brand-500 focus:ring-0 transition-all font-semibold placeholder:text-text-muted/50 hover:bg-glass-hover focus:bg-root-bg shadow-inner shadow-black/5 dark:shadow-black/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
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
                    className="w-full bg-glass-base border-2 border-glass-border rounded-xl pl-12 pr-4 py-3 text-root-fg focus:outline-none focus:border-cyan-500 focus:ring-0 transition-all font-semibold placeholder:text-text-muted/50 hover:bg-glass-hover focus:bg-root-bg shadow-inner shadow-black/5 dark:shadow-black/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-cyan-500 transition-colors">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="w-full bg-glass-base border-2 border-glass-border rounded-xl pl-12 pr-4 py-3 text-root-fg focus:outline-none focus:border-cyan-500 focus:ring-0 transition-all font-semibold placeholder:text-text-muted/50 hover:bg-glass-hover focus:bg-root-bg shadow-inner shadow-black/5 dark:shadow-black/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                 <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Account Type</label>
                 <div className="grid grid-cols-2 gap-3 mt-1">
                    <div 
                      onClick={() => setForm({...form, role: "student"})}
                      className={`px-4 py-3 rounded-xl border-2 cursor-pointer font-bold text-sm text-center transition-all ${form.role === "student" ? "bg-brand-500/10 border-brand-500 text-brand-500 shadow-inner" : "bg-glass-base border-glass-border text-text-muted hover:bg-glass-hover"}`}
                    >
                       Student / Learner
                    </div>
                    <div 
                      onClick={() => setForm({...form, role: "admin"})}
                      className={`px-4 py-3 rounded-xl border-2 cursor-pointer font-bold text-sm text-center transition-all ${form.role === "admin" ? "bg-cyan-500/10 border-cyan-500 text-cyan-500 shadow-inner" : "bg-glass-base border-glass-border text-text-muted hover:bg-glass-hover"}`}
                    >
                       Admin / Teacher
                    </div>
                 </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm p-4 rounded-xl font-bold flex items-center justify-center gap-2 overflow-hidden mt-3"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {error}
                  </motion.div>
                )}
                {successMsg && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-green-500/10 border border-green-500/30 text-green-500 text-sm p-4 rounded-xl font-bold flex items-center justify-center gap-2 overflow-hidden mt-3"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {successMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={loading || successMsg !== ""}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 to-brand-600 hover:from-cyan-400 hover:to-brand-500 text-white py-4 rounded-xl font-black text-lg transition-all shadow-[0_10px_30px_rgba(6,182,212,0.3)] hover:shadow-[0_10px_40px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:cursor-not-allowed group hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Loader2 className="w-6 h-6" />
                    </motion.div>
                  ) : (
                    <>
                      Sign Up <Sparkles className="w-5 h-5 group-hover:scale-125 transition-transform" />
                    </>
                  )}
                </button>
              </div>

            </form>

            <div className="mt-8">
               <button 
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2 text-text-muted font-bold hover:text-cyan-400 transition-colors mx-auto group text-sm"
               >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
                  Back to Login
               </button>
            </div>
            
          </motion.div>
        </div>
      </motion.div>

      {/* 50% LEFT - Magnificant Visual Core (Flipped automatically by flex-row-reverse) */}
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