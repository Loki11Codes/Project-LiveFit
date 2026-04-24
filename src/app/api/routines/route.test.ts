import { GET, POST, DELETE } from './route';
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
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
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
      
      const req = new Request('http://localhost/api/routines');
      const res = await GET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('returns routines for authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
      
      const mockRoutines = [{ id: 'r1', name: 'Push' }];
      vi.mocked(prisma.routine.findMany).mockResolvedValueOnce(mockRoutines as any);

      const req = new Request('http://localhost/api/routines');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockRoutines);
    });

    it('returns a single routine if id is provided', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
      const mockRoutine = { id: 'r1', name: 'Push' };
      vi.mocked(prisma.routine.findUnique).mockResolvedValueOnce(mockRoutine as any);

      const req = new Request('http://localhost/api/routines?id=r1');
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockRoutine);
    });

    it('returns 404 if single routine not found', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
      vi.mocked(prisma.routine.findUnique).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/routines?id=nonexistent');
      const res = await GET(req);
      expect(res.status).toBe(404);
    });

    it('returns 500 on db error', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
      vi.mocked(prisma.routine.findMany).mockRejectedValueOnce(new Error('DB Error'));

      const req = new Request('http://localhost/api/routines');
      const res = await GET(req);
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
      expect(await res.json()).toEqual(mockCreated);
    });

    it('creates a new routine with missing target reps', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
      
      const reqBody = {
        name: 'New Routine',
        exercises: [{ exerciseId: 'e1', order: 0, targetSets: 3 }] // targetReps missing
      };
      const req = new Request('http://localhost/api/routines', { 
        method: 'POST', 
        body: JSON.stringify(reqBody) 
      });

      const mockCreated = { id: 'r2', name: 'New Routine' };
      vi.mocked(prisma.routine.create).mockResolvedValueOnce(mockCreated as any);

      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(prisma.routine.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          exercises: {
            create: [expect.objectContaining({ targetReps: null })]
          }
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

  describe('DELETE /api/routines', () => {
    it('returns 401 if unauthorized', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const req = new Request('http://localhost/api/routines?id=r1', { method: 'DELETE' });
      const res = await DELETE(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 if id is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'u1' } } as any);
      const req = new Request('http://localhost/api/routines', { method: 'DELETE' });
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it('returns 404 if routine not found or not owned', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'u1' } } as any);
      vi.mocked(prisma.routine.findFirst).mockResolvedValueOnce(null);
      
      const req = new Request('http://localhost/api/routines?id=r1', { method: 'DELETE' });
      const res = await DELETE(req);
      expect(res.status).toBe(404);
    });

    it('deletes routine successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'u1' } } as any);
      vi.mocked(prisma.routine.findFirst).mockResolvedValueOnce({ id: 'r1', userId: 'u1' } as any);
      vi.mocked(prisma.routine.delete).mockResolvedValueOnce({} as any);

      const req = new Request('http://localhost/api/routines?id=r1', { method: 'DELETE' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });

    it('returns 500 on db error during delete', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'u1' } } as any);
      vi.mocked(prisma.routine.findFirst).mockRejectedValueOnce(new Error('fail'));

      const req = new Request('http://localhost/api/routines?id=r1', { method: 'DELETE' });
      const res = await DELETE(req);
      expect(res.status).toBe(500);
    });
  });
});




