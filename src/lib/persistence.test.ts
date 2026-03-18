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
    (prisma.$transaction as any).mockImplementation((cb: any) => cb(mockTx));
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

    expect(mockTx.foodLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        name: 'Chicken',
        protein: 30,
        kcal: 200,
      })
    });
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

    expect(mockTx.foodLog.update).toHaveBeenCalledWith({
      where: { id: 'existing-id' },
      data: expect.objectContaining({
        protein: 35,
        kcal: 220,
      })
    });
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

    expect(mockTx.userProfile.upsert).toHaveBeenCalledWith({
      where: { userId },
      create: expect.objectContaining({ age: 25, height: 180.5 }),
      update: expect.objectContaining({ age: 25, height: 180.5 }),
    });
  });

  it('handles dayType updates with normalization', async () => {
    const userId = 'user-1';
    const envelopes = [
      {
        category: 'dayType',
        data: {
          type: 'training day'
        }
      }
    ];

    await persistLogData(envelopes, userId);

    expect(mockTx.dayTypeEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { dayType: 'Training' },
        create: expect.objectContaining({ dayType: 'Training' })
      })
    );
  });
  it('persists workout logs', async () => {
    const userId = 'user-1';
    const envelopes = [
      {
        category: 'workout',
        data: { focus: 'Push', volume: 5000, details: 'Heavy day' }
      }
    ];

    await persistLogData(envelopes, userId);

    expect(mockTx.workoutLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ focus: 'Push', volume: 5000 })
    });
  });

  it('persists sleep logs', async () => {
    const userId = 'user-1';
    const envelopes = [
      {
        category: 'sleep',
        data: { hours: 7.5, bedTime: '22:00', wakeTime: '05:30' }
      }
    ];

    await persistLogData(envelopes, userId);

    expect(mockTx.sleepLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ hours: 7.5, bedTime: '22:00' })
    });
  });

  it('persists body measurements', async () => {
    const userId = 'user-1';
    const envelopes = [
      {
        category: 'measurement',
        data: { weight: 80, bodyFat: 15 }
      }
    ];

    await persistLogData(envelopes, userId);

    expect(mockTx.bodyMeasurement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ weight: 80, bodyFat: 15 })
    });
  });

  it('handles goal updates', async () => {
    const userId = 'user-1';
    const envelopes = [
      {
        category: 'goals',
        data: { proteinTarget: "160", kcalTarget: "2400" }
      }
    ];

    await persistLogData(envelopes, userId);

    expect(mockTx.goal.upsert).toHaveBeenCalledWith({
      where: { userId },
      create: expect.objectContaining({ proteinTarget: 160, kcalTarget: 2400 }),
      update: expect.objectContaining({ proteinTarget: 160, kcalTarget: 2400 }),
    });
  });

  it('throws error and logs when a category fails', async () => {
    const userId = 'user-1';
    const envelopes = [{ category: 'food', data: { items: [{ name: 'Rice', protein: 5, kcal: 100 }] } }];
    
    // Setup transaction mock to throw
    (prisma.$transaction as any).mockRejectedValueOnce(new Error('DB Error'));

    await expect(persistLogData(envelopes, userId)).rejects.toThrow('DB Error');
  });

  it('skips unknown categories', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await persistLogData([{ category: 'unknown' } as any], 'user-1');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown category'));
  });

  it('handles "flat" envelope structure', async () => {
    const userId = 'user-1';
    const envelopes = [
      {
        category: 'sleep',
        hours: 8,
        bedTime: '23:00'
      }
    ];

    await persistLogData(envelopes as any, userId);

    expect(mockTx.sleepLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ hours: 8, bedTime: '23:00' })
    });
  });
});
