import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Shield, Bell, Moon, Sun, Monitor, Laptop, Zap, CheckCircle2, Palette } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [style, setStyle] = useState("visual");

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      // Simulate account deletion
      alert("Account successfully deleted.");
      logout();
    }
  };

  const [formData, setFormData] = useState({
    name: user?.name || "Alex Learner",
    email: user?.email || "alex@example.com",
    role: user?.role || "Student",
  });

  const handleSave = () => {
    setIsEditing(false);
    // Submit data logic here automatically
  };

  const COLORS = [
    { id: "indigo", name: "Indigo", code: "bg-[#6366f1]" },
    { id: "cyan", name: "Cyan", code: "bg-[#06b6d4]" },
    { id: "purple", name: "Purple", code: "bg-[#a855f7]" },
    { id: "green", name: "Green", code: "bg-[#22c55e]" },
    { id: "orange", name: "Orange", code: "bg-[#f97316]" },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 pb-10 max-w-5xl mx-auto">
        
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-root-fg to-text-muted">
            Profile & Settings
          </h1>
          <p className="text-text-muted mt-2">Manage your account preferences and learning configurations.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Profile Card Section */}
          <Card className="lg:col-span-1 glass-panel h-max shadow-2xl overflow-hidden relative border-t-4 border-t-brand-500">
            
            <motion.div 
              layout 
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="p-6 pt-10 flex flex-col items-center justify-center text-center relative z-10"
            >
              <div className="relative group cursor-pointer mb-6">
                <div className="w-32 h-32 rounded-full border-4 border-root-bg shadow-xl bg-gradient-to-tr from-brand-600 via-brand-400 to-cyan-500 p-[3px]">
                   <div className="w-full h-full bg-panel-bg rounded-full flex items-center justify-center overflow-hidden relative">
                     <User className="w-16 h-16 text-text-subtle" />
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="text-xs font-bold text-white tracking-widest uppercase">Change</span>
                     </div>
                   </div>
                </div>
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-root-bg shadow-md z-20"></div>
              </div>

              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div 
                    key="editing"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full space-y-4"
                  >
                    <div className="text-left">
                      <label className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-1 block">Full Name</label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-glass-base border border-glass-border rounded-xl px-4 py-2 text-root-fg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-medium"
                      />
                    </div>
                    <div className="text-left">
                      <label className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-1 block">Email</label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-glass-base border border-glass-border rounded-xl px-4 py-2 text-root-fg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-medium"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button onClick={handleSave} className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-xl font-semibold transition-all shadow-lg">Save</button>
                      <button onClick={() => setIsEditing(false)} className="flex-1 bg-glass-base hover:bg-glass-hover text-root-fg border border-glass-border py-2 rounded-xl font-semibold transition-all">Cancel</button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="viewing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                  >
                    <h2 className="text-2xl font-bold text-root-fg mb-1">{formData.name}</h2>
                    <p className="text-sm text-brand-500 font-medium mb-6 uppercase tracking-widest">{formData.role}</p>
                    
                    <div className="space-y-4 text-left border-t border-glass-border pt-6">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-text-subtle" />
                        <span className="text-text-muted font-medium truncate">{formData.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-text-subtle" />
                        <span className="text-text-muted font-medium truncate">Standard Plan</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-text-subtle" />
                        <span className="text-text-muted font-medium truncate">Push Notifications On</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => setIsEditing(true)}
                      className="w-full mt-8 bg-glass-base hover:bg-glass-hover border border-glass-border text-root-fg font-semibold py-3 rounded-xl transition-all hover:border-brand-500/50"
                    >
                      Edit Profile
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </Card>

          {/* Settings Section */}
          <div className="lg:col-span-2 space-y-6">
            
            <Card className="glass-panel overflow-hidden">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-root-fg mb-6 border-b border-glass-border pb-4">Personalization</h3>
                
                <div className="space-y-8">

                  <div>
                    <h4 className="text-sm font-semibold text-text-muted uppercase tracking-widest mb-4">Content Style</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div 
                        onClick={() => setStyle("visual")}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${style === "visual" ? "border-brand-500 bg-brand-500/10" : "border-glass-border bg-glass-base hover:bg-glass-hover"}`}
                      >
                        <Laptop className={`w-8 h-8 ${style === "visual" ? "text-brand-500" : "text-text-subtle"}`} />
                        <div className="flex-1">
                          <h5 className={`font-bold ${style === "visual" ? "text-brand-600 dark:text-brand-400" : "text-text-muted"}`}>Visual & Interactive</h5>
                          <p className="text-xs text-text-subtle mt-1 leading-relaxed">Prioritizes video content, animated charts, and highly interactive quizzes over text.</p>
                        </div>
                        {style === "visual" && <CheckCircle2 className="w-5 h-5 text-brand-500" />}
                      </div>

                      <div 
                        onClick={() => setStyle("text")}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${style === "text" ? "border-cyan-500 bg-cyan-500/10" : "border-glass-border bg-glass-base hover:bg-glass-hover"}`}
                      >
                        <Zap className={`w-8 h-8 ${style === "text" ? "text-cyan-500" : "text-text-subtle"}`} />
                        <div className="flex-1">
                          <h5 className={`font-bold ${style === "text" ? "text-cyan-600 dark:text-cyan-400" : "text-text-muted"}`}>Reading & Fast</h5>
                          <p className="text-xs text-text-subtle mt-1 leading-relaxed">Prioritizes quick reads, bullet-point notes, and speed over immersive videos.</p>
                        </div>
                        {style === "text" && <CheckCircle2 className="w-5 h-5 text-cyan-500" />}
                      </div>

                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel overflow-hidden border-orange-500/20 bg-orange-500/5">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-orange-500 mb-2 border-b border-orange-500/20 pb-4">Danger Zone</h3>
                <div className="flex items-center justify-between mt-6">
                  <div>
                    <h4 className="font-semibold text-root-fg">Delete Account</h4>
                    <p className="text-xs text-text-muted mt-1">Permanently remove your account and all learning data.</p>
                  </div>
                  <button 
                    onClick={handleDeleteAccount}
                    className="bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/40 px-6 py-2 rounded-xl font-semibold transition-all"
                  >
                    Delete
                  </button>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}