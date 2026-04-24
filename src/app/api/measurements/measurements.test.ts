/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  default: {
    bodyMeasurement: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/persistence', () => ({
  syncUserGoals: vi.fn().mockResolvedValue({}),
}));

describe('Measurements API Route', () => {
  const mockSession = { user: { id: 'user-1' } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
  });

  describe('GET', () => {
    it('returns 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const req = new NextRequest('http://localhost');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns latest measurement by default', async () => {
      const mockMeasurement = { weight: 80 };
      vi.mocked(prisma.bodyMeasurement.findFirst).mockResolvedValueOnce(mockMeasurement as any);
      const req = new NextRequest('http://localhost');
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toEqual(mockMeasurement);
    });

    it('returns all measurements if all=true', async () => {
      vi.mocked(prisma.bodyMeasurement.findMany).mockResolvedValueOnce([{ weight: 80 }] as any);
      const req = new NextRequest('http://localhost?all=true');
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
    });

    it('returns empty object if no measurements exist', async () => {
      vi.mocked(prisma.bodyMeasurement.findFirst).mockResolvedValueOnce(null);
      const req = new NextRequest('http://localhost');
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toEqual({});
    });

    it('returns 500 on db error', async () => {
      vi.mocked(prisma.bodyMeasurement.findFirst).mockRejectedValueOnce(new Error('fail'));
      const req = new NextRequest('http://localhost');
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    it('returns 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const req = new NextRequest('http://localhost', { method: 'POST' });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('creates a new measurement', async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma));
      vi.mocked(prisma.bodyMeasurement.create).mockResolvedValueOnce({ id: 'm1' } as any);
      
      const req = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ weight: 80, waist: 90 })
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(prisma.bodyMeasurement.create).toHaveBeenCalled();
    });

    it('handles null values for optional fields', async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma));
      vi.mocked(prisma.bodyMeasurement.create).mockResolvedValueOnce({ id: 'm1' } as any);
      
      const req = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          weight: null,
          waist: null
        })
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(prisma.bodyMeasurement.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
            weight: null,
            waist: null
        })
      }));
    });

    it('returns 400 for invalid JSON', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        body: '{"weight":' // Malformed
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 500 on transaction error', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error('fail'));
      const req = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ weight: 80 })
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });
});
