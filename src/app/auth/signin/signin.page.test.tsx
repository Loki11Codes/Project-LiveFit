import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import SignIn from './page';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
  useSearchParams: vi.fn(() => ({ get: vi.fn() })),
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  useSession: vi.fn(() => ({ data: null })),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('lucide-react', () => ({
  Mail: () => <div data-testid="icon-mail" />,
  Lock: () => <div data-testid="icon-lock" />,
  Eye: () => <div data-testid="icon-eye" />,
  EyeOff: () => <div data-testid="icon-eye-off" />,
  Loader2: () => <div data-testid="icon-loader" />,
  LogIn: () => <div data-testid="icon-login" />,
}));

vi.mock('@/components/auth/AuthShell', () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-shell">{children}</div>,
}));

vi.mock('@/components/auth/GoogleMark', () => ({
  GoogleMark: () => <div data-testid="google-mark" />,
}));

vi.mock('@/components/auth/FitnessIllustration', () => ({
  FitnessIllustration: () => <div data-testid="fitness-ill" />,
}));

describe('SignIn Component', () => {
  it('renders sign in form', () => {
    render(<SignIn />);
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it('handles credentials sign in', async () => {
    vi.mocked(signIn).mockResolvedValueOnce({ error: null, ok: true, status: 200, url: '/' });
    
    render(<SignIn />);
    const testAuthSecret = 't3st_S3cr3t_vAlu3';
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: testAuthSecret } });

    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', expect.objectContaining({
        email: 'test@example.com',
        password: testAuthSecret,
      }));
    });
  });

  it('shows success message when redirected from signup', () => {
    vi.mocked(useSearchParams).mockReturnValue({ get: vi.fn((key) => key === 'success' ? '1' : null) } as unknown as ReturnType<typeof useSearchParams>);
    render(<SignIn />);
    expect(screen.getByText(/Account created successfully/i)).toBeInTheDocument();
  });

  it('shows error when signIn fails', async () => {
    vi.mocked(signIn).mockResolvedValueOnce({ error: 'Invalid credentials', ok: false, status: 401, url: '' });
    
    render(<SignIn />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong' } });

    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    render(<SignIn />);
    const passwordInput = screen.getByLabelText(/Password/i);
    const toggle = screen.getByTestId('icon-eye').parentElement;
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    if (toggle) fireEvent.click(toggle);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('handles unexpected errors during signIn', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(signIn).mockRejectedValueOnce(new Error('Network failure'));
    
    render(<SignIn />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pass' } });

    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

    await waitFor(() => {
      expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
    });
    vi.restoreAllMocks();
  });

  it('handles Google sign in', () => {
    render(<SignIn />);
    const googleBtn = screen.getByRole('button', { name: /Google Sign In/i });
    fireEvent.click(googleBtn);
    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/' });
  });
});

