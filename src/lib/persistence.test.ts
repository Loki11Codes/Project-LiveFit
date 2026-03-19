import { describe, it, expect, vi, beforeEach } from 'vitest';
import { persistLogData } from './persistence';
import prisma from './prisma';

// Mock the prisma client
vi.mock('./prisma', () => ({
  default: {
    $transaction: vi.fn(),
  },
}));

const mockTx = {
  foodLog: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  workoutLog: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  sleepLog: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  bodyMeasurement: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  userProfile: {
    upsert: vi.fn(),
  },
  goal: {
    upsert: vi.fn(),
  },
  dayTypeEntry: {
    upsert: vi.fn(),
  },
};

describe('Persistence Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup transaction mock to call the callback with our mockTx
    vi.mocked(prisma.$transaction).mockImplementation((cb: any) => cb(mockTx)); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it('persists food logs (create new)', async () => {
    const userId = 'user-1';
    const envelopes = [
      {
        category: 'food',
        data: {
          items: [
            { name: 'Chicken', protein: 30, kcal: 200 }
          ]
        }
      }
    ];

    await persistLogData(envelopes, userId);

    expect(mockTx.foodLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId,
        name: 'Chicken',
        protein: 30,
        kcal: 200,
      })
    }));
  });

  it('persists food logs (semantic update)', async () => {
    const userId = 'user-1';
    const envelopes = [
      {
        category: 'food',
        data: {
          items: [
            { name: 'Chicken', protein: 35, kcal: 220, update: true }
          ]
        }
      }
    ];

    // Mock existing entry found
    mockTx.foodLog.findFirst.mockResolvedValue({ id: 'existing-id' });

    await persistLogData(envelopes, userId);

    expect(mockTx.foodLog.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'existing-id' },
      data: expect.objectContaining({
        protein: 35,
        kcal: 220,
      })
    }));
  });

  it('handles profile updates with AI coercion', async () => {
    const userId = 'user-1';
    const envelopes = [
      {
        category: 'profile',
        data: {
          age: "25", // AI sends string
          height: "180.5",
          gender: "Male"
        }
      }
    ];

    await persistLogData(envelopes, userId);

    expect(mockTx.userProfile.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId },
      create: expect.objectContaining({ age: 25, height: 180.5 }),
    }));
  });

  it('handles dayType updates with normalization', async () => {
    const userId = 'user-1';
    // Test Training
    await persistLogData([{ category: 'dayType', data: { type: 'training' } }], userId);
    expect(mockTx.dayTypeEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { dayType: 'Training' }
    }));

    // Test Rest
    await persistLogData([{ category: 'dayType', data: { type: 'resting' } }], userId);
    expect(mockTx.dayTypeEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { dayType: 'Rest' }
    }));

    // Test Lite
    await persistLogData([{ category: 'dayType', data: { type: 'light work' } }], userId);
    expect(mockTx.dayTypeEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { dayType: 'Lite' }
    }));

    // Test Invalid -> Rest
    await persistLogData([{ category: 'dayType', data: { type: 'party' } }], userId);
    expect(mockTx.dayTypeEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { dayType: 'Rest' }
    }));
  });

  it('persists workout logs (update existing)', async () => {
    const userId = 'user-1';
    const envelopes = [{ category: 'workout', data: { focus: 'Push', volume: 6000, update: true, date: '2026-03-19' } }];
    mockTx.workoutLog.findFirst.mockResolvedValue({ id: 'w-1', focus: 'Push' });
    await persistLogData(envelopes, userId);
    expect(mockTx.workoutLog.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'w-1' },
      data: expect.objectContaining({ volume: 6000 })
    }));
  });

  it('persists sleep logs (update existing)', async () => {
    const userId = 'user-1';
    const envelopes = [{ category: 'sleep', data: { hours: 8, update: true, date: '2026-03-19' } }];
    mockTx.sleepLog.findFirst.mockResolvedValue({ id: 's-1', hours: 7 });
    await persistLogData(envelopes, userId);
    expect(mockTx.sleepLog.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 's-1' },
      data: expect.objectContaining({ hours: 8 })
    }));
  });

  it('persists body measurements (create new)', async () => {
    const userId = 'user-1';
    const envelopes = [{ category: 'measurement', data: { weight: 80, bodyFat: 15 } }];
    await persistLogData(envelopes, userId);
    expect(mockTx.bodyMeasurement.create).toHaveBeenCalled();
  });

  it('persists body measurements (update existing)', async () => {
    const userId = 'user-1';
    // CRITICAL: Add update: true and a fixed date for reliable lookup
    const envelopes = [{ category: 'measurement', data: { weight: 81, bodyFat: 16, update: true, date: '2026-03-19' } }];
    
    // Mock existing measurement
    mockTx.bodyMeasurement.findFirst.mockResolvedValue({ id: 'meas-1', weight: 80 });

    await persistLogData(envelopes, userId);

    expect(mockTx.bodyMeasurement.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'meas-1' },
      data: expect.objectContaining({ weight: 81 })
    }));
  });

  it('handles goal updates', async () => {
    const userId = 'user-1';
    const envelopes = [{ category: 'goals', data: { proteinTarget: "160", kcalTarget: "2400" } }];
    await persistLogData(envelopes, userId);
    expect(mockTx.goal.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ proteinTarget: 160 })
    }));
  });

  it('throws error and logs when a category fails', async () => {
    const userId = 'user-1';
    const envelopes = [{ category: 'food', data: { items: [{ name: 'Rice', protein: 5, kcal: 100 }] } }];
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error('DB Error'));
    await expect(persistLogData(envelopes, userId)).rejects.toThrow('DB Error');
  });

  it('skips unknown categories', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await persistLogData([{ category: 'unknown' } as unknown as any], 'user-1'); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown category'));
  });

  it('handles invalid record data in categories gracefully (Zod throw check)', async () => {
    const userId = 'user-1';
    // Wrap in try-catch because persistLogData will bubble up the ZodError
    const envelopes = [{ category: 'sleep', data: "not-an-object" as unknown as any }]; // eslint-disable-line @typescript-eslint/no-explicit-any
    
    await expect(persistLogData(envelopes, userId)).rejects.toThrow();
  });
});
