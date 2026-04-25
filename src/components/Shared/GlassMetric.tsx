'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

interface GlassMetricProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string | number;
  readonly target?: string | number;
  readonly percentage?: number;
  readonly status?: 'hit' | 'near' | '';
  readonly nudge?: boolean;
  readonly iconColor?: string;
  readonly onClick?: () => void;
  readonly className?: string;
  readonly "data-testid"?: string;
}

export function GlassMetric({
  icon: Icon,
  label,
  value,
  target,
  percentage,
  status,
  nudge,
  iconColor,
  onClick,
  className = '',
  "data-testid": testId,
}: GlassMetricProps) {
  return (
    <motion.div 
      whileHover={onClick ? { scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.99 } : {}}
      onClick={onClick}
      data-testid={testId}
      className={`relative flex flex-col gap-2 p-2 rounded-2xl transition-all ${onClick ? 'cursor-pointer' : ''} ${
        nudge ? 'bg-[rgba(59,130,246,0.03)] shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-[#3b82f6]/20' : ''
      } ${className}`}
    >
      {nudge && (
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-[#3b82f6]/5 rounded-2xl pointer-events-none"
        />
      )}
      <div className="flex justify-between items-baseline px-0.5">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} strokeWidth={2.5} />
          <span className="text-[10px] font-bold opacity-60 text-[var(--text)] uppercase tracking-tight">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[24px] font-light tracking-tighter leading-none text-[var(--text)]">{value}</span>
          {target && <span className="text-[10px] text-[var(--text-muted)] opacity-50 font-bold">/{target}</span>}
        </div>
      </div>
      
      {percentage !== undefined && (
        <ProgressBar percentage={percentage} status={status} />
      )}
    </motion.div>
  );
}
