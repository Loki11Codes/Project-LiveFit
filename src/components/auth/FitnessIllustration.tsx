"use client";

import React from "react";
import { motion } from "framer-motion";

export function FitnessIllustration() {
  return (
    <div className="relative mb-8 flex h-32 w-full items-center justify-center overflow-hidden rounded-3xl bg-zinc-900/5 p-4">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-80"
      >
        {/* Background Grid Lines */}
        <line x1="0" y1="20" x2="200" y2="20" stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.5" />
        <line x1="0" y1="40" x2="200" y2="40" stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.5" />
        <line x1="0" y1="60" x2="200" y2="60" stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.5" />
        
        {/* The "Pulse" Path */}
        <motion.path
          d="M0 60 L20 60 L35 20 L50 65 L65 40 L80 40 L95 10 L110 70 L125 45 L140 45 L155 25 L170 60 L200 60"
          stroke="url(#pulseGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 2.5,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />

        {/* Floating Data Points */}
        <motion.circle
          cx="35"
          cy="20"
          r="3"
          fill="#f59e0b"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ delay: 0.5, duration: 0.5 }}
        />
        <motion.circle
          cx="95"
          cy="10"
          r="3"
          fill="#06b6d4"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ delay: 1.2, duration: 0.5 }}
        />
        <motion.circle
          cx="155"
          cy="25"
          r="3"
          fill="#10b981"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ delay: 1.8, duration: 0.5 }}
        />

        <defs>
          <linearGradient id="pulseGradient" x1="0" y1="40" x2="200" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f59e0b" />
            <stop offset="0.5" stopColor="#06b6d4" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Decorative Orbs */}
      <div className="absolute -left-4 -top-4 h-16 w-16 rounded-full bg-amber-500/10 blur-xl" />
      <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-cyan-500/10 blur-xl" />
    </div>
  );
}
