/* eslint-disable @typescript-eslint/no-explicit-any */
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
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
  });

  describe('GET', () => {
    it('returns 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('returns goals for the current user', async () => {
      const mockGoal = { proteinTarget: 150, kcalTarget: 2500 };
      vi.mocked(prisma.goal.findUnique).mockResolvedValueOnce(mockGoal as any);
      const res = await GET();
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toEqual(mockGoal);
    });

    it('returns empty object if no goal exists', async () => {
      vi.mocked(prisma.goal.findUnique).mockResolvedValueOnce(null);
      const res = await GET();
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toEqual({});
    });

    it('returns 500 if database fails', async () => {
      vi.mocked(prisma.goal.findUnique).mockRejectedValueOnce(new Error('DB Error'));
      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    it('returns 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const req = new Request('http://localhost', { method: 'POST' });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('creates or updates goals on POST', async () => {
      const goalData = { proteinTarget: 160, kcalTarget: 2600 };
      vi.mocked(prisma.goal.upsert).mockResolvedValueOnce(goalData as any);
      const req = new NextRequest('http://localhost/api/goals', {
        method: 'POST',
        body: JSON.stringify(goalData),
      });
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toEqual(goalData);
    });

    it('returns 400 for invalid goal data', async () => {
      const req = new NextRequest('http://localhost/api/goals', {
        method: 'POST',
        body: JSON.stringify({ proteinTarget: -10 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 500 if database fails on POST', async () => {
      vi.mocked(prisma.goal.upsert).mockRejectedValueOnce(new Error('DB Error'));
      const req = new NextRequest('http://localhost/api/goals', {
        method: 'POST',
        body: JSON.stringify({ proteinTarget: 100, kcalTarget: 2000 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });
});
