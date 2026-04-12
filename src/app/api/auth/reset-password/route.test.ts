import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import bcrypt from 'bcryptjs';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      update: vi.fn(),
    },
  },
}));

describe('Auth Reset Password API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 (Unauthorized) if not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = new Request('http://localhost/api/auth/reset-password', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if password does not meet security requirements', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any);
    const req = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password: 'short' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/security requirements/i);
  });

  it('updates password successfully on valid input', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any);
    const validPassword = 'StrongPassword123!';
    
    const req = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password: validPassword }),
    });
    
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/updated successfully/i);
    expect(bcrypt.hash).toHaveBeenCalledWith(validPassword, 10);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: expect.objectContaining({ password: 'hashed-password' }),
    }));
  });
});
