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
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);
  });

  it('does nothing if status is loading', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'loading', update: vi.fn() } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    render(<AuthGuardian />);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects to reset-password if requirePasswordChange is true', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'u1', requirePasswordChange: true } },
      status: 'authenticated',
      update: vi.fn(),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
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
      update: vi.fn(),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
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
      update: vi.fn(),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
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
      update: vi.fn(),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    vi.mocked(usePathname).mockReturnValue('/');

    render(<AuthGuardian />);
    
    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('does NOT redirect to reset-password if already on that path', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'u1', requirePasswordChange: true } },
      status: 'authenticated',
      update: vi.fn(),
    } as any);
    vi.mocked(usePathname).mockReturnValue('/auth/reset-password');
    render(<AuthGuardian />);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does NOT redirect to verify if already on that path', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'u1', emailVerified: null } },
      status: 'authenticated',
      update: vi.fn(),
    } as any);
    vi.mocked(usePathname).mockReturnValue('/auth/verify');
    render(<AuthGuardian />);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does NOT redirect to onboarding if already on that path', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'u1', emailVerified: new Date(), onboarded: false } },
      status: 'authenticated',
      update: vi.fn(),
    } as any);
    vi.mocked(usePathname).mockReturnValue('/onboarding');
    render(<AuthGuardian />);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

