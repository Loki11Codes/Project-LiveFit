import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

vi.mock('next-auth');
vi.mock('@/lib/prisma', () => ({
  default: {
    personalRecord: {
      findMany: vi.fn(),
    },
  },
}));

describe('Personal Records API', () => {
  const mockUser = { id: 'user-1' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns personal records for the user', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });
    vi.mocked(prisma.personalRecord.findMany).mockResolvedValue([
      { id: 'pr-1', exerciseId: 'e1', maxWeight: 100, exercise: { name: 'Bench Press' } }
    ] as unknown as Awaited<ReturnType<typeof prisma.personalRecord.findMany>>);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].exercise.name).toBe('Bench Press');
  });

  it('returns 401 if unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
