import { render } from '@testing-library/react';
import { CloudBackground, Cloud } from './CloudBackground';
import { vi, describe, it, expect } from 'vitest';
import React from 'react';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, animate, transition, initial, style, ...props }: React.ComponentPropsWithoutRef<'div'> & { animate?: unknown; transition?: unknown; initial?: unknown }) => {
      const finalStyle = { ...style } as React.CSSProperties;
      const s = style as Record<string, unknown>;
      if (s?.scale !== undefined && !s.transform) {
        finalStyle.transform = `scale(${s.scale})`;
      }
      return (
        <div 
          {...props} 
          style={finalStyle}
          data-initial={JSON.stringify(initial)}
          data-animate={JSON.stringify(animate)} 
          data-transition={JSON.stringify(transition)}
        >
          {children}
        </div>
      );
    },
  },
}));

describe('CloudBackground', () => {
  it('renders without crashing', () => {
    const { container } = render(<CloudBackground />);
    expect(container.firstChild).toBeDefined();
    // Check that it renders 4 clouds (as per lines 13-46)
    // Each cloud is a motion.div which we mock as a div with data-animate
    const clouds = container.querySelectorAll('[data-animate]');
    expect(clouds.length).toBe(4);
  });


  it('renders internal Cloud component with default parameters', () => {
    const { container } = render(<Cloud />);
    const cloudDiv = container.firstChild as HTMLElement;
    
    // Check that default transition duration is 40 (line 56)
    const transition = JSON.parse(cloudDiv.getAttribute('data-transition') || '{}');
    expect(transition.duration).toBe(40);
    
    // Check default style values (lines 57-60)
    expect(cloudDiv.style.top).toBe('20%');
    expect(cloudDiv.style.left).toBe('0%');
    expect(cloudDiv.style.transform).toContain('scale(1)');
  });

  it('renders Cloud with reverse prop', () => {
    const { container } = render(<Cloud reverse />);
    const cloudDiv = container.firstChild as HTMLElement;
    
    // Check initial and animate values for reverse=true
    const initial = JSON.parse(cloudDiv.getAttribute('data-initial') || '{}');
    const animate = JSON.parse(cloudDiv.getAttribute('data-animate') || '{}');
    
    expect(initial.x).toBe('10vw');
    expect(animate.x).toBe('-110vw');
  });
});

