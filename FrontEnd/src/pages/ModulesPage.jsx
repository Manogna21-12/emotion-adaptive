import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { learningApi } from "../services/api";
import DashboardLayout from "../components/DashboardLayout";
import ModuleCard from "../components/ModuleCard";
import { Loader2, ArrowLeft, Layers, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";

export default function ModulesPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchModules = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await learningApi.getModules(courseId);
      setModules(data.modules || data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch modules");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
    
    // Auto Refresh every 10 seconds
    const interval = setInterval(() => {
      fetchModules(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [courseId]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-10">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 border-b border-glass-border/50 pb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate("/courses")}
                className="p-3 bg-glass-base hover:bg-glass-hover rounded-2xl transition border border-glass-border shadow-sm group"
              >
                <ArrowLeft className="w-5 h-5 text-text-muted group-hover:text-root-fg transition-colors" />
              </button>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-brand-500 tracking-tight flex items-center gap-3">
                <Layers className="w-7 h-7 text-cyan-500 drop-shadow-sm" /> 
                Course Modules
              </h1>
            </div>
            
            <button 
              onClick={() => fetchModules()}
              className="p-2 sm:p-3 bg-glass-base hover:bg-glass-hover rounded-2xl transition border border-glass-border shadow-sm group flex items-center gap-2"
            >
              <RefreshCcw className="w-5 h-5 text-text-muted group-hover:text-cyan-500 transition-colors" />
              <span className="text-text-muted group-hover:text-root-fg font-medium hidden sm:block">Refresh</span>
            </button>
          </div>
          <p className="text-base text-text-muted font-medium ml-16 max-w-2xl">
            Select a learning module to dive deeply into specific concepts seamlessly connected.
          </p>
        </motion.div>

        {loading ? (
             <div className="flex justify-center flex-col items-center p-20 gap-4">
                 <Loader2 className="w-12 h-12 animate-spin text-cyan-500" />
                 <span className="text-cyan-500 font-bold tracking-widest uppercase text-sm">Loading Modules...</span>
             </div>
        ) : error ? (
             <div className="p-4 bg-red-500/10 text-red-500 rounded-xl border border-red-500/50 flex gap-3 mt-4 w-fit">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-1.5" /> {error}
             </div>
        ) : (
             <motion.div 
               className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4"
               initial="hidden"
               animate="visible"
               variants={{
                   hidden: { opacity: 0 },
                   visible: {
                     opacity: 1,
                     transition: { staggerChildren: 0.1 }
                   }
               }}
             >
                {modules.length === 0 ? (
                    <p className="text-text-muted bg-glass-base p-6 rounded-2xl border border-glass-border col-span-3 text-lg font-semibold text-center">No modules published under this course yet.</p>
                ) : (
                    modules.map((mod, idx) => (
                        <motion.div 
                            key={mod.id || mod._id || idx}
                            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                        >
                            <ModuleCard module={mod} />
                        </motion.div>
                    ))
                )}
             </motion.div>
        )}

      </div>
    </DashboardLayout>
  );
}
