import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VerifyEmailPage from './page';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { requestJson } from '@/lib/client-api';

// Mock dependencies
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('@/lib/client-api', () => ({
  requestJson: vi.fn(),
  getClientErrorMessage: vi.fn((err) => err instanceof Error ? err.message : 'Error'),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Loader2: () => <div data-testid="loader" />,
    ShieldCheck: () => <div data-testid="shield-check" />,
  };
});

describe('VerifyEmailPage', () => {
  const mockPush = vi.fn();
  const mockGet = vi.fn();
  const mockUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as unknown).mockReturnValue({ push: mockPush, refresh: vi.fn() });
    (useSearchParams as unknown).mockReturnValue({ get: mockGet });
    (useSession as unknown).mockReturnValue({ 
      data: { user: { email: 'test@example.com' } }, 
      status: 'authenticated',
      update: mockUpdate
    });
  });

  it('renders the verification form', () => {
    render(<VerifyEmailPage />);
    expect(screen.getByText(/Verify your identity/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
  });

  it('handles code input and formatting', () => {
    render(<VerifyEmailPage />);
    const input = screen.getByPlaceholderText('000000') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '123abc456' } });
    expect(input.value).toBe('123456');
  });

  it('shows loading state during submission', async () => {
    vi.mocked(requestJson).mockReturnValue(new Promise(() => {})); // Never resolves
    render(<VerifyEmailPage />);
    
    const input = screen.getByPlaceholderText('000000');
    fireEvent.change(input, { target: { value: '123456' } });
    
    // Submit btn is disabled if code is not 6 chars. 
    // Here code is 6 chars.
    const submitBtn = screen.getByRole('button', { name: /Verify/i });
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.getByText('Verifying...')).toBeInTheDocument();
    });
  });

  it('shows success state on valid code', async () => {
    vi.mocked(requestJson).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));
    
    render(<VerifyEmailPage />);
    const input = screen.getByPlaceholderText('000000');
    
    await act(async () => {
      fireEvent.change(input, { target: { value: '123456' } });
    });
    
    // Should show loading state first
    await waitFor(() => {
      expect(screen.getByText(/Verifying/i)).toBeInTheDocument();
    });

    // Then success state
    await waitFor(() => {
      expect(screen.getByText('Verified')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Should update session and redirect
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    }, { timeout: 4000 });
  });

  it('shows error state on invalid code', async () => {
    vi.mocked(requestJson).mockRejectedValue(new Error('Invalid code'));
    
    render(<VerifyEmailPage />);
    const input = screen.getByPlaceholderText('000000');
    
    await act(async () => {
      fireEvent.change(input, { target: { value: '123456' } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Invalid code')).toBeInTheDocument();
    });
  });






  it('handles signOut on "Try a different email"', () => {
    render(<VerifyEmailPage />);
    const signOutBtn = screen.getByText(/Try a different email/i);
    fireEvent.click(signOutBtn);
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/auth/signin' });
  });
});

