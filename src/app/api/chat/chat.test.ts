import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { persistLogData } from '@/lib/persistence';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn().mockResolvedValue({
    response: {
      text: () => '|||DATA {"category": "food", "items": [{"name": "Apple"}]} ||| OK!',
    },
  }),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    chatMessage: { create: vi.fn() },
  },
}));

vi.mock('@/lib/persistence', () => ({
  persistLogData: vi.fn(),
}));

describe('Chat API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('returns 400 for invalid request body', async () => {
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('handles chat request and persists logs', async () => {
    const mockUser = { id: 'user-1' };
    vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'I ate an apple',
        history: [],
        images: [],
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.text).toContain('OK!');
    expect(persistLogData).toHaveBeenCalled();
    expect(prisma.chatMessage.create).toHaveBeenCalled();
  });

  it('returns 500 if AI fails completely', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
    
    mockGenerateContent.mockRejectedValue(new Error('AI Error'));

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'fail', history: [], images: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('falls back to OpenRouter if Gemini fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } });
    process.env.OPENROUTER_API_KEY = 'open-key';
    
    // Gemini fails
    mockGenerateContent.mockRejectedValue(new Error('Gemini Error'));
    
    // OpenRouter succeeds
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'OpenRouter response' } }]
      })
    }));

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'hello', history: [], images: [] }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.text).toBe('OpenRouter response');
  });
});

