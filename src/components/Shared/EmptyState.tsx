'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { floatAnimation } from '@/lib/animations';

interface EmptyStateProps {
  readonly icon: LucideIcon;
  readonly message: string;
  readonly description?: string;
  readonly iconColor?: string;
  readonly compact?: boolean;
  readonly action?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon,
  message,
  description,
  iconColor = 'var(--text-muted)',
  compact = false,
  action,
}: EmptyStateProps) {
  return (
    <motion.div
      className={`empty text-center ${
        compact ? 'py-10 px-5' : 'py-16 px-5'
      } border border-dashed border-[var(--border)] rounded-[24px] bg-[var(--surface2)]/10`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <motion.div animate={floatAnimation}>
        <Icon className="w-10 h-10 mx-auto mb-4 opacity-40" style={{ color: iconColor }} />
      </motion.div>
      <div className="text-[14px] font-bold text-[var(--text-muted)] mb-1">
        {message}
      </div>
      {description && (
        <p className="text-[11px] text-[var(--text-muted)] opacity-60 max-w-[240px] mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
