import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HistoryTab from './HistoryTab';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
    tr: ({ children, ...props }: Record<string, unknown>) => <tr {...props}>{children as React.ReactNode}</tr>,
  },
}));

describe('HistoryTab Component', () => {
  const defaultProps = {
    history: [
      { day: 'Mon', date: '2026-03-16', type: 'Training', sleep: '8', protein: 120, target: 100, status: 'completed' as const, kcal: 2500, carbs: 300, fats: 80, fiber: 35, workout: 'Push' },
      { day: 'Tue', date: '2026-03-17', type: 'Rest', sleep: '7.5', protein: 85, target: 80, status: 'completed' as const, kcal: 2000, carbs: 200, fats: 70, fiber: 30, workout: '--' },
    ],
    analytics: {
      averages: { protein: 102.5, kcal: 2250 },
      nutritionStats: [
        { day: 'Mon', protein: 120, kcal: 2500, date: '2026-03-16' },
        { day: 'Tue', protein: 85, kcal: 2000, date: '2026-03-17' },
      ],
      weightTrend: [
        { day: 'Mon', weight: 75, date: '2026-03-18' },
        { day: 'Tue', weight: 74.8, date: '2026-03-19' },
      ],
      meta: { period: '7d', logCount: 14, measurementCount: 2 }
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders analytics metric cards correctly', () => {
    render(<HistoryTab {...defaultProps} />);
    expect(screen.getByText('7-Day Avg Protein')).toBeDefined();
    expect(screen.getByText('102.5g')).toBeDefined();
    expect(screen.getByText('7-Day Avg Calories')).toBeDefined();
    expect(screen.getByText('2250')).toBeDefined();
  });

  it('renders weight trend card correctly', () => {
    render(<HistoryTab {...defaultProps} />);
    expect(screen.getByText('Weight Trend')).toBeDefined();
    expect(screen.getByText('74.8')).toBeDefined();
    expect(screen.getByText(/-0.2 kg/i)).toBeDefined();
  });

  it('renders nutrition day cards correctly', () => {
    render(<HistoryTab {...defaultProps} />);
    expect(screen.getByText('7-Day Nutrition Trend')).toBeDefined();
    expect(screen.getAllByText('protein').length).toBeGreaterThan(0);
    expect(screen.getAllByText('kcal').length).toBeGreaterThan(0);
    expect(screen.getByText('120')).toBeDefined(); // Mon protein
    expect(screen.getByText('85')).toBeDefined();  // Tue protein
  });

  it('renders activity history table correctly', () => {
    render(<HistoryTab {...defaultProps} />);
    expect(screen.getByText('Activity History')).toBeDefined();
    expect(screen.getByText('2 Days Tracking')).toBeDefined();
    expect(screen.getByText('120g')).toBeDefined();
    expect(screen.getByText('85g')).toBeDefined();
  });

  it('renders empty messages when data is missing', () => {
    render(<HistoryTab history={[]} analytics={null} />);
    expect(screen.getByText(/No nutrition data yet/i)).toBeDefined();
    expect(screen.getByText(/No history logged yet/i)).toBeDefined();
    expect(screen.getByText(/Add body measurements to unlock the weight trend/i)).toBeDefined();
  });
});
