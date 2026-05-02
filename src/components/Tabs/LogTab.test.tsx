import React from 'react';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LogTab from './LogTab';
import type { FoodLog, WorkoutLogWithRelations, SleepLog } from '@/lib/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('LogTab Component', () => {
  const defaultProps = {
    foodLog: [
      { id: 'f1', name: 'Chicken Breast', protein: 30, kcal: 165, carbs: 0, fats: 3, fiber: 0, water: 0, time: new Date('2026-03-18T12:00:00Z'), userId: 'u1' } as FoodLog,
      { id: 'f2', name: 'Rice', protein: 5, kcal: 200, carbs: 45, fats: 1, fiber: 2, water: 0, time: new Date('2026-03-18T12:30:00Z'), userId: 'u1' } as FoodLog,
    ],
    protein: 35,
    workouts: [
      {
        id: 'w1',
        focus: 'Push Day',
        volume: 5000,
        time: new Date('2026-03-18T10:00:00Z'),
        userId: 'u1',
        details: null,
        routineId: null,
        exercises: [
          {
            id: 'we1',
            workoutLogId: 'w1',
            exerciseId: 'e1',
            customName: null,
            order: 0,
            exercise: { id: 'e1', name: 'Bench Press', category: 'Chest', equipment: 'Barbell' },
            sets: [
              { id: 's1', workoutExerciseId: 'we1', setNumber: 1, reps: 10, weight: 60, distance: null, duration: null, isWarmup: false, isDrop: false, isFailure: false },
            ],
          },
        ],
      } as unknown as WorkoutLogWithRelations,
    ],
    sleepLogs: [
      { id: 's1', hours: 8, time: new Date('2026-03-18T07:00:00Z'), userId: 'u1', bedTime: '23:00', wakeTime: '07:00', quality: null } as SleepLog,
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders food log items correctly', async () => {
    await act(async () => {
      render(<LogTab {...defaultProps} />);
    });
    expect(screen.getByText('Chicken Breast')).toBeDefined();
    expect(screen.getByText('Rice')).toBeDefined();
    expect(screen.getByText('35g')).toBeDefined(); // Total protein display
    expect(screen.getByText('30g')).toBeDefined(); // Individual protein
  });

  it('renders workout logs correctly', async () => {
    await act(async () => {
      render(<LogTab {...defaultProps} />);
    });
    expect(screen.getByText('Push Day')).toBeDefined();
    expect(screen.getByText('5000 kg')).toBeDefined();
  });

  it('renders sleep logs correctly', async () => {
    await act(async () => {
      render(<LogTab {...defaultProps} />);
    });
    expect(screen.getByText('8')).toBeDefined();
    expect(screen.getByText('hrs')).toBeDefined();
    expect(screen.getByText(/23:00 to 07:00/)).toBeDefined();
  });

  it('renders empty messages when logs are missing', async () => {
    await act(async () => {
      render(<LogTab foodLog={[]} protein={0} workouts={[]} sleepLogs={[]} />);
    });
    expect(screen.getByText(/No food logged yet/i)).toBeDefined();
    expect(screen.getByText(/No sleep logged yet/i)).toBeDefined();
  });

  it('toggles workout details when clicked', async () => {
    await act(async () => {
      render(<LogTab {...defaultProps} />);
    });
    const workoutBtn = screen.getByText('Push Day').closest('button')!;
    
    // Initially details are hidden
    expect(screen.queryByText('Bench Press')).toBeNull();
    
    // Click to expand
    fireEvent.click(workoutBtn);
    expect(screen.getByText('Bench Press')).toBeDefined();
    expect(screen.getByText('1 Sets')).toBeDefined();
    
    // Click to collapse
    fireEvent.click(workoutBtn);
    expect(screen.queryByText('Bench Press')).toBeNull();
  });

  it('renders all nutritional info for food items', async () => {
    await act(async () => {
      render(<LogTab {...defaultProps} />);
    });
    expect(screen.getByText('165 kcal')).toBeDefined();
    expect(screen.getAllByText('0g').length).toBeGreaterThan(0);
    expect(screen.getByText('3g')).toBeDefined();
  });

  it('calls deletion handlers', async () => {
    const onDeleteFood = vi.fn();
    const onDeleteWorkout = vi.fn();
    const onDeleteSleep = vi.fn();
    
    await act(async () => {
      render(<LogTab {...defaultProps} onDeleteFood={onDeleteFood} onDeleteWorkout={onDeleteWorkout} onDeleteSleep={onDeleteSleep} />);
    });
    
    // Deleting food
    const foodRow = screen.getByText('Chicken Breast').closest('div')?.parentElement;
    if (!foodRow) throw new Error('Could not find food row');
    fireEvent.mouseEnter(foodRow); 
    const deleteFoodBtns = screen.getAllByTitle('Delete food log');
    fireEvent.click(deleteFoodBtns[0]);
    expect(onDeleteFood).toHaveBeenCalledWith('f1');

    // Deleting workout
    const deleteWorkoutBtns = screen.getAllByTitle('Delete workout');
    fireEvent.click(deleteWorkoutBtns[0]);
    expect(onDeleteWorkout).toHaveBeenCalledWith('w1');

    // Deleting sleep
    const deleteSleepBtns = screen.getAllByTitle('Delete sleep log');
    fireEvent.click(deleteSleepBtns[0]);
    expect(onDeleteSleep).toHaveBeenCalledWith('s1');
  });

  it('handles missing data fields gracefully', async () => {
    const sparseProps = {
        ...defaultProps,
        foodLog: [{ id: 'f3', name: 'Water', protein: 0, kcal: null, carbs: null, fats: null, fiber: null, time: new Date(), userId: 'u1' } as unknown as FoodLog],
        workouts: [{ 
          id: 'w2', 
          focus: 'Empty', 
          volume: null, 
          time: new Date(), 
          userId: 'u1',
          exercises: [
            {
              id: 'we2',
              workoutLogId: 'w2',
              exerciseId: null,
              customName: 'Custom Exercise',
              order: 0,
              exercise: null,
              sets: [{ id: 's2', setNumber: 1, weight: null, reps: null }]
            }
          ] 
        } as unknown as WorkoutLogWithRelations],
        sleepLogs: [
          { id: 'sl2', hours: 7, time: new Date(), userId: 'u1', bedTime: '22:00', wakeTime: null } as SleepLog,
          { id: 'sl3', hours: 6, time: new Date(), userId: 'u1', bedTime: null, wakeTime: '06:00' } as SleepLog
        ]
    };
    await act(async () => {
      render(<LogTab {...sparseProps} />);
    });
    
    // Check custom exercise name
    const workoutBtn = screen.getByText('Empty').closest('button')!;
    fireEvent.click(workoutBtn);
    expect(screen.getByText('Custom Exercise')).toBeDefined();
    
    // Check null weights/reps fallbacks
    expect(screen.getAllByText('--kg x --').length).toBeGreaterThan(0);
    
    // Check partial sleep times
    expect(screen.getByText(/22:00 to --/)).toBeDefined();
    expect(screen.getByText(/-- to 06:00/)).toBeDefined();

    expect(screen.getAllByText('? kcal').length).toBeGreaterThan(0);
    expect(screen.getByText('-- kg')).toBeDefined();
  });
});
