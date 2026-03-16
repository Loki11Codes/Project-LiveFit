'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AppError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  const router = useRouter();

  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-[var(--surface)] p-10 rounded-[32px] border border-[var(--border)] shadow-2xl"
      >
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-3xl font-black text-[var(--text-primary)] mb-4 tracking-tight">
          Oops! Something broke.
        </h1>
        
        <p className="text-[var(--text-secondary)] mb-10 leading-relaxed font-medium">
          The fitness engine encountered an unexpected hurdle. Don&apos;t worry, your progress is safe.
        </p>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => reset()}
            className="w-full h-14 bg-[var(--accent)] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-[var(--accent)]/20"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="w-full h-14 bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-2xl font-bold border border-[var(--border)] flex items-center justify-center gap-2 hover:bg-[var(--border)] transition-all"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-black/5 rounded-xl text-left border border-black/5 overflow-auto max-h-32">
            <code className="text-xs text-red-500 font-mono">
              {error.message}
            </code>
          </div>
        )}
      </motion.div>
    </div>
  );
}
