'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  readonly percentage: number;
  readonly status?: 'hit' | 'near' | '';
  readonly height?: string;
  readonly className?: string;
}

export function ProgressBar({ percentage, status = '', height = 'h-1', className = '' }: ProgressBarProps) {
  return (
    <div className={`progress-bar ${height} rounded-full overflow-hidden bg-[rgba(0,0,0,0.1)] ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, percentage)}%` }}
        transition={{ type: 'spring', damping: 20, stiffness: 60 }}
        className={`progress-fill h-full rounded-full ${status}`}
      />
    </div>
  );
}
