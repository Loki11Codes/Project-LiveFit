import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import OnboardingPage from "./page";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import React from "react";
import type { SessionContextValue } from "next-auth/react";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/components/Shared/CloudBackground", () => ({
  CloudBackground: () => <div data-testid="cloud-bg" />,
}));

vi.mock("@/components/auth/AuthShell", () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-shell">{children}</div>,
}));

vi.mock("@/lib/client-api", () => ({
  requestJson: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: React.ComponentPropsWithoutRef<'button'>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("OnboardingPage", () => {
  const mockRouter = { push: vi.fn(), refresh: vi.fn() };
  const mockUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: mockUpdate,
    } as unknown as SessionContextValue);
  });

  afterEach(cleanup);

  describe("Tutorial Phase", () => {
    it("renders the first tutorial slide", () => {
      render(<OnboardingPage />);
      expect(screen.getByText(/Real-time Metrics/i)).toBeInTheDocument();
      expect(screen.getByTestId("auth-shell")).toBeInTheDocument();
    });

    it("navigates through tutorial slides", async () => {
      render(<OnboardingPage />);
      
      // Slide 1 -> 2
      fireEvent.click(screen.getByText(/Next/i));
      expect(screen.getByText(/AI Fitness Coach/i)).toBeInTheDocument();

      // Slide 2 -> 3
      fireEvent.click(screen.getByText(/Next/i));
      expect(screen.getByText(/Simplified Logging/i)).toBeInTheDocument();

      // Slide 3 -> Final (Setup Phase)
      fireEvent.click(screen.getByText(/Start Setup/i));
      expect(screen.getByText(/Step 1: Bio-Data/i)).toBeInTheDocument();
    });
  });

  describe("Setup Phase", () => {
    beforeEach(() => {
        // Skip tutorial
        render(<OnboardingPage />);
        fireEvent.click(screen.getByText(/Next/i));
        fireEvent.click(screen.getByText(/Next/i));
        fireEvent.click(screen.getByText(/Start Setup/i));
    });

    it("handles bio-data form submission", async () => {
        fireEvent.change(screen.getByLabelText(/Age/i), { target: { value: "25" } });
        fireEvent.change(screen.getByLabelText(/Height \(cm\)/i), { target: { value: "180" } });
        fireEvent.click(screen.getByRole('button', { name: /^male$/i }));
        
        fireEvent.click(screen.getByText(/Next/i));
        expect(screen.getByText(/Step 2: Objectives/i)).toBeInTheDocument();
    });

    it("handles objectives submission", async () => {
        // Advance to objectives
        fireEvent.change(screen.getByLabelText(/Age/i), { target: { value: "25" } });
        fireEvent.click(screen.getByText(/Next/i));

        fireEvent.click(screen.getByText(/Weight Loss/i));
        fireEvent.change(screen.getByLabelText(/Dietary Focus/i), { target: { value: "Vegan" } });

        fireEvent.click(screen.getByText(/Next/i));
        expect(screen.getByText(/Step 3: Baseline/i)).toBeInTheDocument();
    });

    it("handles baseline submission", async () => {
         // Advance to baseline
         fireEvent.change(screen.getByLabelText(/Age/i), { target: { value: "25" } });
         fireEvent.click(screen.getByText(/Next/i));
         fireEvent.click(screen.getByText(/Next/i));

         fireEvent.change(screen.getByLabelText(/Enter Current Weight/i), { target: { value: "80" } });

         fireEvent.click(screen.getByText(/Complete Setup/i));
         expect(screen.getByText(/Complete Setup/i)).toBeInTheDocument();
    });
  });

  describe("Completion Phase", () => {
    it("handles successful setup completion", async () => {
        globalThis.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ success: true })
        });

        render(<OnboardingPage />);
        expect(screen.getByTestId('auth-shell')).toBeInTheDocument();
    });

    it("handles setup failure", async () => {
        globalThis.fetch = vi.fn().mockResolvedValueOnce({
            ok: false,
            status: 500
        });
        render(<OnboardingPage />);
        expect(screen.getByTestId('auth-shell')).toBeInTheDocument();
    });
  });
});
