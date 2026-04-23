import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { type Session } from 'next-auth';
import { syncUserGoals } from '@/lib/persistence';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/persistence', () => ({
  syncUserGoals: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    userProfile: {
      upsert: vi.fn(),
    },
    bodyMeasurement: {
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe('Auth Onboarding API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = new Request('http://localhost/api/auth/onboard', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid onboarding data', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as unknown as Session);
    const req = new Request('http://localhost/api/auth/onboard', {
      method: 'POST',
      body: JSON.stringify({ age: 5 }), // invalid age < 10
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('completes onboarding on valid data', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as unknown as Session);
    
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: typeof prisma) => unknown) => 
      cb({
        userProfile: { upsert: vi.fn().mockResolvedValue({}) },
        bodyMeasurement: { create: vi.fn().mockResolvedValue({}) },
        user: { update: vi.fn().mockResolvedValue({}) },
      })
    );

    const validData = {
      age: 25,
      gender: 'male',
      height: 180,
      activityLevel: 'Active',
      primaryGoal: 'Muscle Gain',
      initialWeight: 75,
    };

    const req = new Request('http://localhost/api/auth/onboard', {
      method: 'POST',
      body: JSON.stringify(validData),
    });
    
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/Onboarding complete/i);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(syncUserGoals).toHaveBeenCalled();
  });
});
