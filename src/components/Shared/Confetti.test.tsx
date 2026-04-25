import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfettiCanvas } from './Confetti';

describe('ConfettiCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    Object.defineProperty(window, 'innerHeight', { value: 768 });
    
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
    
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockContext as any);
    
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
     // This is tricky as ref is assigned by React, but we can test the effect's guard
     // Line 21: if (!canvas) return;
     // We can't easily force ref to be null while rendering, but we can verify it doesn't crash
     render(<ConfettiCanvas />);
  });
});
