import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  default: {
    goal: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

describe('Goals API Route', () => {
  const mockSession = { user: { id: 'user-1' } };

  beforeEach(() => {
    vi.clearAllMocks();
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns 401 if not authenticated', async () => {
    (getServerSession as any).mockResolvedValueOnce(null);
    const res = await GET(new NextRequest('http://localhost/api/goals'));
    expect(res.status).toBe(401);
  });

  it('returns goals for the current user', async () => {
    const mockGoal = { proteinTarget: 150, kcalTarget: 2500 };
    (prisma.goal.findUnique as any).mockResolvedValueOnce(mockGoal);

    const res = await GET(new NextRequest('http://localhost/api/goals'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(mockGoal);
  });

  it('creates or updates goals on POST', async () => {
    const goalData = { proteinTarget: 160, kcalTarget: 2600 };
    (prisma.goal.upsert as any).mockResolvedValueOnce(goalData);

    const req = new NextRequest('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(goalData);
    expect(prisma.goal.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1' },
      update: expect.objectContaining({ proteinTarget: 160 }),
    }));
  });

  it('returns 400 for invalid goal data', async () => {
    const req = new NextRequest('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ proteinTarget: -10 }), // Invalid
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 500 if database fails', async () => {
    (prisma.goal.findUnique as any).mockRejectedValueOnce(new Error('DB Error'));
    const res = await GET(new NextRequest('http://localhost/api/goals'));
    expect(res.status).toBe(500);
  });
});
