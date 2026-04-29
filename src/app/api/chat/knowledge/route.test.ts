import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    userKnowledge: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe('Knowledge API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 if unauthorized', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('returns knowledge entries on success', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } } as any);
      vi.mocked(prisma.userKnowledge.findMany).mockResolvedValue([{ key: 'k', value: 'v' }] as any);
      const res = await GET();
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
    });

    it('returns 500 on error', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } } as any);
      vi.mocked(prisma.userKnowledge.findMany).mockRejectedValue(new Error('Fail'));
      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    it('returns 401 if unauthorized', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new Request('http://localhost', { method: 'POST' });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 on missing data', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } } as any);
      const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ key: 'k' }) });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('upserts knowledge entry on success', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } } as any);
      vi.mocked(prisma.userKnowledge.upsert).mockResolvedValue({ key: 'k', value: 'v' } as any);
      const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ key: 'K', value: 'v' }) });
      const res = await POST(req);
      await res.json();
      expect(res.status).toBe(200);
      expect(prisma.userKnowledge.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId_key: { userId: 'u1', key: 'k' } }
      }));
    });

    it('returns 500 on error', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } } as any);
      vi.mocked(prisma.userKnowledge.upsert).mockRejectedValue(new Error('Fail'));
      const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ key: 'k', value: 'v' }) });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });
});
