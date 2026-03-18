import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    foodLog: { findMany: vi.fn() },
    workoutLog: { findMany: vi.fn() },
    sleepLog: { findMany: vi.fn() },
  },
}));

describe('Logs API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns food, workouts, and sleep logs for authenticated user', async () => {
    const mockUser = { id: 'user-1' };
    vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });

    const mockFood = [{ id: 'f1', name: 'Apple' }];
    const mockWorkouts = [{ id: 'w1', focus: 'Legs' }];
    const mockSleep = [{ id: 's1', hours: 8 }];

    vi.mocked(prisma.foodLog.findMany).mockResolvedValue(mockFood as any);
    vi.mocked(prisma.workoutLog.findMany).mockResolvedValue(mockWorkouts as any);
    vi.mocked(prisma.sleepLog.findMany).mockResolvedValue(mockSleep as any);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      food: mockFood,
      workouts: mockWorkouts,
      sleep: mockSleep,
    });

    expect(prisma.foodLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
    expect(prisma.workoutLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
    expect(prisma.sleepLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
  });

  it('returns 500 if database fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
    vi.mocked(prisma.foodLog.findMany).mockRejectedValue(new Error('DB Error'));

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
