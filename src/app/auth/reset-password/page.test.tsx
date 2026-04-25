import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ResetPasswordPage from "./page";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/client-api";

// Mock dependencies
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/lib/client-api", () => ({
  requestJson: vi.fn(),
  getClientErrorMessage: vi.fn((err) => err.message || "Error"),
}));

describe("ResetPasswordPage", () => {
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

  it("renders the reset password form", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText("Protect your account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New Secure Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm New Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });

  it("shows error if passwords do not match", async () => {
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByPlaceholderText("New Secure Password");
    const confirmInput = screen.getByPlaceholderText("Confirm New Password");
    const submitBtn = screen.getByRole("button", { name: /update password/i });

    fireEvent.change(passwordInput, { target: { value: "StrongPass123!" } });
    fireEvent.change(confirmInput, { target: { value: "DifferentPass123!" } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
  });

  it("calls API and updates session on valid submission", async () => {
    vi.mocked(requestJson).mockResolvedValue({ success: true });
    
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByPlaceholderText("New Secure Password");
    const confirmInput = screen.getByPlaceholderText("Confirm New Password");
    const submitBtn = screen.getByRole("button", { name: /update password/i });

    // Assuming usePasswordValidation allows these values
    fireEvent.change(passwordInput, { target: { value: "StrongPass123!" } });
    fireEvent.change(confirmInput, { target: { value: "StrongPass123!" } });
    
    // We need to wait for validation hooks if they are async or have effects
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(requestJson).toHaveBeenCalledWith("/api/auth/reset-password", expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("StrongPass123!"),
      }));
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ requirePasswordChange: false });
    });

    await waitFor(() => {
      expect(screen.getByText(/Password updated successfully/i)).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    vi.mocked(requestJson).mockRejectedValue(new Error("API Error"));
    
    render(<ResetPasswordPage />);
    
    fireEvent.change(screen.getByPlaceholderText("New Secure Password"), { target: { value: "StrongPass123!" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), { target: { value: "StrongPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByText("API Error")).toBeInTheDocument();
  });

  it("toggles password visibility", () => {
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByPlaceholderText("New Secure Password");
    const confirmInput = screen.getByPlaceholderText("Confirm New Password");
    
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(confirmInput).toHaveAttribute("type", "password");

    // The buttons have no specific aria-label, but we can query by their container or icons
    // However, they are just buttons. We can find them by querying the closest button to the inputs or simply getting all buttons in the input groups.
    // Better yet, let's just find the buttons by querying the lucide-react eye icons
    // We can get them by their parent buttons
    const toggleBtns = screen.getAllByRole("button").filter(btn => !btn.textContent?.includes("Update Password"));
    
    // First toggle is for password
    fireEvent.click(toggleBtns[0]);
    expect(passwordInput).toHaveAttribute("type", "text");
    fireEvent.click(toggleBtns[0]);
    expect(passwordInput).toHaveAttribute("type", "password");

    // Second toggle is for confirm password
    fireEvent.click(toggleBtns[1]);
    expect(confirmInput).toHaveAttribute("type", "text");
    fireEvent.click(toggleBtns[1]);
    expect(confirmInput).toHaveAttribute("type", "password");
  });

  it("redirects after successful update", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(requestJson).mockResolvedValue({ success: true });
    
    render(<ResetPasswordPage />);
    
    fireEvent.change(screen.getByPlaceholderText("New Secure Password"), { target: { value: "StrongPass123!" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), { target: { value: "StrongPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/Password updated successfully/i)).toBeInTheDocument();
    });

    vi.advanceTimersByTime(2000);
    expect(mockRouter.push).toHaveBeenCalledWith("/");
    expect(mockRouter.refresh).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
