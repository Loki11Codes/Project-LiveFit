/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { persistLogData } from './persistence';
import prisma from './prisma';

// Mock prisma client
vi.mock('./prisma', () => ({
  default: {
    $transaction: vi.fn(),
  },
}));

describe('persistence utility', () => {
  const userId = 'user-123';
  const mockTx = {
    foodLog: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    workoutLog: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    sleepLog: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    bodyMeasurement: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    userProfile: { upsert: vi.fn() },
    goal: { upsert: vi.fn() },
    dayTypeEntry: { upsert: vi.fn() },
    exercise: { findFirst: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.$transaction as any).mockImplementation((cb: any) => cb(mockTx));
  });

  describe('persistLogData', () => {
    it('returns early if no envelopes are provided', async () => {
      await persistLogData([], userId);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('skips envelopes without a category', async () => {
      await persistLogData([{ data: {} } as any], userId);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('persists food logs (single item)', async () => {
      const envelopes = [
        {
          category: 'food',
          data: { name: 'Apple', kcal: 95, protein: 0.5, carbs: 25, fats: 0.3, fiber: 4.4 }
        }
      ];
      await persistLogData(envelopes, userId);
      expect(mockTx.foodLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Apple', kcal: 95 })
      });
    });

    it('persists food logs (array of items)', async () => {
      const envelopes = [
        {
          category: 'food',
          data: {
            items: [
              { name: 'Eggs', kcal: 140 },
              { name: 'Toast', kcal: 100 }
            ]
          }
        }
      ];
      await persistLogData(envelopes, userId);
      expect(mockTx.foodLog.create).toHaveBeenCalledTimes(2);
    });

    it('updates existing food log if update flag is set', async () => {
      mockTx.foodLog.findFirst.mockResolvedValue({ id: 'existing-id' });
      const envelopes = [
        {
          category: 'food',
          data: { name: 'Apple', kcal: 100, update: true, date: '2024-01-01' }
        }
      ];
      await persistLogData(envelopes, userId);
      expect(mockTx.foodLog.update).toHaveBeenCalledWith({
        where: { id: 'existing-id' },
        data: expect.objectContaining({ kcal: 100 })
      });
    });

    it('persists workout log', async () => {
      mockTx.exercise.findFirst.mockResolvedValue({ id: 'exercise-id' });
      const envelopes = [
        {
          category: 'workout',
          data: {
            focus: 'Upper Body',
            volume: 5000,
            exercises: [
              { name: 'Bench Press', sets: [{ setNumber: 1, reps: 10, weight: 60 }] }
            ]
          }
        }
      ];
      await persistLogData(envelopes, userId);
      expect(mockTx.workoutLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ focus: 'Upper Body' })
      }));
    });

    it('updates existing workout log', async () => {
      mockTx.workoutLog.findFirst.mockResolvedValue({ id: 'workout-id' });
      const envelopes = [
        {
          category: 'workout',
          data: { focus: 'Upper Body', update: true, date: '2024-01-01' }
        }
      ];
      await persistLogData(envelopes, userId);
      expect(mockTx.workoutLog.update).toHaveBeenCalled();
    });

    it('persists sleep log', async () => {
      const envelopes = [{ category: 'sleep', data: { hours: 8, bed: '22:00', wake: '06:00' } }];
      await persistLogData(envelopes, userId);
      expect(mockTx.sleepLog.create).toHaveBeenCalled();
    });

    it('updates sleep log', async () => {
      mockTx.sleepLog.findFirst.mockResolvedValue({ id: 'sleep-id' });
      const envelopes = [{ category: 'sleep', data: { hours: 7, update: true } }];
      await persistLogData(envelopes, userId);
      expect(mockTx.sleepLog.update).toHaveBeenCalled();
    });

    it('persists measurements', async () => {
      const envelopes = [{ category: 'measurement', data: { weight: 70, waist: 80 } }];
      await persistLogData(envelopes, userId);
      expect(mockTx.bodyMeasurement.create).toHaveBeenCalled();
    });

    it('updates measurements', async () => {
      mockTx.bodyMeasurement.findFirst.mockResolvedValue({ id: 'm-id' });
      const envelopes = [{ category: 'measurement', data: { weight: 71, update: true } }];
      await persistLogData(envelopes, userId);
      expect(mockTx.bodyMeasurement.update).toHaveBeenCalled();
    });

    it('persists profile updates', async () => {
      const envelopes = [{ category: 'profile', data: { name: 'John', age: 30 } }];
      await persistLogData(envelopes, userId);
      expect(mockTx.userProfile.upsert).toHaveBeenCalled();
    });

    it('persists goal updates', async () => {
      const envelopes = [{ category: 'goals', data: { targetWeight: 75 } }];
      await persistLogData(envelopes, userId);
      expect(mockTx.goal.upsert).toHaveBeenCalled();
    });

    it('persists dayType updates', async () => {
      const envelopes = [{ category: 'dayType', data: { dayType: 'Training', dayKey: '2024-01-01' } }];
      await persistLogData(envelopes, userId);
      expect(mockTx.dayTypeEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({ dayType: 'Training' })
      }));
    });

    it('normalizes dayType values', async () => {
        const testCases = [
            { input: 'train', expected: 'Training' },
            { input: 'rest day', expected: 'Rest' },
            { input: 'lite workout', expected: 'Lite' },
            { input: 'any', expected: 'Rest' },
        ];

        for (const tc of testCases) {
            await persistLogData([{ category: 'dayType', data: { type: tc.input } }], userId);
            expect(mockTx.dayTypeEntry.upsert).toHaveBeenLastCalledWith(expect.objectContaining({
                create: expect.objectContaining({ dayType: tc.expected })
            }));
        }
    });

    it('throws error if persistence fails within transaction', async () => {
      (prisma.$transaction as any).mockImplementation(() => {
        throw new Error('Transaction failed');
      });
      await expect(persistLogData([{ category: 'food', data: { name: 'X' } }], userId)).rejects.toThrow('Transaction failed');
    });

    it('skips invalid food items', async () => {
        const envelopes = [{ category: 'food', data: { name: '', kcal: 100 } }];
        await persistLogData(envelopes as any, userId);
        expect(mockTx.foodLog.create).not.toHaveBeenCalled();
    });

    it('skips invalid workout items', async () => {
        const envelopes = [{ category: 'workout', data: { focus: '', volume: 100 } }];
        await persistLogData(envelopes as any, userId);
        expect(mockTx.workoutLog.create).not.toHaveBeenCalled();
    });

    it('skips invalid sleep items', async () => {
        const envelopes = [{ category: 'sleep', data: { date: 'not-a-date' } }];
        await persistLogData(envelopes as any, userId);
        expect(mockTx.sleepLog.create).not.toHaveBeenCalled();
    });

    it('skips invalid measurement items', async () => {
        const envelopes = [{ category: 'measurement', data: { date: 'not-a-date' } }];
        await persistLogData(envelopes as any, userId);
        expect(mockTx.bodyMeasurement.create).not.toHaveBeenCalled();
    });

    it('skips invalid profile items', async () => {
        const envelopes = [{ category: 'profile', data: { age: -5 } }];
        await persistLogData(envelopes as any, userId);
        expect(mockTx.userProfile.upsert).not.toHaveBeenCalled();
    });

    it('skips invalid goal items', async () => {
        const envelopes = [{ category: 'goals', data: { kcalTarget: -100 } }];
        await persistLogData(envelopes as any, userId);
        expect(mockTx.goal.upsert).not.toHaveBeenCalled();
    });

    it('handles non-object data gracefully in helpers', async () => {
        // This triggers isRecord(value) returning false
        await persistLogData([{ category: 'sleep', data: "not-an-object" }], userId);
        expect(mockTx.sleepLog.create).not.toHaveBeenCalled();
    });
  });
});

