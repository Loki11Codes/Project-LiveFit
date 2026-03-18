"use client";

import React from "react";
import { motion } from "framer-motion";

export function NutritionIllustration() {
  return (
    <div className="relative mb-8 flex h-40 w-full items-center justify-center overflow-hidden rounded-3xl bg-zinc-900/5 p-6">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-90"
      >
        {/* The "Plate" Background */}
        <motion.circle
          cx="100"
          cy="50"
          r="40"
          stroke="currentColor"
          strokeOpacity="0.05"
          strokeWidth="1"
          strokeDasharray="4 4"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />

        {/* Nutrition Progress Rings (Stylized) */}
        <motion.circle
          cx="100"
          cy="50"
          r="32"
          stroke="#10b981"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="200"
          initial={{ strokeDashoffset: 200 }}
          animate={{ strokeDashoffset: 80 }}
          transition={{ duration: 2, ease: "easeOut", delay: 0.2 }}
        />
        <motion.circle
          cx="100"
          cy="50"
          r="24"
          stroke="#f59e0b"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="150"
          initial={{ strokeDashoffset: 150 }}
          animate={{ strokeDashoffset: 60 }}
          transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
        />

        {/* The Central "Apple/Fruit" Icon */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.8 }}
        >
          {/* Stem */}
          <path d="M100 42 Q105 35 110 38" stroke="#065f46" strokeWidth="2" strokeLinecap="round" />
          {/* Main Body */}
          <circle cx="100" cy="50" r="10" fill="#ef4444" />
          <path d="M96 46 Q100 48 104 46" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
        </motion.g>

        {/* Floating Vitamin Particles */}
        {[
          { x: 60, y: 30, color: "#f59e0b", delay: 1 },
          { x: 140, y: 40, color: "#06b6d4", delay: 1.3 },
          { x: 80, y: 75, color: "#10b981", delay: 1.6 },
          { x: 120, y: 20, color: "#ef4444", delay: 1.9 },
        ].map((p) => (
          <motion.circle
            key={`${p.x}-${p.y}-${p.color}`}
            cx={p.x}
            cy={p.y}
            r="2"
            fill={p.color}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0, 1, 0], y: -20 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Rising Nutrition Bars (Bottom Right) */}
        <g transform="translate(150, 60)">
          <motion.rect x="0" y="20" width="6" height="0" rx="2" fill="#10b981" animate={{ height: 25, y: -5 }} transition={{ duration: 1, delay: 2, repeat: Infinity, repeatType: "reverse" }} />
          <motion.rect x="10" y="20" width="6" height="0" rx="2" fill="#f59e0b" animate={{ height: 18, y: 2 }} transition={{ duration: 1, delay: 2.2, repeat: Infinity, repeatType: "reverse" }} />
          <motion.rect x="20" y="20" width="6" height="0" rx="2" fill="#06b6d4" animate={{ height: 12, y: 8 }} transition={{ duration: 1, delay: 2.4, repeat: Infinity, repeatType: "reverse" }} />
        </g>
      </svg>
      
      {/* Decorative Orbs */}
      <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-emerald-500/10 blur-xl" />
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500/10 blur-xl" />
    </div>
  );
}
