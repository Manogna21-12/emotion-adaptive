import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowRight, Loader2, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { forgotPassword } from "../services/authService";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await forgotPassword(email);
      setMessage(res.data?.message || "Reset link sent to your email");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-root-bg flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-panel-bg p-8 rounded-3xl border border-glass-border shadow-2xl"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center">
            <Key className="w-8 h-8 text-brand-500" />
          </div>
        </div>

        <h2 className="text-3xl font-black text-center text-root-fg mb-2">Forgot Password?</h2>
        <p className="text-center text-text-muted mb-8 text-sm">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Email Address</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-brand-500 transition-colors">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-glass-base border-2 border-glass-border rounded-2xl pl-12 pr-4 py-4 text-root-fg focus:outline-none focus:border-brand-500 focus:ring-0 transition-all font-semibold placeholder:text-text-muted/50"
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-sm p-4 bg-red-500/10 rounded-xl font-bold text-center">
                {error}
              </motion.div>
            )}
            {message && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-green-500 text-sm p-4 bg-green-500/10 rounded-xl font-bold text-center">
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-brand-500 hover:bg-brand-600 text-white py-4 rounded-2xl font-black text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Send Reset Link <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-text-muted font-medium cursor-pointer hover:text-brand-400" onClick={() => navigate("/")}>
          Back to Login
        </p>
      </motion.div>
    </div>
  );
}
