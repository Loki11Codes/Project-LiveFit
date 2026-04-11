import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { getServerSession } from 'next-auth';
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
    it('returns the latest meal plan', async () => {
      (getServerSession as any).mockResolvedValue({ user: mockUser });
      (prisma.mealPlan.findFirst as any).mockResolvedValue({
        id: 'plan-1',
        entries: [{ id: 'e1', title: 'Oats' }]
      });

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('plan-1');
    });
  });

  describe('POST', () => {
    it('creates a new meal plan', async () => {
      (getServerSession as any).mockResolvedValue({ user: mockUser });
      const entries = [{ dayIndex: 0, mealType: 'Breakfast', title: 'Oats' }];
      
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bulk Plan', entries })
      });

      (prisma.mealPlan.create as any).mockResolvedValue({ id: 'new-plan', entries });

      const res = await POST(req);
      await res.json();

      expect(res.status).toBe(200);
      expect(prisma.mealPlan.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          name: 'Bulk Plan',
          userId: 'user-1'
        })
      }));
    });
  });
});
