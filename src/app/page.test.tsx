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
import { TabId } from "@/lib/types";
import toast from "react-hot-toast";

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

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/components/Theme/ThemeProvider", () => ({
  BRAND_COLORS: [{ name: "T", hex: "#0" }],
  useTheme: vi.fn(() => ({ theme: "light", accentColor: "#0", setTheme: vi.fn(), setAccentColor: vi.fn(), toggleTheme: vi.fn() })),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/Navbar", () => ({
  default: ({ activeTab, setActiveTab }: any) => (
    <nav data-testid="navbar">
      <button onClick={() => setActiveTab("profile")}>ProfileLink</button>
      <button onClick={() => setActiveTab("chat")}>ChatLink</button>
      <button onClick={() => setActiveTab("history")}>HistoryLink</button>
      <button onClick={() => setActiveTab("meals")}>MealsLink</button>
      <button onClick={() => setActiveTab("routines")}>RoutinesLink</button>
      <div data-active-tab={activeTab}>Navbar</div>
    </nav>
  ),
}));

vi.mock("@/components/Sidebar", () => ({
  default: ({ setDayType, activeWorkout, onTabChange }: any) => (
    <div data-testid="sidebar">
      <button onClick={() => setDayType("Training")}>SetTraining</button>
      <button onClick={() => onTabChange("log")}>LogLink</button>
    </div>
  ),
}));

vi.mock("@/components/Chat", () => ({
  default: ({ onLogParsed, onMessageSent }: any) => (
    <div data-testid="chat-component">
      <button onClick={() => onLogParsed([{ category: "insight", data: { title: "T", text: "I" } }], true)}>TriggerInsight</button>
      <button onClick={() => onLogParsed([{ category: "workout", action: "start", name: "C" }], true)}>TriggerStartW</button>
      <button onClick={() => onLogParsed([{ category: "workout", action: "start", routineId: "r1" }], true)}>TriggerStartR</button>
      <button onClick={() => onLogParsed([{ category: "food", data: { name: "A" } }], true)}>TriggerFood</button>
      <button onClick={() => onLogParsed([], true)}>TriggerEmpty</button>
      <button onClick={() => onMessageSent()}>TriggerSent</button>
    </div>
  ),
}));

vi.mock("@/components/RoutinesTab", () => ({
  RoutinesTab: ({ onStart }: any) => (
    <div data-testid="routines-tab">
      <button onClick={() => onStart({ name: "R", exercises: [{ name: "E", sets: [{ id: "s1", weight: "10", reps: "10" }] }] })}>StartRWithSets</button>
      <button onClick={() => onStart({ name: "R", exercises: [{ name: "E", targetSets: 3 }] })}>StartRWithTarget</button>
    </div>
  ),
}));

vi.mock("../components/WorkoutSession", () => ({
  WorkoutSession: ({ session, onFinish, onDiscard, onUpdate }: any) => (
    <div data-testid="workout-session-overlay">
      <button onClick={() => onFinish({ ...session, exercises: [{ name:'E', sets:[{id:'1',weight:'10',reps:'10',isCompleted:true}] }] })}>FinishButton</button>
      <button onClick={() => onFinish({ ...session, exercises: [] })}>FinishEmptyButton</button>
      <button onClick={() => onDiscard()}>DiscardButton</button>
      <button onClick={() => onUpdate({ ...session, name: "U" })}>UpdateButton</button>
    </div>
  ),
}));

vi.mock("@/components/Tabs/LogTab", () => ({
  default: ({ onDeleteWorkout, onDeleteFood, onDeleteSleep }: any) => (
    <div data-testid="log-tab">
      <button onClick={() => onDeleteWorkout("w1")}>DelW</button>
      <button onClick={() => onDeleteFood("f1")}>DelF</button>
      <button onClick={() => onDeleteSleep("s1")}>DelS</button>
    </div>
  ),
}));
vi.mock("@/components/Tabs/HistoryTab", () => ({ default: () => <div data-testid="history-tab" /> }));
vi.mock("@/components/Tabs/BodyTab", () => ({
  default: ({ handleSaveMeasurements, setMeasurements }: any) => (
    <div data-testid="body-tab">
      <button data-testid="set-m-btn" onClick={() => setMeasurements((prev: any) => ({ ...prev, weight: "75" }))}>SetM</button>
      <button data-testid="save-m-btn" onClick={handleSaveMeasurements}>SaveM</button>
    </div>
  ),
}));
vi.mock("@/components/Tabs/ProfileTab", () => ({ default: () => <div data-testid="profile-tab" /> }));
vi.mock("@/components/Tabs/MealPlanningTab", () => ({ default: () => <div data-testid="meal-planning-tab" /> }));
vi.mock("@/components/Shared/AchievementOverlay", () => ({
  AchievementOverlay: ({ achievements, onClose }: any) => (
    <div data-testid="achievement-overlay">
      <button onClick={onClose}>CloseA</button>
    </div>
  ),
}));

vi.mock("@/lib/client-api", () => ({
  getClientErrorMessage: vi.fn((err) => err instanceof Error ? err.message : String(err)),
  requestJson: vi.fn(() => Promise.resolve([])),
}));


describe("Home Orchestration Definitive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn((url) => {
      if (typeof url === 'string' && url.includes("/api/routines?id=r1")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ name: "R1", exercises: [{ name: "E1", targetSets: 3 }] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ achievements: [{id:'1'}] }) });
    }));
    vi.stubGlobal("crypto", { randomUUID: () => "uuid" });
    vi.mocked(useSession).mockReturnValue({ data: { user: { id: "u1" } }, status: "authenticated" } as any);  
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn(), refresh: vi.fn() } as any);  
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as any);  
    vi.mocked(clientApi.requestJson).mockImplementation((url: string) => {
      if (url === "/api/logs") return Promise.resolve({ food: [{id:'f1',time:new Date().toISOString()}], workouts: [{id:'w1',time:new Date().toISOString()}], sleep: [{id:'s1',time:new Date().toISOString()}], water: [] });
      if (url === "/api/profile") return Promise.resolve({ age: 30, height: 180, dayType: "Rest" });
      if (url === "/api/profile?type=goals") return Promise.resolve({ proteinTarget: 150, kcalTarget: 2000 });
      if (url === "/api/analytics") return Promise.resolve({ nutritionStats: [], averages: { kcal: 2000, protein: 150 }, weightTrend: [], meta: { period: "7d" } });
      if (url === "/api/day-types") return Promise.resolve([{ dayKey: "2024-01-01", dayType: "Rest" }]);
      if (url === "/api/measurements") return Promise.resolve({ id: "m1", time: new Date().toISOString(), weight: 75 });
      return Promise.resolve({});
    });
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("covers full flow including achievements and empty workout", async () => {
    await act(async () => { render(<Home />); });
    await waitFor(() => expect(screen.getByTestId("navbar")).toBeInTheDocument());
    
    await act(async () => { fireEvent.click(screen.getByText(/SetTraining/i)); });
    await act(async () => { fireEvent.click(screen.getByText(/TriggerInsight/i)); });
    await act(async () => { fireEvent.click(screen.getByText(/ProfileLink/i)); });
    
    await act(async () => { fireEvent.click(screen.getByText(/TriggerStartW/i)); });
    await waitFor(() => expect(screen.getByTestId("workout-session-overlay")).toBeInTheDocument());
    
    await act(async () => { fireEvent.click(screen.getByText(/FinishButton/i)); });
    await waitFor(() => expect(screen.getByTestId("achievement-overlay")).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText(/CloseA/i)); });
    
    await act(async () => { fireEvent.click(screen.getByText(/TriggerStartW/i)); });
    await waitFor(() => expect(screen.getByTestId("workout-session-overlay")).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText(/FinishEmptyButton/i)); });
    expect(screen.queryByTestId("workout-session-overlay")).not.toBeInTheDocument();
  });

  it("covers line 427: handleStartWorkoutById via AI", async () => {
    await act(async () => { render(<Home />); });
    await waitFor(() => expect(screen.getByTestId("navbar")).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText(/TriggerStartR/i)); });
    await waitFor(() => expect(screen.getByTestId("workout-session-overlay")).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText(/UpdateButton/i)); });
    await act(async () => { fireEvent.click(screen.getByText(/TriggerSent/i)); });
  });

  it("covers workout variations (lines 93, 94)", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("tab=routines") as any);
    await act(async () => { render(<Home />); });
    await act(async () => { fireEvent.click(await screen.findByText(/StartRWithSets/i)); });
    await act(async () => { fireEvent.click(screen.getByText(/StartRWithTarget/i)); });
  });

  it("covers all tabs (lines 639, 674, etc.)", async () => {
    await act(async () => { render(<Home />); });
    await act(async () => { fireEvent.click(screen.getByText(/HistoryLink/i)); });
    await act(async () => { fireEvent.click(screen.getByText(/MealsLink/i)); });
    await act(async () => { fireEvent.click(screen.getByText(/RoutinesLink/i)); });
    await act(async () => { fireEvent.click(screen.getByText(/ProfileLink/i)); });
    await act(async () => { fireEvent.click(screen.getByText(/ChatLink/i)); });
  });

  it("covers line 512: successful storage load", async () => {
    vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue(JSON.stringify({ name: "S", exercises: [] })), setItem: vi.fn(), removeItem: vi.fn() });
    await act(async () => { render(<Home />); });
    await waitFor(() => expect(screen.getByTestId("workout-session-overlay")).toBeInTheDocument());
  });

  it("covers line 538-539: successful measurement save", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("tab=body") as any);
    await act(async () => { render(<Home />); });
    await waitFor(() => expect(screen.getByTestId("body-tab")).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId("set-m-btn")); });
    await act(async () => { fireEvent.click(screen.getByTestId("save-m-btn")); });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("covers line 337: handleTabChange for same tab", async () => {
    await act(async () => { render(<Home />); });
    await act(async () => { fireEvent.click(screen.getByText(/ChatLink/i)); });
  });

  it("covers deletions and errors", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("tab=log") as any);
    await act(async () => { render(<Home />); });
    
    await act(async () => {
      fireEvent.click(screen.getByText(/DelF/i));
      fireEvent.click(screen.getByText(/DelW/i));
      fireEvent.click(screen.getByText(/DelS/i));
    });
    
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("Fail"))));
    await act(async () => {
      fireEvent.click(screen.getByText(/DelF/i));
      fireEvent.click(screen.getByText(/DelW/i));
      fireEvent.click(screen.getByText(/DelS/i));
    });
    await waitFor(() => expect(errSpy).toHaveBeenCalled());
    errSpy.mockRestore();
  });

  it("covers error branches part 1", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(clientApi.requestJson).mockImplementation(() => Promise.reject(new Error("Fail")));
    await act(async () => { render(<Home />); });
    await waitFor(() => expect(errSpy).toHaveBeenCalled());
    errSpy.mockRestore();
  });

  it("covers error branches part 2", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("Fail"))));
    await act(async () => { render(<Home />); });
    await act(async () => { fireEvent.click(await screen.findByText(/TriggerStartW/i)); });
    await waitFor(() => expect(screen.getByTestId("workout-session-overlay")).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText(/FinishButton/i)); });
    await waitFor(() => expect(errSpy).toHaveBeenCalled());
    errSpy.mockRestore();
  });

  it("covers error branches part 3", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("Fail"))));
    await act(async () => { render(<Home />); });
    await act(async () => { fireEvent.click(await screen.findByText(/TriggerFood/i)); });
    await waitFor(() => expect(errSpy).toHaveBeenCalled());
    errSpy.mockRestore();
  });

  it("covers error branches part 4", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await act(async () => { render(<Home />); });
    await act(async () => { fireEvent.click(await screen.findByText(/TriggerEmpty/i)); });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("covers error branches part 5", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("tab=body") as any);
    vi.mocked(clientApi.requestJson).mockImplementation(() => Promise.reject(new Error("Fail")));
    await act(async () => { render(<Home />); });
    await act(async () => { fireEvent.click(await screen.findByTestId("save-m-btn")); });
    await waitFor(() => expect(errSpy).toHaveBeenCalled());
    errSpy.mockRestore();
  });

  it("covers error branches part 6", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn((url) => {
      if (typeof url === 'string' && url.includes("/api/routines?id=r1")) return Promise.reject(new Error("Fail"));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ achievements: [] }) });
    }));
    await act(async () => { render(<Home />); });
    await act(async () => { fireEvent.click(await screen.findByText(/TriggerStartR/i)); });
    await waitFor(() => expect(errSpy).toHaveBeenCalled());
    errSpy.mockRestore();
  });

  it("covers error branches part 7", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(clientApi.requestJson).mockImplementation(() => Promise.reject(new Error("Fail")));
    await act(async () => { render(<Home />); });
    await act(async () => { fireEvent.click(await screen.findByText(/SetTraining/i)); });
    await waitFor(() => expect(errSpy).toHaveBeenCalled());
    errSpy.mockRestore();
  });

  it("covers workout discard with confirm variations (lines 257-258)", async () => {
    await act(async () => { render(<Home />); });
    await act(async () => { fireEvent.click(await screen.findByText(/TriggerStartW/i)); });
    await waitFor(() => expect(screen.getByTestId("workout-session-overlay")).toBeInTheDocument());
    
    vi.stubGlobal("confirm", vi.fn(() => false));
    await act(async () => { fireEvent.click(screen.getByText(/DiscardButton/i)); });
    expect(screen.getByTestId("workout-session-overlay")).toBeInTheDocument();
    
    vi.stubGlobal("confirm", vi.fn(() => true));
    await act(async () => { fireEvent.click(screen.getByText(/DiscardButton/i)); });
    expect(screen.queryByTestId("workout-session-overlay")).not.toBeInTheDocument();
  });

  it("covers storage fail scenario", async () => {
    vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue("{inv"), setItem: vi.fn(), removeItem: vi.fn() });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await act(async () => { render(<Home />); });
    await waitFor(() => expect(warnSpy).toHaveBeenCalled());
    warnSpy.mockRestore();
  });

  it("covers session loss path and manual refresh (line 161, 174-176)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Part A: manual refresh fail with session
    vi.mocked(useSession).mockReturnValue({ data: { user: { id: "u1" } }, status: "authenticated" } as any);
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("tab=body") as any);
    vi.mocked(clientApi.requestJson).mockImplementation((url: string) => {
      if (url === "/api/measurements") return Promise.resolve({}); // save success
      return Promise.reject(new Error("Fail")); // refresh fail
    });
    await act(async () => { render(<Home />); });
    await act(async () => { fireEvent.click(await screen.findByTestId("save-m-btn")); });
    await waitFor(() => expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to refresh dashboard data:"), expect.any(String)));
    
    cleanup();
    
    // Part B: refreshDashboard early return when session lost
    vi.mocked(useSession).mockReturnValue({ data: null, status: "unauthenticated" } as any);
    await act(async () => { render(<Home />); });
    await act(async () => { fireEvent.click(await screen.findByTestId("save-m-btn")); });
    // Should return early, no error logged
    
    errSpy.mockRestore();
  });

  it("covers timers and prompts", async () => {
    vi.useFakeTimers();
    await act(async () => { render(<Home />); });
    await act(async () => { fireEvent.click(screen.getByText(/TriggerFood/i)); });
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(clientApi.requestJson).toHaveBeenCalled();
    
    await act(async () => { globalThis.dispatchEvent(new CustomEvent("ai-chat-prompt", { detail: "T" })); });
    vi.useRealTimers();
  });
});
