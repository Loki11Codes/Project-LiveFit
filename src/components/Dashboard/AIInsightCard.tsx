"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Utensils, Dumbbell, Zap, ArrowRight, Brain } from "lucide-react";
import type { AIInsight, TabId } from "@/lib/types";

interface AIInsightCardProps {
  insight: AIInsight;
  onAction?: (tab: TabId) => void;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ insight, onAction }) => {
  const getIcon = () => {
    switch (insight.type) {
      case "nutrition":
        return <Utensils className="w-4 h-4 text-[#e67e22]" />;
      case "workout":
        return <Dumbbell className="w-4 h-4 text-[#3498db]" />;
      case "habit":
        return <Zap className="w-4 h-4 text-[#f1c40f]" />;
      default:
        return <Brain className="w-4 h-4 text-[#9b59b6]" />;
    }
  };

  const getAccentColor = () => {
    switch (insight.type) {
      case "nutrition":
        return "rgba(230, 126, 34, 0.1)";
      case "workout":
        return "rgba(52, 152, 219, 0.1)";
      case "habit":
        return "rgba(241, 196, 15, 0.1)";
      default:
        return "rgba(155, 89, 182, 0.1)";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="glass-premium rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group/insight"
    >
      {/* Decorative Glow */}
      <div 
        className="absolute -top-4 -right-4 w-16 h-16 blur-2xl opacity-20 transition-opacity group-hover/insight:opacity-40"
        style={{ backgroundColor: getAccentColor() }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
            {getIcon()}
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
            AI {insight.type} Insight
          </span>
        </div>
        <Sparkles className="w-3 h-3 text-[#f1c40f] opacity-40 animate-pulse" />
      </div>

      <div className="space-y-1">
        <h4 className="text-[14px] font-bold tracking-tight text-(--text-main)">
          {insight.title}
        </h4>
        <p className="text-[12px] leading-relaxed opacity-60 font-medium">
          {insight.description}
        </p>
      </div>

      {insight.actionLabel && insight.actionTab && (
        <button
          onClick={() => onAction?.(insight.actionTab!)}
          className="mt-1 flex items-center gap-2 text-[11px] font-bold text-[#e67e22] hover:text-[#d35400] transition-colors group/btn"
        >
          {insight.actionLabel}
          <ArrowRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
        </button>
      )}
    </motion.div>
  );
};
