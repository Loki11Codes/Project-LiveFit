import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Loading from './loading';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) => <p {...props}>{children}</p>,
  },
}));

describe('Loading', () => {
  it('renders loading text', () => {
    render(<Loading />);
    expect(screen.getByText(/Caloriq is optimizing.../i)).toBeInTheDocument();
  });

  it('renders loading spinner containers', () => {
    const { container } = render(<Loading />);
    // Check if the spinner containers exist
    expect(container.querySelector('.w-20.h-20')).toBeInTheDocument();
    expect(container.querySelector('.w-10.h-10')).toBeInTheDocument();
  });
});
