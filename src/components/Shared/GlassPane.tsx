'use client';

import React from 'react';

export interface GlassPaneProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly noPadding?: boolean;
}

export function GlassPane({ children, className = '', noPadding = false }: GlassPaneProps) {
  return (
    <div className={`ui-pane h-full overflow-hidden flex flex-col ${noPadding ? '!p-0' : '!p-4'} ${className}`}>
      {children}
    </div>
  );
}
