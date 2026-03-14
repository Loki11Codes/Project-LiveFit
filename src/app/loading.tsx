'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-6">
      <div className="relative">
        <motion.div
          className="w-20 h-20 border-4 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        >
          <div className="w-10 h-10 bg-[var(--accent)] rounded-xl transform rotate-45 shadow-lg shadow-[var(--accent)]/20" />
        </motion.div>
      </div>
      
      <motion.p
        className="mt-8 text-[var(--text-secondary)] font-medium tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        LiveFit is optimizing...
      </motion.p>
    </div>
  );
}
