import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LogTab from './LogTab';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
  },
}));

describe('LogTab Component', () => {
  const defaultProps = {
    foodLog: [
      { id: 'f1', name: 'Chicken Breast', protein: 30, kcal: 165, carbs: 0, fats: 3, fiber: 0, time: new Date('2026-03-18T12:00:00Z'), userId: 'u1' },
      { id: 'f2', name: 'Rice', protein: 5, kcal: 200, carbs: 45, fats: 1, fiber: 2, time: new Date('2026-03-18T12:30:00Z'), userId: 'u1' },
    ],
    protein: 35,
    workouts: [
      { id: 'w1', focus: 'Push Day', volume: 5000, time: new Date('2026-03-18T10:00:00Z'), userId: 'u1', details: null },
    ],
    sleepLogs: [
      { id: 's1', hours: 8, time: new Date('2026-03-18T07:00:00Z'), userId: 'u1', bedTime: '23:00', wakeTime: '07:00', quality: null },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders food log items correctly', () => {
    render(<LogTab {...defaultProps} />);
    expect(screen.getByText('Chicken Breast')).toBeDefined();
    expect(screen.getByText('Rice')).toBeDefined();
    expect(screen.getByText('35g')).toBeDefined(); // Total protein display
    expect(screen.getByText('30g')).toBeDefined(); // Individual protein
  });

  it('renders workout logs correctly', () => {
    render(<LogTab {...defaultProps} />);
    expect(screen.getByText('Push Day')).toBeDefined();
    expect(screen.getByText('5000 kg')).toBeDefined();
  });

  it('renders sleep logs correctly', () => {
    render(<LogTab {...defaultProps} />);
    expect(screen.getByText('8')).toBeDefined();
    expect(screen.getByText('hrs')).toBeDefined();
    expect(screen.getByText(/23:00 to 07:00/)).toBeDefined();
  });

  it('renders empty messages when logs are missing', () => {
    render(<LogTab foodLog={[]} protein={0} workouts={[]} sleepLogs={[]} />);
    expect(screen.getByText(/No food logged yet/i)).toBeDefined();
    expect(screen.getByText(/No sleep logged yet/i)).toBeDefined();
    expect(screen.getAllByText(/Nothing logged yet/i).length).toBeGreaterThan(0);
  });
});
