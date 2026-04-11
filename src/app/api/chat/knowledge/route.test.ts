import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';


vi.mock('next-auth');
vi.mock('@/lib/prisma', () => ({
  default: {
    userKnowledge: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe('Knowledge API', () => {
  const mockUser = { id: 'user-1' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 if not authenticated', async () => {
      (getServerSession as any).mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('returns knowledge for the current user', async () => {
      (getServerSession as any).mockResolvedValue({ user: mockUser });
      (prisma.userKnowledge.findMany as any).mockResolvedValue([
        { key: 'injury', value: 'Knee' }
      ]);

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].key).toBe('injury');
    });
  });

  describe('POST', () => {
    it('returns 400 if key/value missing', async () => {
      (getServerSession as any).mockResolvedValue({ user: mockUser });
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ key: 'injury' }) // missing value
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('upserts knowledge entry', async () => {
      (getServerSession as any).mockResolvedValue({ user: mockUser });
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ key: 'injury', value: 'Knee' })
      });

      (prisma.userKnowledge.upsert as any).mockResolvedValue({ key: 'injury', value: 'Knee' });

      const res = await POST(req);
      await res.json();

      expect(res.status).toBe(200);
      expect(prisma.userKnowledge.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId_key: { userId: 'user-1', key: 'injury' }
        }
      }));
    });
  });
});
