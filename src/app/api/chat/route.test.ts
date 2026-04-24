/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { persistLogData } from '@/lib/persistence';
import { POST } from './route';

// Mock Dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

let mockResponseText = '|||DATA {"category": "food", "name": "Apple"} ||| That sounds healthy!';
let mockShouldFailGemini = false;
let mockGeminiCallCount = 0;
let mockGeminiShould404Once = false;
let mockGeminiShouldThrowString = false;
let mockGeminiReturnsEmpty = false;
let mockFsShouldFail = false;

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: vi.fn().mockImplementation(async () => {
             mockGeminiCallCount++;
             if (mockGeminiShouldThrowString) {
               throw "string error";
             }
             if (mockGeminiShould404Once && mockGeminiCallCount === 1) {
               throw new Error('404 Model not found');
             }
             if (mockShouldFailGemini) throw new Error('Gemini Failed');
             return {
                response: {
                  text: () => mockGeminiReturnsEmpty ? '' : (mockGeminiShould404Once ? 'Success after retry' : mockResponseText),
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
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'user-123' }) },
    routine: { findMany: vi.fn().mockResolvedValue([]) },
    userKnowledge: { findMany: vi.fn().mockResolvedValue([]) },
    personalRecord: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock('@/lib/persistence', () => ({
  persistLogData: vi.fn().mockResolvedValue({}),
}));

// Mock global fetch for OpenRouter
globalThis.fetch = vi.fn();

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    default: { ...actual },
    appendFileSync: vi.fn().mockImplementation((...args) => {
      if (mockFsShouldFail) throw new Error('FS Fail');
    }),
  };
});

describe('Chat API Route', () => {
  const userId = 'user-123';
  const mockSession = { user: { id: userId } };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.OPENROUTER_API_KEY = 'or-key';
    mockShouldFailGemini = false;
    mockGeminiCallCount = 0;
    mockGeminiShould404Once = false;
    mockGeminiShouldThrowString = false;
    mockGeminiReturnsEmpty = false;
    mockFsShouldFail = false;
    mockResponseText = '|||DATA {"category": "food", "name": "Apple"} ||| That sounds healthy!';
    (getServerSession as any).mockResolvedValue(mockSession);
    (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'OR Response' } }] })
    });
  });

  it('fails if validation fails (empty prompt and no images)', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: '', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('successfully processes a message via Gemini', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('covers empty prompt with images (branch 441)', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt: '',
        history: [],
        images: [{ base64: 'b64', mediaType: 'image/png', name: 'img.png' }]
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('covers placeholder API keys (branches 452-461)', async () => {
    process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';
    process.env.OPENROUTER_API_KEY = 'your_openrouter_api_key_here';
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('covers knowledge and PR context in prompt', async () => {
    (prisma.userKnowledge.findMany as any).mockResolvedValue([{ key: 'k1', value: 'v1' }]);
    (prisma.personalRecord.findMany as any).mockResolvedValue([{ maxWeight: 100, exercise: { name: 'Bench' } }]);
    (prisma.routine.findMany as any).mockResolvedValue([{ id: 'r1', name: 'R1' }]);
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Context', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('covers Gemini succeed but OR also configured (branch 489)', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('covers OpenRouter mapping with history and images', async () => {
    mockShouldFailGemini = true;
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Analyze',
        history: [{ role: 'user', parts: [{ text: 'Prev' }] }],
        images: [{ base64: 'b64', mediaType: 'image/png', name: 'img.png' }]
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('covers OpenRouter returning empty string (branch 500+)', async () => {
    mockShouldFailGemini = true;
    (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '' } }] })
    });
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Empty', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('covers appendFileSync failure line', async () => {
    mockFsShouldFail = true;
    (persistLogData as any).mockRejectedValueOnce(new Error('Persistence failed'));
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Bad data', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    mockFsShouldFail = false;
  });

  it('handles database saving errors during session', async () => {
    (prisma.chatMessage.create as any).mockRejectedValueOnce(new Error('DB Error'));
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Log this', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('handles 429 rate limit error', async () => {
    mockShouldFailGemini = true;
    (globalThis.fetch as any).mockRejectedValue(new Error('429 Too Many Requests'));
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Go', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('handles missing user in database (stale session)', async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('handles images when Gemini key is missing', async () => {
    process.env.GEMINI_API_KEY = '';
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ 
        prompt: 'Analyze', 
        history: [], 
        images: [{ base64: 'b64', mediaType: 'image/png', name: 'img.png' }] 
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('covers Gemini 404 retry logic', async () => {
    mockGeminiShould404Once = true;
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Retry', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockGeminiCallCount).toBeGreaterThan(1);
  });

  it('covers All Gemini models failed (non-Error throw)', async () => {
    mockGeminiShouldThrowString = true;
    (globalThis.fetch as any).mockResolvedValue({ ok: false, status: 500, text: async () => 'Error' });
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Fail', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('handles sanitizeGeminiHistory cases', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ 
        prompt: 'Hello', 
        history: [
            { role: 'model', parts: [{ text: 'M1' }] },
            { role: 'user', parts: [{ text: 'U1' }] },
            { role: 'user', parts: [{ text: 'U2' }] }
        ], 
        images: [] 
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('handles OpenRouter non-ok response', async () => {
    mockShouldFailGemini = true;
    (globalThis.fetch as any).mockResolvedValue({ ok: false, status: 403, text: async () => 'Forbidden' });
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Fail', history: [], images: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
