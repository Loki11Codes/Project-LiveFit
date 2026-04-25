/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HistoryTab from './HistoryTab';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, any>) => <div {...props}>{children as React.ReactNode}</div>,
    tr: ({ children, ...props }: Record<string, any>) => <tr {...props}>{children as React.ReactNode}</tr>,
    path: (props: any) => <path {...props} />,
    circle: (props: any) => <circle {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('HistoryTab Component', () => {
  const defaultProps = {
    history: [
      { day: 'Mon', date: '2026-03-16', type: 'Training', sleep: '8', protein: 120, target: 100, status: 'completed' as const, kcal: 2500, carbs: 300, fats: 80, fiber: 35, water: 2, workout: 'Push' },
      { day: 'Tue', date: '2026-03-17', type: 'Rest', sleep: '7.5', protein: 85, target: 80, status: 'completed' as const, kcal: 2000, carbs: 200, fats: 70, fiber: 30, water: 1.5, workout: '--' },
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
    kcalTarget: 2000,
    proteinTarget: 100,
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
    expect(screen.getAllByText(/102.5/).length).toBeGreaterThan(0);
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
    expect(screen.getAllByText(/protein/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/kcal/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/120/).length).toBeGreaterThan(0); // Mon protein
    expect(screen.getAllByText(/85/).length).toBeGreaterThan(0);  // Tue protein
  });

  it('renders activity history table correctly', () => {
    render(<HistoryTab {...defaultProps} />);
    expect(screen.getByText(/Activity Logs/i)).toBeDefined();
    expect(screen.getByText(/2 Days/i)).toBeDefined();
    // Use getAllByText for data that appears in both trends and logs
    const proteinMatches = screen.getAllByText(/120/);
    expect(proteinMatches.length).toBeGreaterThan(0);
    const kcalMatches = screen.getAllByText(/2500/);
    expect(kcalMatches.length).toBeGreaterThan(0);
  });

  it('renders empty messages when data is missing', () => {
    render(<HistoryTab history={[]} analytics={null} kcalTarget={2000} proteinTarget={100} />);
    expect(screen.getByText(/No nutrition data yet/i)).toBeDefined();
    expect(screen.getByText(/No history logged yet/i)).toBeDefined();
    expect(screen.getByText(/Add body measurements/i)).toBeDefined();
  });

  it('handles single weight measurement correctly', () => {
    const singleWeightProps = {
      ...defaultProps,
      analytics: {
        ...defaultProps.analytics,
        weightTrend: [{ day: 'Mon', weight: 75, date: '2026-03-18' }]
      }
    } as any;
    render(<HistoryTab {...singleWeightProps} />);
    expect(screen.getByText('No change')).toBeDefined();
  });

  it('handles missing analytics averages gracefully', () => {
    const noAvgProps = {
      ...defaultProps,
      analytics: {
        ...defaultProps.analytics,
        averages: null
      }
    } as any;
    render(<HistoryTab {...noAvgProps} />);
    // AnalyticsMetricCard renders value digits and "g" in separate elements
    // so we check by matching the numeric part
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2); // protein=0, kcal=0
  });

  it('toggles between table and performance views', () => {
    render(<HistoryTab {...defaultProps} />);
    const performanceBtn = screen.getByRole('button', { name: /Performance/i });
    fireEvent.click(performanceBtn);
    expect(screen.getByText('Performance Insights Mock')).toBeInTheDocument();
    
    const tableBtn = screen.getByRole('button', { name: /Table/i });
    fireEvent.click(tableBtn);
    expect(screen.getByText(/Activity Logs/i)).toBeInTheDocument();
  });

  it('renders workout details and volume in table', () => {
    const detailedHistory = [
      { 
        day: 'Mon', 
        date: '2026-03-16', 
        type: 'Training', 
        protein: 100, 
        kcal: 2000, 
        workout: 'Squat', 
        workoutDetail: 'Legs Day', 
        totalVolume: 5000 
      }
    ];
    render(<HistoryTab {...defaultProps} history={detailedHistory as any} />);
    expect(screen.getByText('Legs Day')).toBeInTheDocument();
    expect(screen.getByText('5000 kg')).toBeInTheDocument();
  });

  it('handles negative or zero weight delta', () => {
    const neutralProps = {
      ...defaultProps,
      analytics: {
        ...defaultProps.analytics,
        weightTrend: [
          { day: 'Mon', weight: 75, date: '2026-03-18' },
          { day: 'Tue', weight: 75, date: '2026-03-19' },
        ]
      }
    } as any;
    render(<HistoryTab {...neutralProps} />);
    expect(screen.getByText('0 kg')).toBeDefined();
  });

  it('handles missing sleep data in table row', () => {
    const noSleepHistory = [
      { day: 'Mon', date: '2026-03-16', type: 'Rest', protein: 100, kcal: 2000, workout: '--', sleep: '--' }
    ];
    render(<HistoryTab {...defaultProps} history={noSleepHistory as any} />);
    // Should render "--" instead of "h"
    const cells = screen.getAllByRole('cell');
    expect(cells.find(c => c.textContent === '--')).toBeDefined();
  });
});

// Mock PerformanceInsights since it's a separate component
vi.mock('@/components/Analytics/PerformanceInsights', () => ({
  default: () => <div>Performance Insights Mock</div>
}));

