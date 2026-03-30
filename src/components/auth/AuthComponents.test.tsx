import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AuthShell } from './AuthShell';
import { FitnessIllustration } from './FitnessIllustration';
import { NutritionIllustration } from './NutritionIllustration';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: unknown) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: unknown) => <section {...props}>{children}</section>,
    path: (props: unknown) => <path {...props} />,
    circle: (props: unknown) => <circle {...props} />,
    g: ({ children, ...props }: unknown) => <g {...props}>{children}</g>,
    rect: (props: unknown) => <rect {...props} />,
  },
  AnimatePresence: ({ children }: unknown) => <>{children}</>,
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
});
