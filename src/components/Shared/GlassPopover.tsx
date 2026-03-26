'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlassPopoverProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
  readonly title?: string;
}

export function GlassPopover({ isOpen, onClose, children, title }: GlassPopoverProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-[100]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'popover-title' : undefined}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-6 z-[101]"
          >
            {title && (
              <div className="mb-4">
                <h3 id="popover-title" className="text-sm font-black uppercase tracking-widest opacity-80">{title}</h3>
                <div className="h-0.5 w-8 bg-[var(--accent)] mt-1 rounded-full" />
              </div>
            )}
            {children}
            <button 
              type="button"
              onClick={onClose}
              className="mt-6 w-full py-2 bg-[var(--accent-muted)] text-[var(--accent)] font-bold rounded-xl text-xs hover:opacity-80 transition-opacity"
            >
              Close
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
