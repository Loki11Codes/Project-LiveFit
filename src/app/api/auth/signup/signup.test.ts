import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(() => Promise.resolve('hashed_password')),
  },
}));

describe('Signup API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new user with valid data', async () => {
    const payload = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u1', email: payload.email } as any);

    const req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toContain('User created');
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('returns 409 if email already exists', async () => {
    const payload = {
      name: 'Test User',
      email: 'existing@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing' } as any);

    const req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('An account with this email already exists');
  });

  it('returns 400 for invalid data (passwords mismatch)', async () => {
    const payload = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'mismatch',
    };

    const req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 500 if database fails', async () => {
    const payload = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(new Error('DB Error'));

    const req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
