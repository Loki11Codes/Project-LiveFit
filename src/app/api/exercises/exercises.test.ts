import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import prisma from "@/lib/prisma";

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    exercise: {
      findMany: vi.fn(),
    },
  },
}));

describe('Exercises API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if unauthorized', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns exercises on success', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as unknown as Session);
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([{ id: '1', name: 'Pushups' }] as unknown as Awaited<ReturnType<typeof prisma.exercise.findMany>>);
    
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Pushups');
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as unknown as Session);
    vi.mocked(prisma.exercise.findMany).mockRejectedValue(new Error('DB Error'));
    
    const res = await GET();
    expect(res.status).toBe(500);
  });
});



