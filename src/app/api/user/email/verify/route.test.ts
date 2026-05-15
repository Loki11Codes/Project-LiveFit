import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import prisma from '@/lib/prisma';
import { sendEmailChangedNotification } from '@/lib/email';

vi.mock('@/lib/email', () => ({ sendEmailChangedNotification: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  default: {
    verificationToken: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const makeReq = (params: Record<string, string>) => {
  const url = new URL('http://localhost/api/user/email/verify');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
};

const VALID_TOKEN_RECORD = {
  identifier: 'email-change:user-1',
  token: 'new@example.com|test-uuid-1234',
  expires: new Date(Date.now() + 60_000),
};

describe('GET /api/user/email/verify', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 if token or uid missing', async () => {
    const res = await GET(makeReq({ uid: 'user-1' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 if no pending token found', async () => {
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue(null);
    const res = await GET(makeReq({ token: 'abc', uid: 'user-1' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 if token is expired', async () => {
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
      ...VALID_TOKEN_RECORD,
      expires: new Date(Date.now() - 1000),
    });
    vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 1 });
    const res = await GET(makeReq({ token: 'test-uuid-1234', uid: 'user-1' }));
    expect(res.status).toBe(400);
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalled();
  });

  it('returns 400 if uuid does not match', async () => {
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue(VALID_TOKEN_RECORD);
    const res = await GET(makeReq({ token: 'wrong-uuid', uid: 'user-1' }));
    expect(res.status).toBe(400);
  });

  it('redirects and updates email on success', async () => {
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue(VALID_TOKEN_RECORD);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never); // no conflict
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ email: 'old@example.com', name: 'Test' } as never) // user lookup
      .mockResolvedValueOnce(null); // conflict check
    vi.mocked(prisma.$transaction).mockResolvedValue([]);
    vi.mocked(sendEmailChangedNotification).mockResolvedValue(undefined);

    const res = await GET(makeReq({ token: 'test-uuid-1234', uid: 'user-1' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('emailChanged=1');
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
