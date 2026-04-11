"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { AchievementCard } from "./AchievementCard";
import { ConfettiCanvas } from "./Confetti";
import type { AchievementBadge } from "@/lib/achievements";

interface AchievementOverlayProps {
  achievements: AchievementBadge[];
  onClose: () => void;
}

export function AchievementOverlay({ achievements, onClose }: AchievementOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = achievements[currentIndex];

  useEffect(() => {
    if (achievements.length === 0) onClose();
  }, [achievements, onClose]);

  if (!current) return null;

  const next = () => {
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
      <ConfettiCanvas />
      
      <AnimatePresence mode="wait">
        <motion.div
           key={current.badgeId}
           initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
           animate={{ scale: 1, opacity: 1, rotateY: 0 }}
           exit={{ scale: 1.5, opacity: 0, rotateY: -90 }}
           transition={{ type: "spring", damping: 12, stiffness: 100 }}
           className="relative max-w-sm w-full"
        >
          {/* Rays / Glow behind */}
          <div className="absolute inset-0 -z-10 animate-pulse bg-white/10 blur-[100px] rounded-full" />
          
          <div className="text-center mb-8">
             <motion.div 
               initial={{ y: 20, opacity: 0 }} 
               animate={{ y: 0, opacity: 1 }} 
               transition={{ delay: 0.3 }}
               className="flex items-center justify-center gap-2 text-[var(--nutri-green)] font-black uppercase tracking-[0.3em] text-xs mb-2"
             >
               <Sparkles className="w-4 h-4 fill-[var(--nutri-green)]" />
               Achievement Unlocked
               <Sparkles className="w-4 h-4 fill-[var(--nutri-green)]" />
             </motion.div>
             <motion.h2 
               initial={{ y: 20, opacity: 0 }} 
               animate={{ y: 0, opacity: 1 }} 
               transition={{ delay: 0.4 }}
               className="text-4xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl"
             >
               Level Up!
             </motion.h2>
          </div>

          <div className="scale-125 hover:scale-125">
            <AchievementCard 
              title={current.title}
              description={current.description}
              tier={current.tier}
              icon={current.icon}
              unlockedAt={new Date()}
            />
          </div>

          <motion.button
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            onClick={next}
            className="mt-16 w-full py-4 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
            {currentIndex < achievements.length - 1 ? "Next Reward" : "Claim & Continue"}
          </motion.button>
        </motion.div>
      </AnimatePresence>

      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-3 text-white/30 hover:text-white transition-colors"
      >
        <X className="w-8 h-8" />
      </button>
    </div>
  );
}
