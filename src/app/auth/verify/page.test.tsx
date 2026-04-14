import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VerifyEmailForm } from "./page";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestJson } from "@/lib/client-api";
import { Suspense } from "react";

// Mock dependencies
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(() => ({ get: vi.fn() })),
}));

vi.mock("@/lib/client-api", () => ({
  requestJson: vi.fn(),
  getClientErrorMessage: vi.fn((err) => err.message || "Error"),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/auth/AuthShell", () => ({
  AuthShell: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("react", async () => {
  const actual: any = await vi.importActual("react");
  return {
    ...actual,
    Suspense: ({ children }: any) => <>{children}</>,
  };
});

describe("VerifyEmailPage", () => {
  const mockRouter = { push: vi.fn(), refresh: vi.fn() };
  const mockSearchParams = { get: vi.fn() };
  const mockUpdate = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => (key === "email" ? mockSearchParams.get("email") : null)
    });
    (useSession as any).mockReturnValue({
      data: { user: { email: "session@example.com" } },
      update: mockUpdate,
    });
  });

  it("renders the verification form with email from session", async () => {
    render(<VerifyEmailForm />);
    expect(screen.getByText("Check your inbox")).toBeInTheDocument();
    expect(await screen.findByText("session@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
  });

  it("prioritizes email from search params", async () => {
    mockSearchParams.get.mockReturnValue("param@example.com");
    render(<VerifyEmailForm />);
    expect(await screen.findByText("param@example.com")).toBeInTheDocument();
  });

  it("auto-submits when 6 digits are entered", async () => {
    (requestJson as any).mockResolvedValue({ success: true });
    render(<VerifyEmailForm />);
    
    // Email should eventually appear
    expect(await screen.findByText("session@example.com")).toBeInTheDocument();
    
    const input = screen.getByPlaceholderText("000000");
    fireEvent.change(input, { target: { value: "123456" } });

    await waitFor(() => {
      expect(requestJson).toHaveBeenCalledWith("/api/auth/verify", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "session@example.com", code: "123456" }),
      }));
    });
  });

  it("shows error message on failure", async () => {
    (requestJson as any).mockRejectedValue(new Error("Invalid code"));
    render(<VerifyEmailForm />);
    
    const input = screen.getByPlaceholderText("000000");
    fireEvent.change(input, { target: { value: "111111" } });

    expect(await screen.findByText("Invalid code")).toBeInTheDocument();
  });

  it("redirects and updates session on success", async () => {
    vi.useFakeTimers();
    (requestJson as any).mockResolvedValue({ success: true });
    render(<VerifyEmailForm />);
    
    expect(await screen.findByText("session@example.com")).toBeInTheDocument();
    
    const input = screen.getByPlaceholderText("000000");
    fireEvent.change(input, { target: { value: "654321" } });

    // Wait for the API call
    await waitFor(() => {
      expect(requestJson).toHaveBeenCalled();
    });

    // Advance timers
    vi.runAllTimers();

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/");
    });
    
    vi.useRealTimers();
  });
});
