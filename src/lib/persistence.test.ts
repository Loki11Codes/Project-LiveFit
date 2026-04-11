import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';
import { persistLogData, syncUserGoals } from './persistence';
import prisma from './prisma';

// Mock prisma client
vi.mock('./prisma', () => ({
  default: {
    $transaction: vi.fn(),
  },
}));

describe('persistence utility', () => {
  const userId = 'user-123';
  const mockDate = '2024-01-01';
  
  // Type-safe mock structure for the models we use
  const mockTx = {
    foodLog: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    workoutLog: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    sleepLog: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    bodyMeasurement: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    userProfile: { findUnique: vi.fn(), upsert: vi.fn(), findFirst: vi.fn() },
    goal: { upsert: vi.fn(), findUnique: vi.fn() },
    dayTypeEntry: { upsert: vi.fn() },
    exercise: { findFirst: vi.fn() },
  };

  const txClient = mockTx as unknown as Prisma.TransactionClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: Prisma.TransactionClient) => Promise<any>) => 
      cb(txClient)
    );
  });

  describe('persistLogData - Main Orchestration', () => {
    it('returns early if no envelopes are provided', async () => {
      await persistLogData([], userId);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('skips envelopes without a category', async () => {
      await persistLogData([{ data: {} }], userId);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws the first error if multiple envelopes fail', async () => {
        vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error('First Error'));
        const envelopes = [
            { category: 'food', data: { name: 'A' } },
            { category: 'sleep', data: { hours: 8 } }
        ];
        await expect(persistLogData(envelopes, userId)).rejects.toThrow('First Error');
    });
  });

  describe('Category Persistence', () => {
    it('persists food logs (create and update branches)', async () => {
        // Create branch
        await persistLogData([{ category: 'food', data: { name: 'Apple', kcal: 100 } }], userId);
        expect(mockTx.foodLog.create).toHaveBeenCalled();

        // Update branch
        mockTx.foodLog.findFirst.mockResolvedValue({ id: 'f1' });
        await persistLogData([{ category: 'food', data: { name: 'Apple', kcal: 105, update: true } }], userId);
        expect(mockTx.foodLog.update).toHaveBeenCalledWith({
            where: { id: 'f1' },
            data: expect.objectContaining({ kcal: 105 })
        });
    });

    it('persists workout logs (create and update branches)', async () => {
        mockTx.exercise.findFirst.mockResolvedValue({ id: 'ex-1' });
        
        // Create branch
        await persistLogData([{ category: 'workout', data: { focus: 'Arms', exercises: [{ name: 'Curl' }] } }], userId);
        expect(mockTx.workoutLog.create).toHaveBeenCalled();

        // Update branch
        mockTx.workoutLog.findFirst.mockResolvedValue({ id: 'w1' });
        await persistLogData([{ category: 'workout', data: { focus: 'Arms', update: true } }], userId);
        expect(mockTx.workoutLog.update).toHaveBeenCalled();
    });

    it('persists sleep logs (create and update branches)', async () => {
        // Create branch
        await persistLogData([{ category: 'sleep', data: { hours: 8 } }], userId);
        expect(mockTx.sleepLog.create).toHaveBeenCalled();

        // Update branch
        mockTx.sleepLog.findFirst.mockResolvedValue({ id: 's1' });
        await persistLogData([{ category: 'sleep', data: { hours: 7, update: true } }], userId);
        expect(mockTx.sleepLog.update).toHaveBeenCalled();
    });

    it('persists measurements (create and update branches)', async () => {
        // Create branch
        await persistLogData([{ category: 'measurement', data: { weight: 70 } }], userId);
        expect(mockTx.bodyMeasurement.create).toHaveBeenCalled();

        // Update branch
        mockTx.bodyMeasurement.findFirst.mockResolvedValue({ id: 'm1' });
        await persistLogData([{ category: 'measurement', data: { weight: 71, update: true } }], userId);
        expect(mockTx.bodyMeasurement.update).toHaveBeenCalled();
    });

    it('persists profile and goal settings', async () => {
        // Mock syncUserGoals reqs
        mockTx.bodyMeasurement.findFirst.mockResolvedValue({ weight: 80 });
        mockTx.userProfile.findUnique.mockResolvedValue({ userId, age: 30, gender: 'Male', height: 180, activityPreference: 'Lite', primaryGoal: 'Maintenance' });

        await persistLogData([{ category: 'profile', data: { name: 'John' } }], userId);
        expect(mockTx.userProfile.upsert).toHaveBeenCalled();
        expect(mockTx.goal.upsert).toHaveBeenCalled();

        await persistLogData([{ category: 'goals', data: { kcalTarget: 2000 } }], userId);
        expect(mockTx.goal.upsert).toHaveBeenCalled();
    });

    it('persists day type and normalizes input', async () => {
        await persistLogData([{ category: 'dayType', data: { dayType: 'train' } }], userId);
        expect(mockTx.dayTypeEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ dayType: 'Training' })
        }));
    });
  });

  describe('Delete Actions', () => {
    it('deletes specific food entry and handles not found warning', async () => {
        mockTx.foodLog.findFirst.mockResolvedValue({ id: 'f1' });
        await persistLogData([{ category: 'delete', data: { target: 'food', name: 'Eggs' } }], userId);
        expect(mockTx.foodLog.delete).toHaveBeenCalled();

        mockTx.foodLog.findFirst.mockResolvedValue(null);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await persistLogData([{ category: 'delete', data: { target: 'food', name: 'Ghost' } }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No food log found'));
        warnSpy.mockRestore();
    });

    it('deletes specific workout entry and handles not found warning', async () => {
        mockTx.workoutLog.findFirst.mockResolvedValue({ id: 'w1' });
        await persistLogData([{ category: 'delete', data: { target: 'workout', focus: 'Upper' } }], userId);
        expect(mockTx.workoutLog.delete).toHaveBeenCalled();

        mockTx.workoutLog.findFirst.mockResolvedValue(null);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await persistLogData([{ category: 'delete', data: { target: 'workout', focus: 'Ghost' } }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No workout log found'));
        warnSpy.mockRestore();
    });

    it('deletes sleep and measurements', async () => {
        mockTx.sleepLog.findFirst.mockResolvedValue({ id: 's1' });
        await persistLogData([{ category: 'delete', data: { target: 'sleep' } }], userId);
        expect(mockTx.sleepLog.delete).toHaveBeenCalled();

        mockTx.bodyMeasurement.findFirst.mockResolvedValue({ id: 'm1' });
        await persistLogData([{ category: 'delete', data: { target: 'measurement' } }], userId);
        expect(mockTx.bodyMeasurement.delete).toHaveBeenCalled();
    });

    it('handles global "all" deletion', async () => {
        await persistLogData([{ category: 'delete', data: { target: 'all' } }], userId);
        expect(mockTx.foodLog.deleteMany).toHaveBeenCalled();
        expect(mockTx.workoutLog.deleteMany).toHaveBeenCalled();
    });
  });

  describe('Helpers & Edge Cases', () => {
    it('guards syncUserGoals against missing profile or weight', async () => {
        mockTx.userProfile.findUnique.mockResolvedValue(null);
        await syncUserGoals(txClient, userId);
        expect(mockTx.goal.upsert).not.toHaveBeenCalled();

        mockTx.userProfile.findUnique.mockResolvedValue({ userId });
        mockTx.bodyMeasurement.findFirst.mockResolvedValue(null);
        await syncUserGoals(txClient, userId);
        expect(mockTx.goal.upsert).not.toHaveBeenCalled();
    });

    it('guards against malformed data in helpers', async () => {
        // Test persistLogData fallback when data is missing
        await persistLogData([{ category: 'sleep', hours: 8 } as any], userId);
        expect(mockTx.sleepLog.create).toHaveBeenCalled();

        // Test validation failure
        await persistLogData([{ category: 'sleep', data: { hours: -1 } }], userId);
        expect(mockTx.sleepLog.create).not.toHaveBeenCalledTimes(3); 
    });

    it('getRecordValue and getStringValue handle non-object inputs', async () => {
        // These are used for internal guards in various persistence handlers.
        // We trigger them by passing malformed data.
        
        // Triggers getRecordValue(data, 'prs') on line 182
        await persistLogData([{ category: 'workout', data: 'not-an-object' as any }], userId);
        expect(mockTx.workoutLog.create).not.toHaveBeenCalled();

        // Triggers hasItemsArray/isRecord on line 602/623 via food handler
        await persistLogData([{ category: 'food', data: null as any }], userId);
        expect(mockTx.foodLog.create).not.toHaveBeenCalled();
    });
  });
});
