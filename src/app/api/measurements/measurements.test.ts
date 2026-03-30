/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    bodyMeasurement: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Measurements API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const res = await GET(new Request('http://localhost/api/measurements'));
      expect(res.status).toBe(401);
    });

    it('returns latest measurement by default', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
      const mockLatest = { id: 'm1', weight: 70 };
      vi.mocked(prisma.bodyMeasurement.findFirst).mockResolvedValue(mockLatest as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const res = await GET(new Request('http://localhost/api/measurements'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockLatest);
    });

    it('returns all measurements when all=true', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
      const mockMany = [{ id: 'm1' }, { id: 'm2' }];
      vi.mocked(prisma.bodyMeasurement.findMany).mockResolvedValue(mockMany as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const res = await GET(new Request('http://localhost/api/measurements?all=true'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(2);
    });
  });

  describe('POST', () => {
    it('creates a new measurement', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
      const payload = { weight: 70.5, waist: 80 };
      vi.mocked(prisma.bodyMeasurement.create).mockResolvedValue({ id: 'm1', ...payload } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const req = new Request('http://localhost/api/measurements', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.weight).toBe(70.5);
      expect(prisma.bodyMeasurement.create).toHaveBeenCalled();
    });

    it('returns 400 for invalid data', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
      const req = new Request('http://localhost/api/measurements', {
        method: 'POST',
        body: JSON.stringify({ date: "invalid-date" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 500 if database fails on GET', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
      vi.mocked(prisma.bodyMeasurement.findFirst).mockRejectedValueOnce(new Error('DB Error'));
      const res = await GET(new Request('http://localhost/api/measurements'));
      expect(res.status).toBe(500);
    });

    it('returns 500 if database fails on POST', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
      vi.mocked(prisma.bodyMeasurement.create).mockRejectedValueOnce(new Error('DB Error'));
      const res = await POST(new Request('http://localhost/api/measurements', { method: 'POST', body: JSON.stringify({ weight: 70 }) }));
      expect(res.status).toBe(500);
    });
  });
});

