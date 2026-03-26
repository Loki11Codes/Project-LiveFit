'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function CloudBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] select-none bg-gradient-to-b from-[#f0f7ff] to-[#ffffff] dark:from-[#050505] dark:to-[#000000]">
      {/* Subtle Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] grainy-bg" />

      {/* Animated Clouds */}
      <Cloud 
        delay={0} 
        duration={60} 
        top="15%" 
        left="-10%" 
        scale={1.2} 
        opacity={0.4} 
      />
      <Cloud 
        delay={10} 
        duration={85} 
        top="45%" 
        left="110%" 
        scale={0.8} 
        opacity={0.3} 
        reverse 
      />
      <Cloud 
        delay={25} 
        duration={70} 
        top="70%" 
        left="-20%" 
        scale={1.5} 
        opacity={0.25} 
      />
      <Cloud 
        delay={5} 
        duration={100} 
        top="10%" 
        left="90%" 
        scale={1} 
        opacity={0.2} 
        reverse 
      />

      {/* Atmospheric Gradients */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#e0f0ff]/30 to-transparent dark:from-[#1a2a3a]/20 pointer-events-none" />
    </div>
  );
}

function Cloud({ 
  delay = 0, 
  duration = 40, 
  top = "20%", 
  left = "0%", 
  scale = 1, 
  opacity = 0.5,
  reverse = false
}: { 
  readonly delay?: number; 
  readonly duration?: number; 
  readonly top?: string; 
  readonly left?: string; 
  readonly scale?: number; 
  readonly opacity?: number;
  readonly reverse?: boolean;
}) {
  return (
    <motion.div
      initial={{ x: reverse ? "10vw" : "-10vw", opacity: 0 }}
      animate={{ 
        x: reverse ? "-110vw" : "110vw",
        opacity: [0, opacity, opacity, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "linear",
      }}
      style={{
        position: 'absolute',
        top,
        left,
        scale,
        filter: 'blur(40px)',
        zIndex: -1,
      }}
    >
      <svg
        width="400"
        height="200"
        viewBox="0 0 400 200"
        fill="currentColor"
        className="text-white dark:text-[#ffffff10]"
      >
        <circle cx="100" cy="100" r="80" />
        <circle cx="200" cy="100" r="100" />
        <circle cx="300" cy="100" r="80" />
        <circle cx="150" cy="60" r="70" />
        <circle cx="250" cy="60" r="70" />
      </svg>
    </motion.div>
  );
}
