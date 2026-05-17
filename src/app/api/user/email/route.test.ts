import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { sendEmailChangeVerification } from '@/lib/email';
import type { Session } from 'next-auth';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendEmailChangeVerification: vi.fn() }));
vi.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

vi.mock('@/lib/prisma', () => ({
  default: {
    account: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const SESSION: Session = { user: { id: 'user-1', email: 'old@example.com', name: 'Test' }, expires: '' };

const makeReq = (body: unknown) =>
  new Request('http://localhost/api/user/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/user/email', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 if not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(makeReq({ newEmail: 'new@example.com' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for Google OAuth users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(SESSION);
    vi.mocked(prisma.account.findFirst).mockResolvedValue({ provider: 'google' });
    const res = await POST(makeReq({ newEmail: 'new@example.com' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.details?.provider).toBe('google');
  });

  it('returns 400 for invalid email format', async () => {
    vi.mocked(getServerSession).mockResolvedValue(SESSION);
    vi.mocked(prisma.account.findFirst).mockResolvedValue(null);
    const res = await POST(makeReq({ newEmail: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 if new email is same as current', async () => {
    vi.mocked(getServerSession).mockResolvedValue(SESSION);
    vi.mocked(prisma.account.findFirst).mockResolvedValue(null);
    const res = await POST(makeReq({ newEmail: 'old@example.com' }));
    expect(res.status).toBe(400);
  });

  it('returns 409 if email already taken', async () => {
    vi.mocked(getServerSession).mockResolvedValue(SESSION);
    vi.mocked(prisma.account.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'other-user' });
    const res = await POST(makeReq({ newEmail: 'taken@example.com' }));
    expect(res.status).toBe(409);
  });

  it('sends verification email and returns 200 on success', async () => {
    vi.mocked(getServerSession).mockResolvedValue(SESSION);
    vi.mocked(prisma.account.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.verificationToken.create).mockResolvedValue({});
    vi.mocked(sendEmailChangeVerification).mockResolvedValue(undefined);

    const res = await POST(makeReq({ newEmail: 'new@example.com' }));
    expect(res.status).toBe(200);
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: 'email-change:user-1' },
    });
    expect(prisma.verificationToken.create).toHaveBeenCalled();
    expect(sendEmailChangeVerification).toHaveBeenCalledWith(
      'new@example.com',
      'Test',
      expect.stringContaining('test-uuid-1234')
    );
  });
});
