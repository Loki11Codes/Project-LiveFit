import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PerformanceInsights from './PerformanceInsights';
import type { HistoryRow } from '@/lib/types';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) => <div {...props}>{children}</div>,
    path: (props: React.SVGProps<SVGPathElement>) => <path {...props} />,
    circle: (props: React.SVGProps<SVGCircleElement>) => <circle {...props} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('PerformanceInsights', () => {
  const mockHistory: HistoryRow[] = [
    {
      day: '2023-01-01',
      type: 'Training',
      sleep: '8h',
      protein: 150,
      target: 150,
      status: 'completed',
      kcal: 2500,
      carbs: 300,
      fats: 70,
      fiber: 30,
      water: 3,
      workout: 'Push Day',
      totalVolume: 5000,
    },
    {
      day: '2023-01-02',
      type: 'Rest',
      sleep: '7h',
      protein: 100,
      target: 120,
      status: 'pending',
      kcal: 2000,
      carbs: 200,
      fats: 60,
      fiber: 25,
      water: 2,
      workout: '--',
    },
  ];

  it('renders empty state when history is empty', () => {
    render(<PerformanceInsights history={[]} />);
    expect(screen.getByText(/No performance data yet/i)).toBeInTheDocument();
  });

  it('renders volume trend and stats when history is provided', () => {
    render(<PerformanceInsights history={mockHistory} />);
    expect(screen.getByText(/Strength Volume Trend/i)).toBeInTheDocument();
    expect(screen.getByText(/5000 kg/i)).toBeInTheDocument(); // Avg volume for 1 workout day
  });

  it('renders focus distribution', () => {
    render(<PerformanceInsights history={mockHistory} />);
    expect(screen.getByText(/Focus Distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/Push Day/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Sessions/i)).toBeInTheDocument();
  });

  it('renders active frequency', () => {
    render(<PerformanceInsights history={mockHistory} />);
    expect(screen.getByText(/Active Frequency/i)).toBeInTheDocument();
    // 1 workout day out of 2 days = 50%
    expect(screen.getByText(/50%/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Workouts \/ Last 30 Days/i)).toBeInTheDocument();
  });
});
