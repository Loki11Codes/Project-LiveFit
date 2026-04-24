import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';
import { persistLogData, syncUserGoals, isRecord, getRecordValue, getStringValue, updatePersonalRecords } from './persistence';
import prisma from './prisma';

// Mock prisma client
vi.mock('./prisma', () => ({
  default: {
    $transaction: vi.fn(),
  },
}));

describe('persistence utility', () => {
  const userId = 'user-123';
  
  // Type-safe mock structure for the models we use
  const mockTx = {
    foodLog: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    workoutLog: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    sleepLog: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    bodyMeasurement: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    userProfile: { findUnique: vi.fn(), upsert: vi.fn(), findFirst: vi.fn() },
    goal: { upsert: vi.fn(), findUnique: vi.fn() },
    dayTypeEntry: { upsert: vi.fn() },
    exercise: { findFirst: vi.fn(), findUnique: vi.fn() },
    achievement: { findMany: vi.fn().mockResolvedValue([]), createMany: vi.fn() },
    personalRecord: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    userKnowledge: { upsert: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    mealPlan: { create: vi.fn() },
  };

  const txClient = mockTx as unknown as Prisma.TransactionClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: Prisma.TransactionClient) => Promise<unknown>) => 
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

        // Items array branch
        await persistLogData([{ category: 'food', data: { items: [{ name: 'Banana', kcal: 90 }] } }], userId);
        expect(mockTx.foodLog.create).toHaveBeenCalledTimes(2);

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
        
        // Create branch with sets
        await persistLogData([{ 
            category: 'workout', 
            data: { 
                focus: 'Arms', 
                exercises: [{ name: 'Curl', sets: [{ weight: 10, reps: 10 }] }] 
            } 
        }], userId);
        expect(mockTx.workoutLog.create).toHaveBeenCalled();
        expect(mockTx.workoutLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                exercises: expect.objectContaining({
                    create: expect.arrayContaining([
                        expect.objectContaining({
                            sets: expect.objectContaining({
                                create: expect.arrayContaining([
                                    expect.objectContaining({ weight: 10 })
                                ])
                            })
                        })
                    ])
                })
            })
        }));

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

    it('persists knowledge entry', async () => {
        await persistLogData([{ category: 'knowledge', data: { key: 'Focus', value: 'High' } }], userId);
        expect(mockTx.userKnowledge.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ key: 'focus', value: 'High' })
        }));
    });

    it('persists meal plan', async () => {
        const mealPlanData = {
            name: 'Test Plan',
            entries: [{ dayIndex: 0, title: 'Breakfast', kcal: 500 }]
        };
        await persistLogData([{ category: 'meal_plan', data: mealPlanData }], userId);
        expect(mockTx.mealPlan.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ name: 'Test Plan' })
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

    it('deletes specific knowledge entry', async () => {
        mockTx.userKnowledge.findFirst.mockResolvedValue({ id: 'k1' });
        await persistLogData([{ category: 'delete', data: { target: 'knowledge', key: 'Focus' } }], userId);
        expect(mockTx.userKnowledge.delete).toHaveBeenCalledWith({ where: { id: 'k1' } });
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
        await persistLogData([{ category: 'sleep', hours: 8 } as unknown as { category: string; data: unknown }], userId);
        expect(mockTx.sleepLog.create).toHaveBeenCalled();

        // Test validation failure
        await persistLogData([{ category: 'sleep', data: { hours: -1 } }], userId);
        expect(mockTx.sleepLog.create).not.toHaveBeenCalledTimes(3); 
    });

    it('getRecordValue and getStringValue handle non-object inputs', async () => {
        expect(isRecord(null)).toBe(false);
        expect(isRecord('str')).toBe(false);
        expect(isRecord({})).toBe(true);

        expect(getRecordValue(null, 'key')).toBeUndefined();
        expect(getStringValue(null, 'key')).toBeUndefined();
        expect(getStringValue({ key: 123 }, 'key')).toBeUndefined();
        expect(getStringValue({ key: 'val' }, 'key')).toBe('val');
    });

    it('handles non-object delete action', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await persistLogData([{ category: 'delete', data: 'not-an-object' as any }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('non-object data'));
        warnSpy.mockRestore();
    });

    it('deletes all entries for a day when target is missing name/focus', async () => {
        await persistLogData([{ category: 'delete', data: { target: 'food' } }], userId);
        expect(mockTx.foodLog.deleteMany).toHaveBeenCalled();

        await persistLogData([{ category: 'delete', data: { target: 'workout' } }], userId);
        expect(mockTx.workoutLog.deleteMany).toHaveBeenCalled();
    });

    it('handles syncUserGoals with missing data', async () => {
        // Missing weight
        mockTx.userProfile.findUnique.mockResolvedValue({ userId, age: 30, gender: 'Male' });
        mockTx.bodyMeasurement.findFirst.mockResolvedValue({ weight: null });
        await syncUserGoals(txClient, userId);
        expect(mockTx.goal.upsert).not.toHaveBeenCalled();

        // Missing profile
        mockTx.userProfile.findUnique.mockResolvedValue(null);
        await syncUserGoals(txClient, userId);
        expect(mockTx.goal.upsert).not.toHaveBeenCalled();
    });

    it('handles unknown delete target and missing target', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        // Missing target
        await persistLogData([{ category: 'delete', data: {} }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing "target"'));

        // Unknown target
        await persistLogData([{ category: 'delete', data: { target: 'unknown' } }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown delete target'));
        
        warnSpy.mockRestore();
    });

    it('handles invalid goal update', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await persistLogData([{ category: 'goals', data: { kcalTarget: -1 } }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid goal update'), expect.anything());
        warnSpy.mockRestore();
    });

    it('covers all day type normalization branches', async () => {
        // Rest
        await persistLogData([{ category: 'dayType', data: { dayType: 'rest day' } }], userId);
        expect(mockTx.dayTypeEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
            update: expect.objectContaining({ dayType: 'Rest' })
        }));

        // Lite
        await persistLogData([{ category: 'dayType', data: { dayType: 'light' } }], userId);
        expect(mockTx.dayTypeEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
            update: expect.objectContaining({ dayType: 'Lite' })
        }));

        // Invalid
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await persistLogData([{ category: 'dayType', data: { dayType: 'garbage' } }], userId);
        expect(mockTx.dayTypeEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
            update: expect.objectContaining({ dayType: 'Rest' })
        }));
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it('handles invalid food, workout, and sleep logs', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        // Invalid food (no name) - single item
        await persistLogData([{ category: 'food', data: { kcal: 100 } }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid food'), expect.anything());
        warnSpy.mockClear();

        // Invalid food (no name) - in items array (triggers line 122)
        await persistLogData([{ category: 'food', data: { items: [{ kcal: 100 }] } }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid food'), expect.anything());
        warnSpy.mockClear();

        // Unknown category (triggers line 122)
        await persistLogData([{ category: 'alien_abduction', data: {} }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown category'));
        warnSpy.mockClear();

        // Invalid workout (exercises is not an array) - triggered via handleCategoryPersistence -> persistWorkoutLog
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        await persistLogData([{ category: 'workout', data: { exercises: 'invalid' } }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid workout'), expect.anything());
        warnSpy.mockClear();
        errorSpy.mockRestore();

        // Invalid sleep (negative hours) - triggered via handleCategoryPersistence -> persistSleepLog
        await persistLogData([{ category: 'sleep', data: { hours: -1 } }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid sleep'), expect.anything());
        
        warnSpy.mockRestore();
    });

    it('updates personal records correctly', async () => {
        const userId = 'user-123';
        const exercises = [
            { id: 'ex-1', sets: [{ weight: 100, reps: 5 }] }, // RM = 116.6
            { id: null, sets: [{ weight: 50, reps: 10 }] }, // should skip (no id)
            { id: 'ex-2' } // should skip (no sets)
        ];

        // New PR branch
        mockTx.personalRecord.findUnique.mockResolvedValue(null);
        await updatePersonalRecords(txClient, userId, exercises);
        expect(mockTx.personalRecord.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ exerciseId: 'ex-1', maxWeight: 100 })
        }));

        // Existing PR branch (update)
        mockTx.personalRecord.findUnique.mockResolvedValue({ id: 'pr-1', maxWeight: 80, max1RM: 90 });
        await updatePersonalRecords(txClient, userId, [{ id: 'ex-1', sets: [{ weight: 110, reps: 5 }] }]);
        expect(mockTx.personalRecord.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'pr-1' },
            data: expect.objectContaining({ maxWeight: 110 })
        }));
    });

    it('handles invalid measurement and profile updates', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        // Invalid measurement (date format)
        await persistLogData([{ category: 'measurement', data: { date: 'invalid' } }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid measurement'), expect.anything());

        // Invalid profile (age too high)
        await persistLogData([{ category: 'profile', data: { age: 1000 } }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid profile'), expect.anything());
        
        warnSpy.mockRestore();
    });

    it('handles syncUserGoals update path', async () => {
        mockTx.bodyMeasurement.findFirst.mockResolvedValue({ weight: 80 });
        mockTx.userProfile.findUnique.mockResolvedValue({ userId, age: 30, gender: 'Male', height: 180, activityPreference: 'Lite', primaryGoal: 'Maintenance' });
        
        // This will call syncUserGoals which calls goal.upsert
        await syncUserGoals(txClient, userId);
        expect(mockTx.goal.upsert).toHaveBeenCalledWith(expect.objectContaining({
            update: expect.any(Object)
        }));
    });
  });
});

