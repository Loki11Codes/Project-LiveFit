import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { AuthGuardian } from './AuthGuardian';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

describe('AuthGuardian Component', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
  });

  it('does nothing if status is loading', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'loading' } as any);
    render(<AuthGuardian />);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects to reset-password if requirePasswordChange is true', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'u1', requirePasswordChange: true } },
      status: 'authenticated',
    } as any);
    vi.mocked(usePathname).mockReturnValue('/');

    render(<AuthGuardian />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/reset-password');
    });
  });

  it('redirects to verify if email is not verified', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'u1', emailVerified: null } },
      status: 'authenticated',
    } as any);
    vi.mocked(usePathname).mockReturnValue('/');

    render(<AuthGuardian />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/verify');
    });
  });

  it('redirects to onboarding if onboarded is false', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'u1', emailVerified: new Date(), onboarded: false } },
      status: 'authenticated',
    } as any);
    vi.mocked(usePathname).mockReturnValue('/');

    render(<AuthGuardian />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('stay on current path if everything is valid', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'u1', emailVerified: new Date(), onboarded: true, requirePasswordChange: false } },
      status: 'authenticated',
    } as any);
    vi.mocked(usePathname).mockReturnValue('/');

    render(<AuthGuardian />);
    
    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
