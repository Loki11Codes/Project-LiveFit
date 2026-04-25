import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AppError from './error';
import { useRouter } from 'next/navigation';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

describe('AppError', () => {
  const mockReset = vi.fn();
  const mockError = new Error('Test error message');

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders error message and UI elements', () => {
    render(<AppError error={mockError} reset={mockReset} />);
    expect(screen.getByText(/Oops! Something broke/i)).toBeInTheDocument();
    expect(screen.getByText(/The fitness engine encountered an unexpected hurdle/i)).toBeInTheDocument();
  });

  it('calls reset when Try Again is clicked', () => {
    render(<AppError error={mockError} reset={mockReset} />);
    const tryAgainBtn = screen.getByText(/Try Again/i);
    fireEvent.click(tryAgainBtn);
    expect(mockReset).toHaveBeenCalled();
  });

  it('navigates to home when Back to Home is clicked', () => {
    const push = vi.fn();
    (useRouter as any).mockReturnValue({ push });
    
    render(<AppError error={mockError} reset={mockReset} />);
    const backHomeBtn = screen.getByText(/Back to Home/i);
    fireEvent.click(backHomeBtn);
    expect(push).toHaveBeenCalledWith('/');
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(<AppError error={mockError} reset={mockReset} />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });
});
