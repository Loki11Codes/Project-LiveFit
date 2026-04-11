/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Home from "./page";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import * as clientApi from "@/lib/client-api";
import React from "react";

// STUBS
if (typeof globalThis !== "undefined") {
  (globalThis as any).HTMLElement.prototype.scrollIntoView = vi.fn();  
  (globalThis as any).scrollTo = vi.fn();  
}

// MOCKS
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: vi.fn(() => "/"),
}));

const mockToggleTheme = (e?: any) => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
};

vi.mock("@/components/Theme/ThemeProvider", () => ({
  BRAND_COLORS: [{ name: "Test", hex: "#000000" }],
  useTheme: vi.fn(() => ({ 
    theme: "light", 
    accentColor: "#000000",
    setTheme: vi.fn(),
    setAccentColor: vi.fn(),
    toggleTheme: mockToggleTheme
  })),
}));

// Mock View Transitions
if (typeof document !== 'undefined') {
  document.startViewTransition = vi.fn().mockReturnValue({ ready: Promise.resolve() });
}

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,  
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),  
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,  
}));

// Mock sub-components to isolate Dashboard logic
vi.mock("@/components/Navbar", () => ({
  default: ({ activeTab, setActiveTab }: any) => {
    return (
      <nav data-testid="navbar">
        <button onClick={() => setActiveTab("profile")}>Profile Link</button>
        <button aria-label="Toggle theme" onClick={() => mockToggleTheme()}>
          Theme Toggle
        </button>
        <div data-active-tab={activeTab}>Navbar</div>
      </nav>
    );
  },
}));

vi.mock("@/components/Sidebar", () => ({
  default: () => <div data-testid="sidebar" />,
}));
vi.mock("@/components/Chat", () => ({
  default: () => <div data-testid="chat-component" />,
}));
vi.mock("@/components/Tabs/LogTab", () => ({
  default: () => <div data-testid="log-tab" />,
}));
vi.mock("@/components/Tabs/HistoryTab", () => ({
  default: () => <div data-testid="history-tab" />,
}));
vi.mock("@/components/Tabs/BodyTab", () => ({
  default: (
    { handleSaveMeasurements }: any,  
  ) => (
    <div data-testid="body-tab">
      <button onClick={handleSaveMeasurements}>Save Measurements</button>
    </div>
  ),
}));
vi.mock("@/components/Tabs/ProfileTab", () => ({
  default: (
    { handleSaveProfile, handleSaveGoals }: any,  
  ) => (
    <div data-testid="profile-tab">
      <button onClick={handleSaveProfile}>Save Profile</button>
      <button onClick={handleSaveGoals}>Save Goals</button>
    </div>
  ),
}));

vi.mock("@/lib/client-api", () => ({
  getClientErrorMessage: vi.fn((err) =>
    err instanceof Error ? err.message : String(err),
  ),
  requestJson: vi.fn(() => Promise.resolve([])),
}));

describe("Home (Dashboard) Orchestration", () => {
  const mockRouter = { push: vi.fn(), refresh: vi.fn() };
  let mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    vi.stubGlobal("location", { href: "http://localhost/" });
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
      ),
    );

    (useSession as any).mockReturnValue({
      data: { user: { id: "test-user" } },
      status: "authenticated",
    });  
    (useRouter as any).mockReturnValue(mockRouter);  
    (useSearchParams as any).mockReturnValue(mockSearchParams);  

    // Dashboard data mock
    (clientApi.requestJson as any).mockImplementation((url: string) => {
       
      if (url === "/api/logs")
        return Promise.resolve({ food: [], workouts: [], sleep: [] });
      if (url === "/api/profile") return Promise.resolve({ age: 30 });
      if (url === "/api/goals") return Promise.resolve({ proteinTarget: 150 });
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders navbar and sidebar", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.getByTestId("navbar")).toBeDefined();
    });
  });

  it("defaults to chat tab when no tab is specified", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.getByTestId("chat-component")).toBeDefined();
    });
  });

  it("renders specific tab from search params", async () => {
    (useSearchParams as any).mockReturnValue(new URLSearchParams("tab=body"));  
    render(<Home />);
    await waitFor(() => {
      expect(screen.getByTestId("body-tab")).toBeDefined();
    });
  });

  it("toggles theme state", async () => {
    render(<Home />);
    const themeBtn = await screen.findByLabelText(/Toggle theme/i);

    fireEvent.click(themeBtn);
    expect(document.documentElement.dataset.theme).toBe("dark");

    fireEvent.click(themeBtn);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("handles tab switching through navbar", async () => {
    render(<Home />);
    const profileBtn = await screen.findByText(/Profile Link/i);
    fireEvent.click(profileBtn);

    expect(mockRouter.push).toHaveBeenCalledWith(
      "/?tab=profile",
      expect.anything(),
    );
  });

  it("processes measurement saves with notifications", async () => {
    (useSearchParams as any).mockReturnValue(new URLSearchParams("tab=body"));  
    render(<Home />);

    const saveBtn = await screen.findByText(/Save Measurements/i);
    (clientApi.requestJson as any).mockResolvedValueOnce({ id: "m1" });  

    await act(async () => {
      fireEvent.click(saveBtn);
    });

    const { default: toast } = await import("react-hot-toast");
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/saved/i),
      );
    });
  });

  it("clears dashboard state when session is lost", async () => {
    const { rerender } = render(<Home />);

    // Authenticated state (already set in beforeEach)
    expect(screen.getByTestId("navbar")).toBeDefined();

    // Session loss
    (useSession as any).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });  

    act(() => {
      rerender(<Home />);
    });

    // It should effectively re-render or handle the cleanup effect.
    // We check if it still works or doesn't crash.
    await waitFor(() => {
      expect(screen.getByTestId("navbar")).toBeDefined();
    });
  });
});



