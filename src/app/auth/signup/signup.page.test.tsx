import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignUp from './page';
import { useRouter } from 'next/navigation';
import { requestJson } from '@/lib/client-api';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

vi.mock('@/lib/client-api', () => ({
  requestJson: vi.fn(),
  getClientErrorMessage: vi.fn((err) => err.message || 'Error'),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>, // eslint-disable-line @typescript-eslint/no-explicit-any
  },
}));

vi.mock('lucide-react', () => ({
  User: () => <div data-testid="icon-user" />,
  Mail: () => <div data-testid="icon-mail" />,
  Lock: () => <div data-testid="icon-lock" />,
  Eye: () => <div data-testid="icon-eye" />,
  EyeOff: () => <div data-testid="icon-eye-off" />,
  Loader2: () => <div data-testid="icon-loader" />,
  UserPlus: () => <div data-testid="icon-user-plus" />,
  CheckCircle2: () => <div data-testid="icon-check" />,
}));

vi.mock('@/components/auth/AuthShell', () => ({
  AuthShell: ({ children }: any) => <div data-testid="auth-shell">{children}</div>, // eslint-disable-line @typescript-eslint/no-explicit-any
}));

vi.mock('@/components/auth/GoogleMark', () => ({
  GoogleMark: () => <div data-testid="google-mark" />,
}));

vi.mock('@/components/auth/NutritionIllustration', () => ({
  NutritionIllustration: () => <div data-testid="nutrition-ill" />,
}));

describe('SignUp Component', () => {
  const mockRouter = { push: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it('renders sign up form correctly', () => {
    render(<SignUp />);
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    // Use exact match to avoid "Confirm Password"
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
  });

  it('shows password matching feedback', () => {
    render(<SignUp />);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);

    fireEvent.change(passwordInput, { target: { value: 'Pass123' } });
    fireEvent.change(confirmInput, { target: { value: 'Pass123' } });

    // Should show checkmark icon
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  it('handles signup submission success', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({ message: 'Success' });
    
    render(<SignUp />);
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Pass123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'Pass123' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(requestJson).toHaveBeenCalledWith('/api/auth/signup', expect.objectContaining({
        method: 'POST',
      }));
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/signin?success=1');
    });
  });

  it('shows error if passwords do not match on submit', async () => {
    render(<SignUp />);
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Pass123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'Mismatch' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passwords don't match/i)).toBeInTheDocument();
    });
  });

  it('handles signup submission failure', async () => {
    vi.mocked(requestJson).mockRejectedValueOnce(new Error('Email taken'));
    
    render(<SignUp />);
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Pass123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'Pass123' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email taken/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    render(<SignUp />);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    // Find toggle buttons - they are the ones with no accessible name in our mock
    const buttons = screen.getAllByRole('button');
    const toggle = buttons.find(b => !b.textContent && (b as any).type !== 'submit'); // eslint-disable-line @typescript-eslint/no-explicit-any
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    if (toggle) fireEvent.click(toggle);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
