import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    dayTypeEntry: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe('DayTypes API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('returns entries for authenticated user', async () => {
      const mockUser = { id: 'user-1' };
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });
      
      const mockEntries = [{ dayKey: '2026-03-18', dayType: 'Training' }];
      vi.mocked(prisma.dayTypeEntry.findMany).mockResolvedValue(mockEntries as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockEntries);
    });
  });

  describe('POST', () => {
    it('returns 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new Request('http://localhost/api/day-types', { method: 'POST', body: JSON.stringify({}) });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('upserts a day type entry', async () => {
      const mockUser = { id: 'user-1' };
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });
      
      const payload = { dayKey: '2026-03-18', dayType: 'Rest' };
      vi.mocked(prisma.dayTypeEntry.upsert).mockResolvedValue(payload as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const req = new Request('http://localhost/api/day-types', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(payload);
      expect(prisma.dayTypeEntry.upsert).toHaveBeenCalled();
    });

    it('returns 400 for invalid data', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
      const req = new Request('http://localhost/api/day-types', {
        method: 'POST',
        body: JSON.stringify({ dayKey: '', dayType: 'Invalid' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 500 if database fails on GET', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
      vi.mocked(prisma.dayTypeEntry.findMany).mockRejectedValueOnce(new Error('DB Error'));
      const res = await GET();
      expect(res.status).toBe(500);
    });

    it('returns 500 if database fails on POST', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
      vi.mocked(prisma.dayTypeEntry.upsert).mockRejectedValueOnce(new Error('DB Error'));
      const res = await POST(new Request('http://localhost/api/day-types', { method: 'POST', body: JSON.stringify({ dayKey: '2026-03-18', dayType: 'Rest' }) }));
      expect(res.status).toBe(500);
    });
  });
});
