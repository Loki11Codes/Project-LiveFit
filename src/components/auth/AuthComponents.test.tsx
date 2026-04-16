/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AuthInput } from './AuthInput';
import { Mail, Eye } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { FitnessIllustration } from './FitnessIllustration';
import { NutritionIllustration } from './NutritionIllustration';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    path: (props: any) => <path {...props} />,
    circle: (props: any) => <circle {...props} />,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    rect: (props: any) => <rect {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Auth Utility Components', () => {
  afterEach(cleanup);

  describe('AuthShell', () => {
    const defaultProps = {
      badge: 'Welcome',
      title: 'Sign In',
      subtitle: 'Enter your details',
      panelTitle: 'Features',
      panelDescription: 'Check these out',
      panelPoints: ['Point 1', 'Point 2'],
      children: <div data-testid="auth-child">Child</div>,
      bottomText: 'No account?',
      bottomLinkLabel: 'Sign Up',
      bottomLinkHref: '/signup',
    };

    it('renders all required text props', () => {
      render(<AuthShell {...defaultProps} />);
      expect(screen.getByText('Sign In')).toBeDefined();
      expect(screen.getByText('Enter your details')).toBeDefined();
      expect(screen.getAllByText('Welcome')).toHaveLength(2); // In badge and panel
      expect(screen.getByText('Point 1')).toBeDefined();
      expect(screen.getByText('No account?')).toBeDefined();
    });

    it('renders children and optional illustration', () => {
      const illustration = <div data-testid="mock-illustration" />;
      render(<AuthShell {...defaultProps} illustration={illustration} />);
      expect(screen.getByTestId('auth-child')).toBeDefined();
      expect(screen.getByTestId('mock-illustration')).toBeDefined();
    });

    it('renders back link correctly', () => {
      render(<AuthShell {...defaultProps} />);
      const backLink = screen.getByText(/back to dashboard/i);
      expect(backLink.getAttribute('href')).toBe('/');
    });
  });

  describe('FitnessIllustration', () => {
    it('renders svg and paths', () => {
      const { container } = render(<FitnessIllustration />);
      expect(container.querySelector('svg')).toBeDefined();
      expect(container.querySelector('path')).toBeDefined();
    });
  });

  describe('NutritionIllustration', () => {
    it('renders svg and motion elements', () => {
      const { container } = render(<NutritionIllustration />);
      expect(container.querySelector('svg')).toBeDefined();
      // Should have circles for progress rings and apple body
      expect(container.querySelectorAll('circle').length).toBeGreaterThan(0);
    });
  });

  // ── AuthInput ────────────────────────────────────────────────────────────────
  describe('AuthInput', () => {
    it('renders an input element with the icon', () => {
      const { container } = render(<AuthInput icon={Mail} placeholder="Email" />);
      expect(container.querySelector('input')).toBeInTheDocument();
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('forwards standard input props (placeholder, type)', () => {
      render(<AuthInput icon={Mail} placeholder="Enter email" type="email" />);
      const input = screen.getByPlaceholderText('Enter email');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders rightElement when provided', () => {
      render(
        <AuthInput
          icon={Mail}
          placeholder="Password"
          rightElement={<button data-testid="toggle-btn"><Eye size={16} /></button>}
        />
      );
      expect(screen.getByTestId('toggle-btn')).toBeInTheDocument();
    });

    it('applies error border class when error prop is true', () => {
      render(<AuthInput icon={Mail} placeholder="Email" error />);
      const input = screen.getByPlaceholderText('Email');
      expect(input.className).toContain('border-rose-400');
    });

    it('does not apply error border class when error prop is false', () => {
      render(<AuthInput icon={Mail} placeholder="Email" error={false} />);
      const input = screen.getByPlaceholderText('Email');
      expect(input.className).not.toContain('border-rose-400');
    });

    it('propagates disabled prop to the input', () => {
      render(<AuthInput icon={Mail} placeholder="Email" disabled />);
      expect(screen.getByPlaceholderText('Email')).toBeDisabled();
    });
  });
});

