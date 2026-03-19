import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    userProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    goal: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}));

describe('Profile API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new Request('http://localhost/api/profile');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns profile data for authenticated user', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });
      
      const mockProfile = { userId: 'user-1', age: 30, gender: 'Male' };
      vi.mocked(prisma.userProfile.findUnique).mockResolvedValue(mockProfile as any);

      const req = new Request('http://localhost/api/profile');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockProfile);
      expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('returns goal data when type=goals is requested', async () => {
      const mockUser = { id: 'user-1' };
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });
      
      const mockGoal = { userId: 'user-1', proteinTarget: 150 };
      vi.mocked(prisma.goal.findUnique).mockResolvedValue(mockGoal as any);

      const req = new Request('http://localhost/api/profile?type=goals');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockGoal);
      expect(prisma.goal.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('POST', () => {
    it('returns 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new Request('http://localhost/api/profile', { method: 'POST', body: JSON.stringify({}) });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('updates profile data', async () => {
      const mockUser = { id: 'user-1' };
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });
      
      const updateData = { age: 31, gender: 'Male', name: 'New Name' };
      vi.mocked(prisma.userProfile.upsert).mockResolvedValue({ userId: 'user-1', ...updateData } as any);

      const req = new Request('http://localhost/api/profile', {
        method: 'POST',
        body: JSON.stringify(updateData),
      });
      const res = await POST(req);
      await res.json();

      expect(res.status).toBe(200);
      expect(prisma.userProfile.upsert).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'New Name' },
      });
    });

    it('updates goal data if goal fields are present', async () => {
      const mockUser = { id: 'user-1' };
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });
      
      const goalData = { proteinTarget: 180, kcalTarget: 2500 };
      vi.mocked(prisma.goal.upsert).mockResolvedValue({ userId: 'user-1', ...goalData } as any);

      const req = new Request('http://localhost/api/profile', {
        method: 'POST',
        body: JSON.stringify(goalData),
      });
      const res = await POST(req);
      await res.json();

      expect(res.status).toBe(200);
      expect(prisma.goal.upsert).toHaveBeenCalled();
    });

    it('returns 400 for invalid profile data', async () => {
      const mockUser = { id: 'user-1' };
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });
      
      const invalidData = { age: "invalid" }; // age should be number (forced by schema)
      const req = new Request('http://localhost/api/profile', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('returns 400 for invalid goal data in POST', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
      const res = await POST(new Request('http://localhost/api/profile', { method: 'POST', body: JSON.stringify({ proteinTarget: -10 }) }));
      expect(res.status).toBe(400);
    });

    it('returns 500 if database fails on GET', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
      vi.mocked(prisma.userProfile.findUnique).mockRejectedValueOnce(new Error('DB Error'));
      const res = await GET(new Request('http://localhost/api/profile'));
      expect(res.status).toBe(500);
    });

    it('returns 500 if database fails on POST', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
      vi.mocked(prisma.userProfile.upsert).mockRejectedValueOnce(new Error('DB Error'));
      const res = await POST(new Request('http://localhost/api/profile', { method: 'POST', body: JSON.stringify({ age: 30 }) }));
      expect(res.status).toBe(500);
    });
  });
});
