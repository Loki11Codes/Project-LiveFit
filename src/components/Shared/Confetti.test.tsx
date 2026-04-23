import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfettiCanvas } from "./Confetti";

describe("ConfettiCanvas Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock canvas methods
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
      restore: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    }) as any;

    // Mock requestAnimationFrame
    vi.stubGlobal("requestAnimationFrame", vi.fn((cb) => setTimeout(cb, 1)));
    vi.stubGlobal("cancelAnimationFrame", vi.fn((id) => clearTimeout(id)));
  });

  it("renders canvas and starts animation", async () => {
    const { unmount } = render(<ConfettiCanvas />);
    const canvas = document.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
    
    // Let animation run a bit
    await new Promise((resolve) => setTimeout(resolve, 50));
    unmount();
  });

  it("handles window resize", () => {
    render(<ConfettiCanvas />);
    fireEvent.resize(window);
  });
});
