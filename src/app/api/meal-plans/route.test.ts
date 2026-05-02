import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { getServerSession } from 'next-auth';
import { type Session } from 'next-auth';
import prisma from '@/lib/prisma';

vi.mock('next-auth');
vi.mock('@/lib/prisma', () => ({
  default: {
    mealPlan: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Meal Plans API', () => {
  const mockUser = { id: 'user-1' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 if unauthorized', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('returns the latest meal plan', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser } as unknown as Session);
      vi.mocked(prisma.mealPlan.findFirst).mockResolvedValue({
        id: 'plan-1',
        entries: [{ id: 'e1', title: 'Oats' }]
      } as unknown as Awaited<ReturnType<typeof prisma.mealPlan.findFirst>>);

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('plan-1');
    });

    it('returns 500 on db error', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser } as unknown as Session);
      vi.mocked(prisma.mealPlan.findFirst).mockRejectedValue(new Error('db fail'));

      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    it('returns 401 if unauthorized', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid entries', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser } as unknown as Session);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bulk Plan', entries: 'not-an-array' })
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('creates a new meal plan', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser } as unknown as Session);
      const entries = [{ dayIndex: 0, mealType: 'Breakfast', title: 'Oats' }];
      
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bulk Plan', entries, weekStarting: '2026-01-01' })
      });

      vi.mocked(prisma.mealPlan.create).mockResolvedValue({ id: 'new-plan', entries } as unknown as Awaited<ReturnType<typeof prisma.mealPlan.create>>);

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('new-plan');
    });

    it('creates a new meal plan with default name and date', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser } as unknown as Session);
      const entries = [{ dayIndex: 0, mealType: 'Breakfast', title: 'Oats' }];
      
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ entries })
      });

      vi.mocked(prisma.mealPlan.create).mockResolvedValue({ id: 'new-plan', name: 'My AI Meal Plan', entries } as unknown as Awaited<ReturnType<typeof prisma.mealPlan.create>>);

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.name).toBe('My AI Meal Plan');
      expect(prisma.mealPlan.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          name: 'My AI Meal Plan',
          weekStarting: expect.any(Date)
        })
      }));
    });

    it('returns 500 on server error', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser } as unknown as Session);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ entries: [] })
      });
      vi.mocked(prisma.mealPlan.create).mockRejectedValue(new Error('fail'));

      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });
});
