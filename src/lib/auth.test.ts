import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CredentialsConfig } from 'next-auth/providers/credentials';
import type { User } from '@prisma/client';
import type { RequestInternal, Awaitable, Session, User as AuthUser } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

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
  capturedAuthorize: null as unknown as CredentialsConfig['authorize']
}));

vi.mock('next-auth/providers/credentials', () => ({
  default: (options: CredentialsConfig) => {
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
      await expect(mocks.capturedAuthorize!(undefined, {} as RequestInternal)).rejects.toThrow('Please enter both email and password');
      await expect(mocks.capturedAuthorize!({ email: 'test@test.com' } as unknown as Record<string, string>, {} as RequestInternal)).rejects.toThrow('Please enter both email and password');
    });

    it('throws error if user not found or no password', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      await expect(mocks.capturedAuthorize!({ email: 'test@test.com', password: TEST_VALID_SECRET }, {} as RequestInternal)).rejects.toThrow('No user found with this email');
      
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ email: 'test@test.com' } as unknown as User);
      await expect(mocks.capturedAuthorize!({ email: 'test@test.com', password: TEST_VALID_SECRET }, {} as RequestInternal)).rejects.toThrow('No user found with this email');
    });

    it('throws error if password invalid', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ 
        email: 'test@test.com', 
        password: TEST_HASH 
      } as unknown as User);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

      await expect(mocks.capturedAuthorize!({ email: 'test@test.com', password: TEST_INVALID_SECRET }, {} as RequestInternal)).rejects.toThrow('Invalid password');
    });

    it('returns user if valid', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@test.com',
        name: 'Test',
        image: 'img.png',
        password: TEST_HASH
      };
      
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as unknown as User);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

      const result = await mocks.capturedAuthorize!({ email: 'test@test.com', password: TEST_VALID_SECRET }, {} as RequestInternal);
      expect(result).toEqual({
        id: 'u1',
        email: 'test@test.com',
        name: 'Test',
        image: 'img.png',
        requirePasswordChange: false,
        onboarded: false,
        hasSeenTutorial: false,
        emailVerified: undefined
      });
    });
  });

  describe('Callbacks', () => {
    it('jwt returns token with user id and requirePasswordChange', async () => {
      const jwtCb = authOptions.callbacks?.jwt as (args: { token: JWT, user?: AuthUser & { requirePasswordChange?: boolean } }) => Awaitable<JWT>;
      const result = await jwtCb({ token: { orig: true }, user: { id: 'user123', requirePasswordChange: true } as AuthUser & { requirePasswordChange: boolean }});
      expect(result).toEqual({ orig: true, id: 'user123', requirePasswordChange: true });
      
      const noUserResult = await jwtCb({ token: { orig: true }});
      expect(noUserResult).toEqual({ orig: true });
    });

    it('jwt handles session update trigger for multiple properties', async () => {
      const jwtCb = authOptions.callbacks?.jwt as (args: { token: JWT, trigger?: string, session?: { onboarded?: boolean, emailVerified?: Date | string } }) => Awaitable<JWT>;
      const result = await jwtCb({ 
        token: { id: 'u1' }, 
        trigger: 'update', 
        session: { onboarded: true, emailVerified: '2024-01-01' } 
      });
      expect(result.onboarded).toBe(true);
      expect(result.emailVerified).toBe('2024-01-01');
    });

    it('session returns session with user id, requirePasswordChange and onboarded', async () => {
      const sessionCb = authOptions.callbacks?.session as (args: { session: Session, token: JWT }) => Awaitable<Session>;
      const result = await sessionCb({ 
        session: { user: {} } as Session, 
        token: { id: 'u123', requirePasswordChange: false, onboarded: true } as JWT
      });
      
      const user = result.user as AuthUser & { id: string, requirePasswordChange: boolean, onboarded: boolean };
      expect(user.id).toBe('u123');
      expect(user.requirePasswordChange).toBe(false);
      expect(user.onboarded).toBe(true);
    });

    it('session handles emailVerified and image in token', async () => {
       const sessionCb = authOptions.callbacks?.session as (args: { session: Session, token: JWT }) => Awaitable<Session>;
        const result = await sessionCb({
          session: { user: {} } as Session,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          token: { id: 'u1', emailVerified: '2024-01-01', picture: 'new-img.png' } as any
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = result.user as any;
        expect(user.emailVerified).toBe('2024-01-01');
       expect(result.user?.image).toBe('new-img.png');
    });
  });
});
