"use client";

import React from "react";
import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import type { AchievementTier } from "@/lib/achievements";

interface AchievementCardProps {
  readonly title: string;
  readonly description: string;
  readonly tier: AchievementTier;
  readonly icon?: string;
  readonly unlockedAt?: Date;
  readonly isLocked?: boolean;
}

export function AchievementCard({
  title,
  description,
  tier,
  icon,
  unlockedAt,
  isLocked = false
}: AchievementCardProps) {
  // Map tier to colors
  const tierColors: Record<AchievementTier, { bg: string; border: string; glow: string }> = {
    BRONZE: { 
      bg: "from-[#a87932] to-[#6d4d1d]", 
      border: "border-[#a87932]/30",
      glow: "shadow-[#a87932]/20"
    },
    SILVER: { 
      bg: "from-[#b4b4b4] to-[#7d7d7d]", 
      border: "border-[#b4b4b4]/30",
      glow: "shadow-[#b4b4b4]/20"
    },
    GOLD: { 
      bg: "from-[#f1c40f] to-[#b7950b]", 
      border: "border-[#f1c40f]/30",
      glow: "shadow-[#f1c40f]/20"
    },
    PLATINUM: { 
      bg: "from-[#3498db] to-[#21618c]", 
      border: "border-[#3498db]/30",
      glow: "shadow-[#3498db]/20"
    }
  };

  const colors = tierColors[tier];
  
  // Resolve icon component
  const IconComponent = (icon && icon in LucideIcons ? (LucideIcons[icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>) : LucideIcons.Trophy);

  return (
    <motion.div
      initial={isLocked ? {} : { opacity: 0, scale: 0.9 }}
      animate={isLocked ? {} : { opacity: 1, scale: 1 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative group p-4 rounded-2xl glass-premium border ${colors.border} ${isLocked ? 'opacity-40 grayscale pointer-events-none' : 'shadow-xl'} ${colors.glow} transition-all duration-500`}
    >
      <div className="flex flex-col items-center text-center gap-3">
        {/* Tier Badge Background */}
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors.bg} flex items-center justify-center relative overflow-hidden shadow-inner`}>
           <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
           <IconComponent className="w-8 h-8 text-white drop-shadow-lg" />
           
           {/* Animated Shine Effect */}
           <motion.div 
             className="absolute inset-0 bg-white/20 -skew-x-12 translate-x-[-200%]"
             animate={{ translateX: ["200%", "-200%"] }}
             transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
           />
        </div>

        <div>
           <div className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 ${isLocked ? 'text-gray-500' : 'text-white/50'}`}>
             {tier} Milestone
           </div>
           <h4 className="text-sm font-black tracking-tight uppercase leading-none mb-1">{title}</h4>
           <p className="text-[10px] font-medium opacity-40 leading-tight max-w-[120px] mx-auto">
             {description}
           </p>
        </div>
      </div>

      {unlockedAt && (
        <div className="absolute top-2 right-2">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        </div>
      )}

      {/* Hover Glow Layer */}
      <div className={`absolute inset-0 -z-10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${colors.bg} blur-2xl`} />
    </motion.div>
  );
}
