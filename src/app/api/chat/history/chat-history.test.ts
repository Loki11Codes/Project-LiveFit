import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    chatMessage: {
      findMany: vi.fn(),
    },
  },
}));

describe('Chat History API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns 401 if not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns formatted chat messages for authenticated user', async () => {
    const mockUser = { id: 'user-1' };
    vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });

    const mockMessages = [
      {
        id: '1',
        role: 'user',
        text: 'Hello',
        createdAt: new Date('2026-03-18T10:00:00Z'),
        images: null,
      },
      {
        id: '2',
        role: 'model',
        text: '|||DATA {} ||| Hi there!',
        createdAt: new Date('2026-03-18T10:01:00Z'),
        images: JSON.stringify([{ url: 'test.jpg' }]),
      },
    ];

    vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as any);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].text).toBe('Hello');
    expect(data[1].text).toBe('Hi there!'); // |||DATA||| stripped
    expect(data[1].images).toHaveLength(1);
    expect(data[1].images[0].url).toBe('test.jpg');
  });

  it('handles malformed JSON in images', async () => {
    const mockUser = { id: 'user-1' };
    vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });

    const mockMessages = [
      {
        id: '1',
        role: 'user',
        text: 'Hello',
        createdAt: new Date(),
        images: 'invalid-json',
      },
    ];

    vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as any);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data[0].images).toEqual([]);
  });

  it('returns 500 if database fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
    vi.mocked(prisma.chatMessage.findMany).mockRejectedValue(new Error('DB Error'));

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

