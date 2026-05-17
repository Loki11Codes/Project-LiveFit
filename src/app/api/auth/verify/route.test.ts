import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    verificationToken: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      redirect: vi.fn((url) => ({ status: 307, headers: { get: () => url } })),
      json: vi.fn((body, init) => ({
        status: init?.status || 200,
        json: async () => body,
      })),
    },
  };
});

describe('Auth Verify API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET (Magic Link)', () => {
    it('returns 400 if token or email is missing', async () => {
      const req = new Request('http://localhost/api/auth/verify');
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/Missing token or email/i);
    });

    it('returns 400 if token is invalid or expired', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(null);
      const req = new Request('http://localhost/api/auth/verify?token=invalid&email=test@example.com');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 if token is expired in database', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
        identifier: 'test@example.com',
        token: 'expired',
        expires: new Date(Date.now() - 10000), // expired
      });
      const req = new Request('http://localhost/api/auth/verify?token=expired&email=test@example.com');
      const res = await GET(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/expired/i);
    });

    it('verifies user and redirects on valid token', async () => {
      const email = 'test@example.com';
      const token = 'valid-token';
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
        identifier: email,
        token: token,
        expires: new Date(Date.now() + 10000),
      });

      vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

      const req = new Request(`http://localhost/api/auth/verify?token=${token}&email=${email}`);
      const res = await GET(req);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(res.status).toBe(307);
    });
  });

  describe('POST (OTP)', () => {
    it('returns 400 if email or code is missing', async () => {
      const req = new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('verifies user on valid OTP', async () => {
      const email = 'test@example.com';
      const code = '123456';
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
        identifier: `otp:${email}`,
        token: code,
        expires: new Date(Date.now() + 10000),
      });

      vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

      const req = new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toMatch(/verified successfully/i);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('returns 400 if OTP is expired', async () => {
      const email = 'test@example.com';
      const code = '123456';
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
        identifier: `otp:${email}`,
        token: code,
        expires: new Date(Date.now() - 10000), // expired
      });

      const req = new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 500 if transaction fails in GET', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockRejectedValue(new Error('Fail'));
      const req = new Request('http://localhost/api/auth/verify?token=t&email=e');
      const res = await GET(req);
      expect(res.status).toBe(500);
    });

    it('returns 500 if transaction fails in POST', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockRejectedValue(new Error('Fail'));
      const req = new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email: 'e', code: 'c' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });

    it('returns 500 if JSON is malformed in POST', async () => {
      const req = new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        body: 'invalid-json',
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });
});
