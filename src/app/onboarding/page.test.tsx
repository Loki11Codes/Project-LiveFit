import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OnboardingPage from "./page";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/client-api";
import React from "react";

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
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("OnboardingPage", () => {
  const mockRouter = { push: vi.fn(), refresh: vi.fn() };
  const mockUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: mockUpdate,
    } as any);
  });

  describe("Tutorial Phase", () => {
    it("renders the first tutorial slide", () => {
      render(<OnboardingPage />);
      expect(screen.getByText("Real-time Metrics")).toBeInTheDocument();
    });

    it("navigates through tutorial slides", () => {
      render(<OnboardingPage />);
      const nextBtn = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextBtn);
      expect(screen.getByText("AI Fitness Coach")).toBeInTheDocument();
      fireEvent.click(nextBtn);
      expect(screen.getByText("Simplified Logging")).toBeInTheDocument();
    });

    it("allows skipping onboarding", async () => {
      vi.mocked(requestJson).mockResolvedValue({ success: true });
      render(<OnboardingPage />);
      const skipBtn = screen.getByRole("button", { name: /skip all/i });
      fireEvent.click(skipBtn);

      await waitFor(() => {
        expect(requestJson).toHaveBeenCalledWith("/api/auth/onboard", expect.anything());
        expect(mockUpdate).toHaveBeenCalled();
        expect(mockRouter.push).toHaveBeenCalledWith("/");
      });
    });

    it("handles skip failure", async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(requestJson).mockRejectedValue(new Error("Skip failed"));
        render(<OnboardingPage />);
        fireEvent.click(screen.getByRole("button", { name: /skip all/i }));
        await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
        consoleSpy.mockRestore();
    });
  });

  describe("Profile Phase", () => {
    beforeEach(() => {
        // Skip tutorial for these tests
    });

    it("handles all steps and form inputs", async () => {
      render(<OnboardingPage />);
      // Get to profile phase
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      fireEvent.click(screen.getByRole("button", { name: /start setup/i }));

      // Step 1: Bio-Data
      fireEvent.click(screen.getByText("female"));
      fireEvent.click(screen.getByText("Others"));
      const customGender = screen.getByPlaceholderText("How do you identify?");
      fireEvent.change(customGender, { target: { value: "Non-binary" } });
      
      fireEvent.change(screen.getByLabelText(/age/i), { target: { value: "25" } });
      fireEvent.change(screen.getByLabelText(/height/i), { target: { value: "175" } });
      fireEvent.change(screen.getByLabelText(/activity level/i), { target: { value: "Very Active" } });

      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      // Step 2: Objectives
      expect(screen.getByText("Step 2: Objectives")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Weight Loss"));
      fireEvent.change(screen.getByLabelText(/dietary focus/i), { target: { value: "Keto" } });

      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      // Step 3: Baseline
      expect(screen.getByText("Step 3: Baseline")).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/enter current weight/i), { target: { value: "80" } });

      // Test Back button
      fireEvent.click(screen.getByRole("button", { name: /back/i }));
      expect(screen.getByText("Step 2: Objectives")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      // Complete
      vi.mocked(requestJson).mockResolvedValue({ success: true });
      fireEvent.click(screen.getByRole("button", { name: /complete setup/i }));

      await waitFor(() => {
        expect(requestJson).toHaveBeenCalledWith("/api/auth/onboard", expect.objectContaining({
            body: expect.stringContaining('"gender":"Non-binary"')
        }));
        expect(mockRouter.push).toHaveBeenCalledWith("/");
      });
    });

    it("handles completion failure", async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.mocked(requestJson).mockRejectedValue(new Error("Fail"));
        render(<OnboardingPage />);
        
        // Manual navigation
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        fireEvent.click(screen.getByRole("button", { name: /start setup/i }));
        
        // Fill required
        fireEvent.change(screen.getByLabelText(/age/i), { target: { value: "25" } });
        fireEvent.change(screen.getByLabelText(/height/i), { target: { value: "175" } });
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        fireEvent.change(screen.getByLabelText(/enter current weight/i), { target: { value: "70" } });
        
        fireEvent.click(screen.getByRole("button", { name: /complete setup/i }));
        
        await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Failed to save your profile. Please try again."));
        alertSpy.mockRestore();
    });

    it("allows signing out", () => {
        render(<OnboardingPage />);
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        fireEvent.click(screen.getByRole("button", { name: /start setup/i }));
        
        fireEvent.click(screen.getByText(/Sign Out/i));
        expect(signOut).toHaveBeenCalled();
    });
  });
});

