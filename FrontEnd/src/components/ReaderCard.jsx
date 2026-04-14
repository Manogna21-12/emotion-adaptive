import React from "react";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight } from "lucide-react";

const ReaderCard = ({ title, description, onStart }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="glass-card rounded-3xl p-6 border border-glass-border flex flex-col justify-between h-full group"
    >
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
          <BookOpen className="w-6 h-6 text-brand-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-root-fg">{title}</h3>
          <p className="text-text-muted mt-2 text-sm line-clamp-3">
            {description}
          </p>
        </div>
      </div>
      
      <button 
        onClick={onStart}
        className="mt-6 w-full py-3 rounded-xl bg-glass-base border border-glass-border hover:bg-brand-500 hover:text-white transition-all flex items-center justify-center gap-2 font-medium"
      >
        Start Reading
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default ReaderCard;
