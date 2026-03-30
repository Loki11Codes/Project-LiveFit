import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { persistLogData } from '@/lib/persistence';
import { POST } from './route';

// Mock Dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// We need a way to control the mock response per test
let mockResponseText = '|||DATA {"category": "food", "name": "Apple"} ||| That sounds healthy!';
let mockShouldFailGemini = false;

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      constructor() {}
      getGenerativeModel() {
        return {
          generateContent: vi.fn().mockImplementation(async () => {
             if (mockShouldFailGemini) throw new Error('Gemini Failed');
             return {
                response: {
                  text: () => mockResponseText,
                },
             };
          }),
        };
      }
    },
  };
});

vi.mock('@/lib/prisma', () => ({
  default: {
    chatMessage: { create: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock('@/lib/persistence', () => ({
  persistLogData: vi.fn().mockResolvedValue({}),
}));

// Mock global fetch for OpenRouter
global.fetch = vi.fn();

describe('Chat API Route', () => {
  const userId = 'user-123';
  const mockSession = { user: { id: userId } };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.OPENROUTER_API_KEY = 'or-key';
    mockShouldFailGemini = false;
    mockResponseText = '|||DATA {"category": "food", "name": "Apple"} ||| That sounds healthy!';
    (getServerSession as unknown).mockResolvedValue(mockSession);
    (global.fetch as unknown).mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '|||DATA {"category": "sleep", "hours": 8} ||| Sleep logged via OpenRouter' } }] })
    });
  });

  it('fails if validation fails (empty prompt)', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: '', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 500 if AI providers are missing keys', async () => {
    process.env.GEMINI_API_KEY = '';
    process.env.OPENROUTER_API_KEY = '';
    const req = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'Hello', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('successfully processes a message via Gemini', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'I ate an apple', history: [], images: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toContain('That sounds healthy!');
    expect(persistLogData).toHaveBeenCalled();
  });

  it('fails over to OpenRouter if Gemini fails', async () => {
    mockShouldFailGemini = true;
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Go OpenRouter', history: [], images: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toContain('Sleep logged via OpenRouter');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('openrouter.ai'), expect.any(Object));
  });

  it('handles database saving errors during session', async () => {
    (prisma.chatMessage.create as unknown).mockRejectedValueOnce(new Error('DB Error'));
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Log this', history: [], images: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200); // Should still succeed even if user message saving fails (it's in a try-catch in route)
  });

  it('handles persistence errors with a warning', async () => {
    (persistLogData as unknown).mockRejectedValueOnce(new Error('Persistence failed'));
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Bad data', history: [], images: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.warning).toBeDefined();
  });

  it('handles image uploads correctly', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Analyze this',
        history: [],
        images: [{ base64: 'base64str', mediaType: 'image/jpeg', name: 'workout.jpg' }]
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    // Should NOT failover to OpenRouter for images (route.ts: lines 231, 308)
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
