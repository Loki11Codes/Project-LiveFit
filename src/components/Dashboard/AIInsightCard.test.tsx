/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AIInsightCard } from './AIInsightCard';
import type { AIInsight } from '@/lib/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const baseInsight: AIInsight = {
  type: 'nutrition',
  title: 'Eat more protein',
  description: 'You are under your protein target.',
};

describe('AIInsightCard', () => {
  it('renders the insight title and description', () => {
    render(<AIInsightCard insight={baseInsight} />);
    expect(screen.getByText('Eat more protein')).toBeInTheDocument();
    expect(screen.getByText('You are under your protein target.')).toBeInTheDocument();
  });

  it('renders the type label in the header', () => {
    render(<AIInsightCard insight={baseInsight} />);
    expect(screen.getByText(/AI nutrition Insight/i)).toBeInTheDocument();
  });

  it('does not render action button when actionLabel is absent', () => {
    render(<AIInsightCard insight={baseInsight} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders action button when actionLabel and actionTab are provided', () => {
    const insight: AIInsight = {
      ...baseInsight,
      actionLabel: 'Log Meal',
      actionTab: 'log',
    };
    render(<AIInsightCard insight={insight} onAction={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Log Meal/i })).toBeInTheDocument();
  });

  it('calls onAction with the correct tab when action button is clicked', () => {
    const onAction = vi.fn();
    const insight: AIInsight = {
      ...baseInsight,
      actionLabel: 'View Workouts',
      actionTab: 'workout',
    };
    render(<AIInsightCard insight={insight} onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: /View Workouts/i }));
    expect(onAction).toHaveBeenCalledWith('workout');
  });

  it('renders correct icon area for each insight type', () => {
    const types: AIInsight['type'][] = ['nutrition', 'workout', 'habit', 'general'];
    types.forEach((type) => {
      const { unmount } = render(
        <AIInsightCard insight={{ ...baseInsight, type }} />
      );
      // Just ensure no crash — icon is rendered inside the card
      expect(screen.getByText(/AI .* Insight/i)).toBeInTheDocument();
      unmount();
    });
  });
});
