import { GET, POST } from './route';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    routine: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Routines API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/routines', () => {
    it('returns 401 if unauthorized', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      
      const res = await GET();
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('returns routines for authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
      
      const mockRoutines = [{ id: 'r1', name: 'Push' }];
      vi.mocked(prisma.routine.findMany).mockResolvedValueOnce(mockRoutines as any);

      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockRoutines);
      expect(prisma.routine.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 'user-1' }
      }));
    });

    it('returns 500 on db error', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
      vi.mocked(prisma.routine.findMany).mockRejectedValueOnce(new Error('DB Error'));

      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/routines', () => {
    it('returns 401 if unauthorized', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const req = new Request('http://localhost/api/routines', { method: 'POST', body: JSON.stringify({}) });
      
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid data', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
      const req = new Request('http://localhost/api/routines', { 
        method: 'POST', 
        body: JSON.stringify({ name: '' }) 
      });
      
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('creates a new routine successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
      
      const reqBody = {
        name: 'New Routine',
        exercises: [{ exerciseId: 'e1', order: 0, targetSets: 3, targetReps: '10' }]
      };
      const req = new Request('http://localhost/api/routines', { 
        method: 'POST', 
        body: JSON.stringify(reqBody) 
      });

      const mockCreated = { id: 'r2', name: 'New Routine' };
      vi.mocked(prisma.routine.create).mockResolvedValueOnce(mockCreated as any);

      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toEqual(mockCreated);
      expect(prisma.routine.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          name: 'New Routine',
          userId: 'user-1'
        })
      }));
    });

    it('returns 500 on db error', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
      const req = new Request('http://localhost/api/routines', { 
        method: 'POST', 
        body: JSON.stringify({ name: 'n', exercises: [] }) 
      });
      vi.mocked(prisma.routine.create).mockRejectedValueOnce(new Error('db fail'));

      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });
});
