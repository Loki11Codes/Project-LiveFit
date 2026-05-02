import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE, POST } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/persistence', () => ({
  persistLogData: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    foodLog: { findMany: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    workoutLog: { findMany: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    sleepLog: { findMany: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    bodyMeasurement: { findFirst: vi.fn(), delete: vi.fn() },
  },
}));

const mockSession = { user: { id: 'user-1' } };

describe('Logs API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET ────────────────────────────────────────────────────────────────────
  describe('GET', () => {
    it('returns 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('returns food, workouts, and sleep logs for authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const mockFood = [{ id: 'f1', name: 'Apple' }];
      const mockWorkouts = [{ id: 'w1', focus: 'Legs' }];
      const mockSleep = [{ id: 's1', hours: 8 }];

      vi.mocked(prisma.foodLog.findMany).mockResolvedValue(mockFood as unknown as Awaited<ReturnType<typeof prisma.foodLog.findMany>>);
      vi.mocked(prisma.workoutLog.findMany).mockResolvedValue(mockWorkouts as unknown as Awaited<ReturnType<typeof prisma.workoutLog.findMany>>);
      vi.mocked(prisma.sleepLog.findMany).mockResolvedValue(mockSleep as unknown as Awaited<ReturnType<typeof prisma.sleepLog.findMany>>);

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({ food: mockFood, workouts: mockWorkouts, sleep: mockSleep });
    });

    it('returns 500 if database fails', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(prisma.foodLog.findMany).mockRejectedValue(new Error('DB Error'));
      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────────
  describe('DELETE', () => {
    const makeDeleteReq = (body: unknown) =>
      new Request('http://localhost/api/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    it('returns 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const res = await DELETE(makeDeleteReq({ category: 'food', id: 'f1' }));
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid JSON body', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const badReq = new Request('http://localhost/api/logs', {
        method: 'DELETE',
        body: 'not-json',
      });
      const res = await DELETE(badReq);
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing fields', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const res = await DELETE(makeDeleteReq({ category: 'food' })); // missing id
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid category', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as unknown as Session);
      const res = await DELETE(makeDeleteReq({ category: 'invalid', id: 'x1' }));
      expect(res.status).toBe(400);
    });

    it('deletes food log when found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as unknown as Session);
      vi.mocked(prisma.foodLog.findFirst).mockResolvedValue({ id: 'f1', userId: 'user-1' } as unknown as Awaited<ReturnType<typeof prisma.foodLog.findFirst>>);
      vi.mocked(prisma.foodLog.delete).mockResolvedValue({ id: 'f1' } as unknown as Awaited<ReturnType<typeof prisma.foodLog.delete>>);

      const res = await DELETE(makeDeleteReq({ category: 'food', id: 'f1' }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.foodLog.delete).toHaveBeenCalledWith({ where: { id: 'f1' } });
    });

    it('returns 400 when food log not found for user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as unknown as Session);
      vi.mocked(prisma.foodLog.findFirst).mockResolvedValue(null);

      const res = await DELETE(makeDeleteReq({ category: 'food', id: 'nonexistent' }));
      expect(res.status).toBe(400);
    });

    it('deletes workout log when found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as unknown as Session);
      vi.mocked(prisma.workoutLog.findFirst).mockResolvedValue({ id: 'w1', userId: 'user-1' } as unknown as Awaited<ReturnType<typeof prisma.workoutLog.findFirst>>);
      vi.mocked(prisma.workoutLog.delete).mockResolvedValue({ id: 'w1' } as unknown as Awaited<ReturnType<typeof prisma.workoutLog.delete>>);

      const res = await DELETE(makeDeleteReq({ category: 'workout', id: 'w1' }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 400 when workout log not found for user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as unknown as Session);
      vi.mocked(prisma.workoutLog.findFirst).mockResolvedValue(null);

      const res = await DELETE(makeDeleteReq({ category: 'workout', id: 'nonexistent' }));
      expect(res.status).toBe(400);
    });

    it('deletes sleep log when found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as unknown as Session);
      vi.mocked(prisma.sleepLog.findFirst).mockResolvedValue({ id: 's1', userId: 'user-1' } as unknown as Awaited<ReturnType<typeof prisma.sleepLog.findFirst>>);
      vi.mocked(prisma.sleepLog.delete).mockResolvedValue({ id: 's1' } as unknown as Awaited<ReturnType<typeof prisma.sleepLog.delete>>);

      const res = await DELETE(makeDeleteReq({ category: 'sleep', id: 's1' }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 400 when sleep log not found for user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as unknown as Session);
      vi.mocked(prisma.sleepLog.findFirst).mockResolvedValue(null);

      const res = await DELETE(makeDeleteReq({ category: 'sleep', id: 'nonexistent' }));
      expect(res.status).toBe(400);
    });

    it('deletes body measurement when found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as unknown as Session);
      vi.mocked(prisma.bodyMeasurement.findFirst).mockResolvedValue({ id: 'b1', userId: 'user-1' } as unknown as Awaited<ReturnType<typeof prisma.bodyMeasurement.findFirst>>);
      vi.mocked(prisma.bodyMeasurement.delete).mockResolvedValue({ id: 'b1' } as unknown as Awaited<ReturnType<typeof prisma.bodyMeasurement.delete>>);

      const res = await DELETE(makeDeleteReq({ category: 'measurement', id: 'm1' }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 400 when measurement not found for user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(prisma.bodyMeasurement.findFirst).mockResolvedValue(null);

      const res = await DELETE(makeDeleteReq({ category: 'measurement', id: 'nonexistent' }));
      expect(res.status).toBe(400);
    });

    it('returns 500 on database error during delete', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as unknown as Session);
      vi.mocked(prisma.foodLog.findFirst).mockResolvedValue({ id: 'f1', userId: 'user-1' } as unknown as Awaited<ReturnType<typeof prisma.foodLog.findFirst>>);
      vi.mocked(prisma.foodLog.delete).mockRejectedValue(new Error('DB Error'));

      const res = await DELETE(makeDeleteReq({ category: 'food', id: 'f1' }));
      expect(res.status).toBe(500);
    });
  });

  // ─── POST ────────────────────────────────────────────────────────────────────
  describe('POST', () => {
    const makePostReq = (body: unknown) =>
      new Request('http://localhost/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    it('returns 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const res = await POST(makePostReq([]));
      expect(res.status).toBe(401);
    });

    it('returns 400 if body is not an array', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const res = await POST(makePostReq({ category: 'food' }));
      expect(res.status).toBe(400);
    });

    it('persists log data and returns success for valid array', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const logs = [{ category: 'food', data: { name: 'Apple', calories: 100 } }];

      const res = await POST(makePostReq(logs));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 200 for empty array (no logs to persist)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const res = await POST(makePostReq([]));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 500 if persistLogData throws', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const { persistLogData } = await import('@/lib/persistence');
      vi.mocked(persistLogData).mockRejectedValueOnce(new Error('DB Error'));

      const res = await POST(makePostReq([{ category: 'food', data: {} }]));
      expect(res.status).toBe(500);
    });
  });
});
