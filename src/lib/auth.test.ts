/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

const mocks = vi.hoisted(() => ({
  capturedAuthorize: null as any
}));

vi.mock('next-auth/providers/credentials', () => ({
  default: (options: any) => {
    mocks.capturedAuthorize = options.authorize;
    return { id: 'credentials', name: 'Email and Password' };
  }
}));

// Force import order so mock captures the options
import { authOptions } from './auth';

describe('Auth Options', () => {
  const TEST_VALID_SECRET = 'secret-val-1';
  const TEST_HASH = 'hashed-password-123';
  const TEST_INVALID_SECRET = 'secret-val-2';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CredentialsProvider Authorize', () => {
    it('throws error if credentials missing', async () => {
      await expect(mocks.capturedAuthorize(null)).rejects.toThrow('Please enter both email and password');
      await expect(mocks.capturedAuthorize({ email: 'test@test.com' })).rejects.toThrow('Please enter both email and password');
    });

    it('throws error if user not found or no password', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      await expect(mocks.capturedAuthorize({ email: 'test@test.com', password: TEST_VALID_SECRET })).rejects.toThrow('No user found with this email');
      
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ email: 'test@test.com' } as any);
      await expect(mocks.capturedAuthorize({ email: 'test@test.com', password: TEST_VALID_SECRET })).rejects.toThrow('No user found with this email');
    });

    it('throws error if password invalid', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ 
        email: 'test@test.com', 
        password: TEST_HASH 
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

      await expect(mocks.capturedAuthorize({ email: 'test@test.com', password: TEST_INVALID_SECRET })).rejects.toThrow('Invalid password');
    });

    it('returns user if valid', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@test.com',
        name: 'Test',
        image: 'img.png',
        password: TEST_HASH
      };
      
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as any);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

      const result = await mocks.capturedAuthorize({ email: 'test@test.com', password: TEST_VALID_SECRET });
      expect(result).toEqual({
        id: 'u1',
        email: 'test@test.com',
        name: 'Test',
        image: 'img.png'
      });
    });
  });

  describe('Callbacks', () => {
    it('jwt returns token with user id and requirePasswordChange', async () => {
      const jwtCb = authOptions.callbacks?.jwt as any;
      const result = await jwtCb({ token: { orig: true }, user: { id: 'user123', requirePasswordChange: true }});
      expect(result).toEqual({ orig: true, id: 'user123', requirePasswordChange: true });
      
      const noUserResult = await jwtCb({ token: { orig: true }});
      expect(noUserResult).toEqual({ orig: true });
    });

    it('jwt handles session update trigger', async () => {
      const jwtCb = authOptions.callbacks?.jwt as any;
      const token = { id: 'u1', requirePasswordChange: true };
      const session = { requirePasswordChange: false };
      const result = await jwtCb({ token, trigger: "update", session });
      expect(result.requirePasswordChange).toBe(false);
    });

    it('session maps token id and fetches latest status from DB', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'tid', requirePasswordChange: false } as any);
      const sessionCb = authOptions.callbacks?.session as any;
      const session = { user: { name: 'hi' } };
      const token = { id: 'tid', requirePasswordChange: true }; // Token is stale
      const result = await sessionCb({ session, token });
      
      expect(result.user.id).toBe('tid');
      expect(result.user.requirePasswordChange).toBe(false); // Should match DB, not token
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'tid' },
        select: { id: true, requirePasswordChange: true }
      });
    });
  });
});
