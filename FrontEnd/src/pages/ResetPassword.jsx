import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ArrowRight, Loader2, Link2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { resetPassword } from "../services/authService";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (!token) {
      setError("Invalid or missing reset token.");
      setLoading(false);
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (form.newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const res = await resetPassword(token, form.newPassword);
      setMessage(res.data?.message || "Password updated successfully. You can now login.");
      setTimeout(() => navigate("/"), 3000); // Route back to login after 3s
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reset password. The link may have expired.");
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
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <Link2 className="w-8 h-8 text-cyan-500" />
          </div>
        </div>

        <h2 className="text-3xl font-black text-center text-root-fg mb-2">Reset Password</h2>
        <p className="text-center text-text-muted mb-8 text-sm">
          Enter your new password below. Ensure it is strong and secure.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">New Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-cyan-500 transition-colors">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                required
                className="w-full bg-glass-base border-2 border-glass-border rounded-2xl pl-12 pr-12 py-4 text-root-fg focus:outline-none focus:border-cyan-500 focus:ring-0 transition-all font-semibold placeholder:text-text-muted/50"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-cyan-500 transition-colors focus:outline-none">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Confirm Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-cyan-500 transition-colors">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
                className="w-full bg-glass-base border-2 border-glass-border rounded-2xl pl-12 pr-12 py-4 text-root-fg focus:outline-none focus:border-cyan-500 focus:ring-0 transition-all font-semibold placeholder:text-text-muted/50"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-cyan-500 transition-colors focus:outline-none">
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
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
            className="w-full flex items-center justify-center gap-3 bg-cyan-500 hover:bg-cyan-600 text-white py-4 rounded-2xl font-black text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Update Password <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-text-muted font-medium cursor-pointer hover:text-cyan-400" onClick={() => navigate("/")}>
          Return to Login
        </p>
      </motion.div>
    </div>
  );
}
