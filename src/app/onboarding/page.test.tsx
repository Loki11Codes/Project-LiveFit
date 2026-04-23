import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OnboardingPage from "./page";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/client-api";

// Mock dependencies
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/lib/client-api", () => ({
  requestJson: vi.fn(),
}));

// Mock framer-motion
// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mock("framer-motion", () => {
  const motionProps = new Set([
    "initial", "animate", "exit", "variants", "custom",
    "whileHover", "whileTap", "whileInView", "whileFocus", "whileDrag",
    "transition", "layout", "layoutId", "suppressHydrationWarning",
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterProps = (props: Record<string, any>) => {
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props)) {
      if (!motionProps.has(k)) filtered[k] = v;
    }
    return filtered;
  };
  return {
    motion: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      div: ({ children, ...props }: any) => <div {...filterProps(props)}>{children}</div>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      button: ({ children, ...props }: any) => <button {...filterProps(props)}>{children}</button>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      span: ({ children, ...props }: any) => <span {...filterProps(props)}>{children}</span>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p: ({ children, ...props }: any) => <p {...filterProps(props)}>{children}</p>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      section: ({ children, ...props }: any) => <section {...filterProps(props)}>{children}</section>,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

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
    } as unknown as ReturnType<typeof useSession>);
  });

  describe("Tutorial Phase", () => {
    it("renders the first tutorial slide", () => {
      render(<OnboardingPage />);
      expect(screen.getByText("Real-time Metrics")).toBeInTheDocument();
      expect(screen.getByText(/Track your calories/i)).toBeInTheDocument();
    });

    it("navigates through tutorial slides", () => {
      render(<OnboardingPage />);
      
      const nextBtn = screen.getByRole("button", { name: /next/i });
      
      fireEvent.click(nextBtn);
      expect(screen.getByText("AI Fitness Coach")).toBeInTheDocument();
      
      fireEvent.click(nextBtn);
      expect(screen.getByText("Simplified Logging")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /start setup/i })).toBeInTheDocument();
    });

    it("allows skipping onboarding", async () => {
      vi.mocked(requestJson).mockResolvedValue({ success: true });
      render(<OnboardingPage />);
      
      const skipBtn = screen.getByRole("button", { name: /skip all/i });
      fireEvent.click(skipBtn);

      await waitFor(() => {
        expect(requestJson).toHaveBeenCalledWith("/api/auth/onboard", expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"age":25'),
        }));
      });
    });
  });

  describe("Profile Phase", () => {
    it("switches to profile phase after tutorial", () => {
      render(<OnboardingPage />);
      
      // Click 'Next' twice then 'Start Setup'
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      fireEvent.click(screen.getByRole("button", { name: /start setup/i }));

      expect(screen.getByText("Complete Your Profile")).toBeInTheDocument();
      expect(screen.getByText("Step 1: Bio-Data")).toBeInTheDocument();
    });

    it("allows filling out Bio-Data and moving to next step", async () => {
        render(<OnboardingPage />);
        // Skip tutorial to get to profile
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        fireEvent.click(screen.getByRole("button", { name: /start setup/i }));

        const ageInput = screen.getByLabelText(/age/i);
        const heightInput = screen.getByLabelText(/height/i);
        
        fireEvent.change(ageInput, { target: { value: "30" } });
        fireEvent.change(heightInput, { target: { value: "180" } });

        fireEvent.click(screen.getByRole("button", { name: /next/i }));

        expect(screen.getByText("Step 2: Objectives")).toBeInTheDocument();
    });

    it("prevents completion if fields are missing", async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        render(<OnboardingPage />);
        // Skip tutorial
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        fireEvent.click(screen.getByRole("button", { name: /start setup/i }));

        // Go to final step
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        fireEvent.click(screen.getByRole("button", { name: /next/i }));

        expect(screen.getByText("Step 3: Baseline")).toBeInTheDocument();
        
        fireEvent.click(screen.getByRole("button", { name: /complete setup/i }));
        
        expect(alertSpy).toHaveBeenCalledWith("Please enter values for Age, Height, and Weight.");
        alertSpy.mockRestore();
    });
  });
});
