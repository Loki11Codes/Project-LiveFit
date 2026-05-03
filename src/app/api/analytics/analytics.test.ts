import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { type Session } from 'next-auth';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    foodLog: { findMany: vi.fn() },
    bodyMeasurement: { findMany: vi.fn() },
  },
}));

describe('Analytics API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('aggregates nutrition and weight data for authenticated user', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as unknown as Session);
    
    const mockFood = [
      { id: '1', time: new Date('2026-03-18T10:00:00Z'), kcal: 500, protein: 30 },
      { id: '2', time: new Date('2026-03-18T15:00:00Z'), kcal: 300, protein: 20 },
    ];
    const mockMeasurements = [
      { id: 'm1', time: new Date('2026-03-18T08:00:00Z'), weight: 70 },
    ];

    vi.mocked(prisma.foodLog.findMany).mockResolvedValue(mockFood as unknown as Awaited<ReturnType<typeof prisma.foodLog.findMany>>);
    vi.mocked(prisma.bodyMeasurement.findMany).mockResolvedValue(mockMeasurements as unknown as Awaited<ReturnType<typeof prisma.bodyMeasurement.findMany>>);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.averages.kcal).toBe(800); // 800 total / 1 day
    expect(data.nutritionStats).toHaveLength(1);
    expect(data.weightTrend).toHaveLength(1);
    expect(data.meta.logCount).toBe(2);
  });

  it('handles empty data gracefully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
    vi.mocked(prisma.foodLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.bodyMeasurement.findMany).mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.averages.kcal).toBe(0);
    expect(data.nutritionStats).toEqual([]);
  });

  it('returns 500 if database fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
    vi.mocked(prisma.foodLog.findMany).mockRejectedValue(new Error('DB Error'));

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

