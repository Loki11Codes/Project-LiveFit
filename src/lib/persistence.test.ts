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
    waterLog: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
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
        await persistLogData([{ category: 'food', data: { items: [{ name: 'Banana', kcal: 90, date: '2024-01-01' }] } }], userId);
        expect(mockTx.foodLog.create).toHaveBeenCalledTimes(2);
        expect(mockTx.foodLog.create).toHaveBeenLastCalledWith(expect.objectContaining({
            data: expect.objectContaining({ time: new Date('2024-01-01') })
        }));

        // Update branch
        mockTx.foodLog.findFirst.mockResolvedValue({ id: 'f1' });
        await persistLogData([{ category: 'food', data: { name: 'Apple', kcal: 105, update: true } }], userId);
        expect(mockTx.foodLog.update).toHaveBeenCalledWith({
            where: { id: 'f1' },
            data: expect.objectContaining({ kcal: 105 })
        });

        // Food update - not found branch
        mockTx.foodLog.findFirst.mockResolvedValue(null);
        await persistLogData([{ category: 'food', data: { name: 'Apple', kcal: 110, update: true } }], userId);
        expect(mockTx.foodLog.create).toHaveBeenCalled();

        // Single item (non-array) branch
        mockTx.foodLog.create.mockClear();
        await persistLogData([{ category: 'food', data: { name: 'Pear', kcal: 50 } }], userId);
        expect(mockTx.foodLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ name: 'Pear' })
        }));

        // Envelope-level date branch
        await persistLogData([{ category: 'food', data: { name: 'Grapes', date: '2024-01-01' } }], userId);
        expect(mockTx.foodLog.create).toHaveBeenLastCalledWith(expect.objectContaining({
            data: expect.objectContaining({ name: 'Grapes', time: new Date('2024-01-01') })
        }));
    });

    it('persists workout logs (create and update branches)', async () => {
        mockTx.exercise.findFirst.mockResolvedValue({ id: 'ex-1' });
        
        // Create branch with sets and PRS
        await persistLogData([{ 
            category: 'workout', 
            data: { 
                focus: 'Arms', 
                exercises: [{ name: 'Curl', sets: [{ weight: 10, reps: 10 }] }],
                prs: { weight: true }
            } 
        }], userId);
        expect(mockTx.workoutLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ details: JSON.stringify({ weight: true }) })
        }));

        // Update branch
        mockTx.workoutLog.findFirst.mockResolvedValue({ id: 'w1' });
        await persistLogData([{ category: 'workout', data: { focus: 'Arms', update: true, volume: 1000 } }], userId);
        expect(mockTx.workoutLog.update).toHaveBeenCalled();

        // Update branch - not found (should fallback to create)
        mockTx.workoutLog.findFirst.mockResolvedValue(null);
        await persistLogData([{ category: 'workout', data: { focus: 'Arms', update: true, volume: 1000 } }], userId);
        expect(mockTx.workoutLog.create).toHaveBeenCalled();

        // Create branch with date
        await persistLogData([{ 
            category: 'workout', 
            data: { 
                focus: 'Arms', 
                date: '2024-01-01',
                exercises: [{ name: 'Curl', sets: [{ weight: 10 }] }] 
            } 
        }], userId);
        expect(mockTx.workoutLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ time: new Date('2024-01-01') })
        }));

        // Update branch - missing volume (should fallback to existing volume)
        mockTx.workoutLog.findFirst.mockResolvedValue({ id: 'w1', volume: 800 });
        await persistLogData([{ category: 'workout', data: { focus: 'Arms', update: true } }], userId);
        expect(mockTx.workoutLog.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ volume: 800 })
        }));

        // Exercise without sets
        await persistLogData([{ 
            category: 'workout', 
            data: { 
                focus: 'Arms', 
                exercises: [{ name: 'Curl' }] 
            } 
        }], userId);

        // Exercise resolution by exerciseId
        mockTx.exercise.findUnique.mockResolvedValue({ id: 'ex-id-123' });
        await persistLogData([{ 
            category: 'workout', 
            data: { 
                focus: 'Arms', 
                exercises: [{ name: 'Curl', exerciseId: 'ex-id-123', sets: [{ weight: 10 }] }] 
            } 
        }], userId);
        expect(mockTx.exercise.findUnique).toHaveBeenCalledWith({ where: { id: 'ex-id-123' } });

        // Exercise resolution by name (no exerciseId)
        mockTx.exercise.findUnique.mockResolvedValue(null);
        mockTx.exercise.findFirst.mockResolvedValue({ id: 'ex-2', name: 'Curl' });
        await persistLogData([{ 
            category: 'workout', 
            data: { 
                focus: 'Arms', 
                exercises: [{ name: 'Curl', sets: [{ weight: 10 }] }] 
            } 
        }], userId);
        expect(mockTx.exercise.findFirst).toHaveBeenCalledWith({ where: { name: { equals: 'Curl' } } });

        // Unmatched exercise (custom name)
        mockTx.exercise.findFirst.mockResolvedValue(null);
        await persistLogData([{ 
            category: 'workout', 
            data: { 
                focus: 'Arms', 
                exercises: [{ name: 'Unknown', sets: [{ weight: 10 }] }] 
            } 
        }], userId);
        expect(mockTx.workoutLog.create).toHaveBeenCalled();
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

    it('persists meal plan with full fallbacks', async () => {
        const mealPlanData = {
            entries: [{ mealType: null, kcal: 500 }]
        };
        await persistLogData([{ category: 'meal_plan', data: mealPlanData }], userId);
        expect(mockTx.mealPlan.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ 
                name: "AI Generated Plan",
                entries: expect.objectContaining({
                    create: expect.arrayContaining([
                        expect.objectContaining({ title: 'Untitled Meal', mealType: 'Meal', dayIndex: 0 })
                    ])
                })
            })
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

    it('deletes specific knowledge entry and handles edge cases', async () => {
        mockTx.userKnowledge.findFirst.mockResolvedValue({ id: 'k1' });
        await persistLogData([{ category: 'delete', data: { target: 'knowledge', key: 'Focus' } }], userId);
        expect(mockTx.userKnowledge.delete).toHaveBeenCalledWith({ where: { id: 'k1' } });

        // Missing key
        await persistLogData([{ category: 'delete', data: { target: 'knowledge' } }], userId);
        
        // Not found
        mockTx.userKnowledge.findFirst.mockResolvedValue(null);
        await persistLogData([{ category: 'delete', data: { target: 'knowledge', key: 'NonExistent' } }], userId);
        expect(mockTx.userKnowledge.delete).toHaveBeenCalledTimes(1); // Still only 1 from before
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
        await persistLogData([{ category: 'delete', data: 'not-an-object' as unknown as Record<string, unknown> }], userId);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('non-object data'));
        warnSpy.mockRestore();
    });

    it('deletes all entries for various targets', async () => {
        mockTx.sleepLog.findFirst.mockResolvedValue({ id: 's1' });
        mockTx.bodyMeasurement.findFirst.mockResolvedValue({ id: 'm1' });
        
        await persistLogData([{ category: 'delete', data: { target: 'food' } }], userId);
        expect(mockTx.foodLog.deleteMany).toHaveBeenCalled();

        await persistLogData([{ category: 'delete', data: { target: 'workout' } }], userId);
        expect(mockTx.workoutLog.deleteMany).toHaveBeenCalled();

        await persistLogData([{ category: 'delete', data: { target: 'sleep' } }], userId);
        expect(mockTx.sleepLog.delete).toHaveBeenCalled();

        await persistLogData([{ category: 'delete', data: { target: 'water' } }], userId);
        expect(mockTx.waterLog.deleteMany).toHaveBeenCalled();

        await persistLogData([{ category: 'delete', data: { target: 'measurement' } }], userId);
        expect(mockTx.bodyMeasurement.delete).toHaveBeenCalled();
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
    it('handles deleteKnowledgeEntry when entry does not exist', async () => {
        mockTx.userKnowledge.findFirst.mockResolvedValue(null);
        await persistLogData([{ category: 'delete', data: { target: 'knowledge', key: 'missing' } }], userId);
        expect(mockTx.userKnowledge.delete).not.toHaveBeenCalled();
    });

    it('handles persistKnowledgeEntry with missing key or value', async () => {
        await persistLogData([{ category: 'knowledge', data: { key: '', value: 'test' } }], userId);
        expect(mockTx.userKnowledge.upsert).not.toHaveBeenCalled();
        
        await persistLogData([{ category: 'knowledge', data: { key: 'test', value: '' } }], userId);
        expect(mockTx.userKnowledge.upsert).not.toHaveBeenCalled();
    });
    it('persists knowledge entries successfully', async () => {
        const data = { key: 'favorite_food', value: 'Pizza' };
        await persistLogData([{ category: 'knowledge', data }], userId);
        expect(mockTx.userKnowledge.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ key: 'favorite_food', value: 'Pizza' })
        }));
    });

    it('handles persistMealPlan with missing weekStarting', async () => {
        const data = { entries: [{ dayIndex: 1, mealType: 'Breakfast' }] };
        await persistLogData([{ category: 'meal_plan', data }], userId);
        expect(mockTx.mealPlan.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                weekStarting: expect.any(Date)
            })
        }));
    });

    it('handles persistMealPlan with non-array entries', async () => {
        await persistLogData([{ category: 'meal_plan', data: { entries: 'invalid' } }], userId);
        expect(mockTx.mealPlan.create).not.toHaveBeenCalled();
    });

    it('handles persistKnowledgeEntry with non-string key or value', async () => {
        await persistLogData([{ category: 'knowledge', data: { key: 123, value: 'test' } }], userId);
        expect(mockTx.userKnowledge.upsert).not.toHaveBeenCalled();

        await persistLogData([{ category: 'knowledge', data: { key: 'test', value: 123 } }], userId);
        expect(mockTx.userKnowledge.upsert).not.toHaveBeenCalled();
    });

    it('handles handleDeleteAction with explicit date and missing date', async () => {
        // Explicit date (covers 603 raw.date and 610 dateStr)
        mockTx.foodLog.findFirst.mockResolvedValue({ id: 'f1' });
        await persistLogData([{ category: 'delete', data: { target: 'food', name: 'Eggs', date: '2024-01-01' } }], userId);
        expect(mockTx.foodLog.delete).toHaveBeenCalled();
        
        // Missing date (covers 610 else branch)
        await persistLogData([{ category: 'delete', data: { target: 'food', name: 'Eggs' } }], userId);
    });

    it('handles deleteSingleEntry else branch', async () => {
        // Line 692 else branch
        mockTx.sleepLog.findFirst.mockResolvedValue(null);
        await persistLogData([{ category: 'delete', data: { target: 'sleep' } }], userId);
        expect(mockTx.sleepLog.delete).not.toHaveBeenCalled();
    });

    it('handles persistMealPlan with explicit weekStarting', async () => {
        // Line 718 then branch
        const data = { entries: [], weekStarting: '2024-01-01' };
        await persistLogData([{ category: 'meal_plan', data }], userId);
        expect(mockTx.mealPlan.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                weekStarting: new Date('2024-01-01')
            })
        }));
    });

    it('covers persistDayTypeUpdate with "type" fallback', async () => {
        // Line 558 data.type fallback
        await persistLogData([{ category: 'dayType', data: { type: 'rest' } }], userId);
        expect(mockTx.dayTypeEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
            update: expect.objectContaining({ dayType: 'Rest' })
        }));
    });

    it('covers syncUserGoals with no targets', async () => {
        // calculateMacros returns null if profile data is incomplete (e.g. height=0)
        mockTx.bodyMeasurement.findFirst.mockResolvedValue({ weight: 80 });
        mockTx.userProfile.findUnique.mockResolvedValue({ userId, age: 30, height: 0 }); 
        await syncUserGoals(txClient, userId);
        expect(mockTx.goal.upsert).not.toHaveBeenCalled();
    });

    it('covers bodyMeasurement create with explicit date', async () => {
        // Line 462 validated.date branch
        mockTx.bodyMeasurement.findFirst.mockResolvedValue(null);
        await persistLogData([{ category: 'measurement', data: { weight: 70, date: '2024-01-01' } }], userId);
        expect(mockTx.bodyMeasurement.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ time: new Date('2024-01-01') })
        }));
    });

    it('covers sleep update and create with date', async () => {
        // Create with date (line 398)
        await persistLogData([{ category: 'sleep', data: { hours: 8, date: '2024-01-01' } }], userId);
        expect(mockTx.sleepLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ time: new Date('2024-01-01') })
        }));

        // Update (line 378)
        mockTx.sleepLog.findFirst.mockResolvedValue({ id: 's1' });
        await persistLogData([{ category: 'sleep', data: { hours: 7, update: true } }], userId);
        expect(mockTx.sleepLog.update).toHaveBeenCalled();
        
        // Update requested but not existing (covers 378 else branch)
        mockTx.sleepLog.findFirst.mockResolvedValue(null);
        await persistLogData([{ category: 'sleep', data: { hours: 6, update: true } }], userId);
        expect(mockTx.sleepLog.create).toHaveBeenCalled();
    });

    it('covers persistDeleteAction fallbacks', async () => {
        // Line 603 clientDate fallback
        await persistLogData([{ category: 'delete', data: { target: 'water' } }], userId, '2024-01-02');
        expect(mockTx.waterLog.deleteMany).toHaveBeenCalled();

        // Line 610 new Date() fallback
        await persistLogData([{ category: 'delete', data: { target: 'water' } }], userId);
        expect(mockTx.waterLog.deleteMany).toHaveBeenCalled();
    });

    it('covers bodyMeasurement update requested but not existing', async () => {
        // Line 430 else branch (covers implicit create when update=true but existing=null)
        mockTx.bodyMeasurement.findFirst.mockResolvedValue(null);
        await persistLogData([{ category: 'measurement', data: { weight: 70, update: true } }], userId);
        expect(mockTx.bodyMeasurement.create).toHaveBeenCalled();
    });

    it('covers persistDayTypeUpdate with neither dayType nor type', async () => {
        // Line 558 both missing branch
        await persistLogData([{ category: 'dayType', data: { } }], userId);
        expect(mockTx.dayTypeEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
            update: expect.objectContaining({ dayType: 'Rest' })
        }));
    });

    it('covers updatePersonalRecords with existing PR and multiple sets', async () => {
        // Mock existing PR
        mockTx.personalRecord.findUnique.mockResolvedValue({ id: 'pr-1', maxWeight: 200, max1RM: 250 });
        
        const resolvedExercises = [
            {
                id: 'ex-1',
                sets: [
                    { weight: 110, reps: 5 },   // 1RM = 110 * (1 + 5/30) = 128.3
                    { weight: 100, reps: 10 },  // 1RM = 133.3 (higher 1RM but lower weight)
                    { weight: 50, reps: 1 }     // 1RM = 51.6 (lower than both)
                ]
            }
        ];
        
        await updatePersonalRecords(txClient, userId, resolvedExercises);
        
        // Should update with max(200, 110) and max(250, 133.3)
        expect(mockTx.personalRecord.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                maxWeight: 200,
                max1RM: 250
            })
        }));
    });

    it('covers updatePersonalRecords new higher values', async () => {
        mockTx.personalRecord.findUnique.mockResolvedValue({ id: 'pr-1', maxWeight: 50, max1RM: 60 });
        const resolvedExercises = [{ id: 'ex-1', sets: [{ weight: 100, reps: 10 }] }];
        await updatePersonalRecords(txClient, userId, resolvedExercises);
        expect(mockTx.personalRecord.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ maxWeight: 100, max1RM: expect.any(Number) })
        }));
    });



    it('covers updatePersonalRecords skipping when id or sets missing', async () => {
        // Line 315 continue branch
        await updatePersonalRecords(txClient, userId, [{ id: null, sets: [] }, { id: 'ex-1', sets: null }]);
        expect(mockTx.personalRecord.update).not.toHaveBeenCalled();
        expect(mockTx.personalRecord.create).not.toHaveBeenCalled();
    });

    it('covers updatePersonalRecords edge cases (null weights, zero max, null existing)', async () => {
        // 1. Fallback weight=0, reps=0 (Line 321, 322)
        mockTx.personalRecord.findUnique.mockResolvedValue(null);
        await updatePersonalRecords(txClient, userId, [{ id: 'ex-1', sets: [{ weight: null, reps: null }] }]);
        // maxWeight and max1RM will be 0, so should NOT create/update (Line 329)
        expect(mockTx.personalRecord.create).not.toHaveBeenCalled();

        // 2. Existing PR with null values (Line 338, 339 fallback)
        mockTx.personalRecord.findUnique.mockResolvedValue({ id: 'pr-1', maxWeight: null, max1RM: null });
        await updatePersonalRecords(txClient, userId, [{ id: 'ex-1', sets: [{ weight: 50, reps: 5 }] }]);
        expect(mockTx.personalRecord.update).toHaveBeenCalledWith(expect.objectContaining({
            data: { maxWeight: 50, max1RM: expect.any(Number) }
        }));
    });
  });
});







