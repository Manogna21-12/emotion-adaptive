import React from "react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";

export default function DashboardLayout({ children }) {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-root-bg overflow-hidden transition-colors duration-500">
      
      {/* Background decoration elements */}
      <div className="fixed top-[-100px] left-[-100px] w-96 h-96 bg-brand-500/30 rounded-full blur-[120px] pointer-events-none transition-colors duration-500" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[150px] pointer-events-none transition-colors duration-500" />
      <div className="fixed top-[20%] right-[10%] w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none transition-colors duration-500" />
      
      <Sidebar role={user?.role || "student"} />
      
      <div className="flex-1 flex flex-col relative w-[calc(100%-16rem)] ml-64 h-screen z-10 transition-colors duration-500">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-8 px-10 pb-12 scroll-smooth scrollbar-hide text-root-fg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-7xl mx-auto h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

    </div>
  );
}
