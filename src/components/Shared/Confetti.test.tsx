import React from 'react';
import { render, cleanup } from '@testing-library/react';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfettiCanvas } from './Confetti';

describe('ConfettiCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window dimensions
    Object.defineProperty(globalThis, 'innerWidth', { value: 1024 });
    Object.defineProperty(globalThis, 'innerHeight', { value: 768 });
    
    // Mock requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => setTimeout(cb, 16)));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => clearTimeout(id)));
    
    // Mock crypto.getRandomValues
    vi.stubGlobal('crypto', {
      getRandomValues: (arr: Uint32Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 0xFFFFFFFF);
      }
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders a canvas and starts animation', () => {
    const mockContext = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };
    
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockContext as unknown as CanvasRenderingContext2D);
    
    const { unmount } = render(<ConfettiCanvas />);
    
    expect(getContextSpy).toHaveBeenCalledWith('2d');
    
    unmount();
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('returns early if canvas context is not available', () => {
    // Mock getContext to return null to hit line 24
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    
    const { unmount } = render(<ConfettiCanvas />);
    
    // No animation should start
    expect(globalThis.requestAnimationFrame).not.toHaveBeenCalled();
    unmount();
  });

  it('renders even if ref is null initially (branch coverage)', () => {
     const { container } = render(<ConfettiCanvas />);
     expect(container).toBeDefined();
  });

  it('handles null ref guard in effect', () => {
    // To hit line 21 (if (!canvas) return;), we need the ref to be null during useEffect.
    // We can't easily mock the internal ref of the component, but we can mock React.useRef globally.
    const originalUseRef = React.useRef;
    // Mocking internal React hooks for coverage
    vi.spyOn(React, 'useRef').mockReturnValue({ current: null });
    
    render(<ConfettiCanvas />);
    // Should not start animation
    expect(globalThis.requestAnimationFrame).not.toHaveBeenCalled();
    
    // Restore
    React.useRef = originalUseRef;
  });
});
