import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import prisma from '@/lib/prisma';
import type { UserKnowledge, PersonalRecord, Routine } from '@prisma/client';

vi.mock('@/lib/prisma', () => ({
  default: {
    userKnowledge: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    personalRecord: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    routine: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'u1' }),
    },
    chatMessage: {
        create: vi.fn().mockResolvedValue({}),
    }
  },
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));
import { getServerSession } from 'next-auth';

// Global fetch mock
globalThis.fetch = vi.fn();

describe('Chat API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test_key';
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } });
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'AI response' } }] }),
      text: async () => 'AI response',
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' })
    } as unknown as Response);
  });

  it('returns 401 if not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello', history: [], images: [] }),
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
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'AI Response' } }]
      }),
      headers: new Headers({ 'content-type': 'application/json' })
    } as unknown as Response);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello', history: [], images: [] }),
    });
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.text).toBe('AI Response');
  });

  it('handles OpenRouter failure', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Error',
      text: async () => 'Internal Error',
      json: async () => ({ error: 'Internal Error' }),
      headers: new Headers({ 'content-type': 'application/json' })
    } as unknown as Response);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('handles fetch exception', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('covers knowledge and PR context in prompt', async () => {
    vi.mocked(prisma.userKnowledge.findMany).mockResolvedValue([{ key: 'k1', value: 'v1' }] as unknown as UserKnowledge[]);
    vi.mocked(prisma.personalRecord.findMany).mockResolvedValue([{ maxWeight: 100, exercise: { name: 'Bench' } }] as unknown as PersonalRecord[]);
    vi.mocked(prisma.routine.findMany).mockResolvedValue([{ id: 'r1', name: 'R1' }] as unknown as Routine[]);
    
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
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
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
      text: async () => JSON.stringify({ choices: [] }),
      headers: new Headers({ 'content-type': 'application/json' })
    } as unknown as Response);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('handles missing images safely', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'OK' } }] })
    } as unknown as Response);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Image', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
