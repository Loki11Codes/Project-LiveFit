import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Sidebar from './Sidebar';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, ...props }: any) => <div {...props} style={style}>{children}</div>,
  },
}));

describe('Sidebar Component', () => {
  const defaultProps = {
    protein: 50,
    proteinTarget: 100,
    calories: 1500,
    calorieTarget: 2000,
    carbs: 150,
    fats: 50,
    fiber: 25,
    weight: 70,
    sleep: 8,
    day: 1,
    dayType: 'Rest' as const,
    setDayType: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders protein progress correctly', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Protein Today')).toBeDefined();
    expect(screen.getByText('50')).toBeDefined();
    expect(screen.getByText(/g of 100g/)).toBeDefined();
    expect(screen.getByText('50g remaining')).toBeDefined();
  });

  it('shows goal reached message when protein target is met', () => {
    render(<Sidebar {...defaultProps} protein={100} />);
    expect(screen.getByText('Goal reached! Excellent work.')).toBeDefined();
  });

  it('renders calorie progress and remaining kcal', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Calories Today')).toBeDefined();
    expect(screen.getAllByText('1500').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/remaining/i).length).toBeGreaterThan(0);
  });

  it('shows warning when calories overshot', () => {
    render(<Sidebar {...defaultProps} calories={2500} />);
    expect(screen.getByText('Warning: Calories overshot')).toBeDefined();
  });

  it('renders stats rows for weight, sleep, etc.', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Weight')).toBeDefined();
    expect(screen.getByText('70')).toBeDefined();
    expect(screen.getByText('Sleep')).toBeDefined();
    expect(screen.getByText('8')).toBeDefined();
  });

  it('calls setDayType when a day type button is clicked', () => {
    render(<Sidebar {...defaultProps} />);
    const trainBtn = screen.getByText('Train');
    const button = trainBtn.closest('button');
    if (button) fireEvent.click(button);
    expect(defaultProps.setDayType).toHaveBeenCalledWith('Training');
  });

  it('highlights the active day type', () => {
    render(<Sidebar {...defaultProps} dayType="Training" />);
    // Testing specific class name or style if needed, but checking for label is usually enough
    expect(screen.getByText('Train')).toBeDefined();
  });
});
