import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RootLayout from './layout';

// Mock fonts
vi.mock('next/font/google', () => ({
  Work_Sans: () => ({
    className: 'mock-work-sans',
  }),
}));

// Mock components
vi.mock('@/components/Providers', () => ({
  Providers: ({ children }: { children: React.ReactNode }) => <div data-testid="providers">{children}</div>,
}));

vi.mock('@/components/Shared/CloudBackground', () => ({
  CloudBackground: () => <div data-testid="cloud-background" />,
}));

vi.mock('@/components/auth/AuthGuardian', () => ({
  AuthGuardian: () => <div data-testid="auth-guardian" />,
}));

describe('RootLayout', () => {
  it('renders layout structure with children', () => {
    const { getByTestId, getByText } = render(
      <RootLayout>
        <div data-testid="test-child">Content</div>
      </RootLayout>
    );

    expect(getByTestId('providers')).toBeInTheDocument();
    expect(getByTestId('auth-guardian')).toBeInTheDocument();
    expect(getByTestId('cloud-background')).toBeInTheDocument();
    expect(getByTestId('test-child')).toBeInTheDocument();
    expect(getByText('Content')).toBeInTheDocument();
  });

  it('renders auth guardian and background', () => {
    const { getByTestId } = render(
      <RootLayout>
        <div />
      </RootLayout>
    );

    expect(getByTestId('auth-guardian')).toBeInTheDocument();
    expect(getByTestId('cloud-background')).toBeInTheDocument();
  });
});
