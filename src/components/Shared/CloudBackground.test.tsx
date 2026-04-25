import { render } from '@testing-library/react';
import { CloudBackground, Cloud } from './CloudBackground';
import { vi, describe, it, expect } from 'vitest';
import React from 'react';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, animate, transition, initial, style, ...props }: any) => {
      // Handle framer-motion scale shorthand for JSDOM style testing
      const finalStyle = { ...style };
      if (style?.scale !== undefined && !style.transform) {
        finalStyle.transform = `scale(${style.scale})`;
      }
      return (
        <div 
          {...props} 
          style={finalStyle}
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
});
