import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VerifyEmailForm } from "./page";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestJson } from "@/lib/client-api";

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
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    section: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/auth/AuthShell", () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    Suspense: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe("VerifyEmailPage", () => {
  const mockRouter = { push: vi.fn(), refresh: vi.fn() };
  const mockSearchParams = { get: vi.fn() };
  const mockUpdate = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => (key === "email" ? mockSearchParams.get("email") : null)
    } as unknown as ReturnType<typeof useSearchParams>);
    vi.mocked(useSession).mockReturnValue({
      data: { user: { email: "session@example.com" } },
      status: "authenticated",
      update: mockUpdate,
    } as unknown as ReturnType<typeof useSession>);
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
    vi.mocked(requestJson).mockResolvedValue({ success: true });
    render(<VerifyEmailForm />);

    // Wait for email to appear (ensures session effect has run)
    expect(await screen.findByText("session@example.com")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("000000");

    await act(async () => {
      fireEvent.change(input, { target: { value: "123456" } });
    });

    await waitFor(() => {
      expect(requestJson).toHaveBeenCalledWith(
        "/api/auth/verify",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "session@example.com", code: "123456" }),
        })
      );
    });
  });

  it("shows error message on failure", async () => {
    vi.mocked(requestJson).mockRejectedValue(new Error("Invalid code"));
    render(<VerifyEmailForm />);

    const input = screen.getByPlaceholderText("000000");
    await act(async () => {
      fireEvent.change(input, { target: { value: "111111" } });
    });

    expect(await screen.findByText("Invalid code")).toBeInTheDocument();
  });

  it("redirects and updates session on success", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.mocked(requestJson).mockResolvedValue({ success: true });
    render(<VerifyEmailForm />);

    expect(await screen.findByText("session@example.com")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("000000");
    await act(async () => {
      fireEvent.change(input, { target: { value: "654321" } });
    });

    // Wait for the API call to complete
    await waitFor(() => {
      expect(requestJson).toHaveBeenCalled();
    });

    // Advance the 1500ms redirect timer
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockRouter.push).toHaveBeenCalledWith("/");

    vi.useRealTimers();
  });
});
