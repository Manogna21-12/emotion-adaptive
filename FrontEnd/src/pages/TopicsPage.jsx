import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { learningApi } from "../services/api";
import DashboardLayout from "../components/DashboardLayout";
import TopicCard from "../components/TopicCard";
import { Loader2, ArrowLeft, Layers } from "lucide-react";
import { motion } from "framer-motion";

export default function TopicsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const data = await learningApi.getTopics(courseId);
        setTopics(data.topics || data);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch topics");
        setLoading(false);
      }
    };
    fetchTopics();
  }, [courseId]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 border-b border-glass-border pb-6"
        >
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/courses")}
              className="p-3 bg-glass-base hover:bg-glass-hover rounded-2xl transition border border-glass-border shadow-sm group"
            >
              <ArrowLeft className="w-6 h-6 text-text-muted group-hover:text-root-fg transition-colors" />
            </button>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-cyan-400 tracking-tight flex items-center gap-3">
              <Layers className="w-8 h-8 text-brand-500 drop-shadow-sm" /> 
              Course Topics
            </h1>
          </div>
          <p className="text-lg text-text-muted font-medium ml-16 max-w-2xl">
            Select a learning module to dive deep. Each topic contains a series of interactive video lessons tailored for your progress.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="w-12 h-12 animate-spin text-brand-500" />
            <span className="ml-4 text-brand-500 font-bold tracking-widest uppercase">Fetching Topics...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/30 flex items-center gap-4">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
             {error}
          </div>
        ) : topics.length === 0 ? (
          <p className="text-text-muted p-10 text-center font-semibold text-lg bg-glass-base border border-glass-border rounded-3xl">
             No topics available for this course yet.
          </p>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
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
            {topics.map((topic, index) => (
              <motion.div 
                key={topic.id || topic._id || index}
                variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                }}
              >
                  <TopicCard topic={topic} courseId={courseId} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
