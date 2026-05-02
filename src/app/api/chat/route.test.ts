import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import prisma from '@/lib/prisma';
import type { UserKnowledge, PersonalRecord, Routine } from '@prisma/client';

vi.mock('@/lib/prisma', () => ({
  default: {
    userKnowledge: {
      findMany: vi.fn(),
    },
    personalRecord: {
      findMany: vi.fn(),
    },
    routine: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' } })),
}));

describe('Chat API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test_key';
  });

  it('returns 401 if not authenticated', async () => {
    const nextAuth = await import('next-auth');
    vi.mocked(nextAuth.getServerSession).mockResolvedValueOnce(null);
    
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 if prompt missing', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('calls OpenRouter and returns response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'AI Response' } }]
      })
    } as unknown as Response);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello', history: [] }),
    });
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.text).toBe('AI Response');
  });

  it('handles OpenRouter failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Error'
    } as unknown as Response);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('handles fetch exception', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('covers knowledge and PR context in prompt', async () => {
    vi.mocked(prisma.userKnowledge.findMany).mockResolvedValue([{ key: 'k1', value: 'v1' }] as unknown as UserKnowledge[]);
    vi.mocked(prisma.personalRecord.findMany).mockResolvedValue([{ maxWeight: 100, exercise: { name: 'Bench' } }] as unknown as PersonalRecord[]);
    vi.mocked(prisma.routine.findMany).mockResolvedValue([{ id: 'r1', name: 'R1' }] as unknown as Routine[]);
    
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Context response' } }]
      })
    } as unknown as Response);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Context', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('handles empty choices from OpenRouter', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [] })
    } as unknown as Response);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('handles missing images safely', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'OK' } }] })
    } as unknown as Response);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Image', history: [], images: null }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
