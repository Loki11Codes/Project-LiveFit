 
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Chat from "./Chat";
import { QuickChips } from "./Chat/QuickChips";
import * as clientApi from "@/lib/client-api";
import * as chatUtils from "@/lib/chat-utils";

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/client-api", () => ({
  requestJson: vi.fn(),
  getClientErrorMessage: vi.fn((err) =>
    err instanceof Error ? err.message : "Error",
  ),
}));

vi.mock("@/lib/chat-utils", () => ({
  extractAndCleanLogData: vi.fn((text) => ({
    hasData: false,
    cleanText: text,
    logs: [],
  })),
}));

// scrollIntoView is not implemented in JSDOM
globalThis.HTMLElement.prototype.scrollIntoView = vi.fn();

// crypto.randomUUID is used inside Chat to create message IDs
// @ts-expect-error mock assignment for tests
globalThis.crypto.randomUUID = vi.fn(
  () => "123e4567-e89b-12d3-a456-426614174000",
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Default props matching Chat's required interface */
const makeProps = (overrides: Partial<Parameters<typeof Chat>[0]> = {}) => ({
  onLogParsed: vi.fn(),
  input: "",
  setInput: vi.fn(),
  ...overrides,
});

function mockHistory(messages: unknown[] = []) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(messages),
  });
}

/** Wait for the history loader to disappear (history fetch complete). */
async function waitForHistoryLoad() {
  await waitFor(() => expect(screen.queryByTestId("chat-loader")).toBeNull());
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe("Chat Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistory();
  });

  afterEach(cleanup);

  // ── Initial render / history loading ──────────────────────────────────────

  describe("Chat Main Component", () => {
    it("renders welcome message for existing user", async () => {
      render(<Chat {...makeProps()} />);
      await waitFor(() => {
        expect(screen.getByText(/Good morning/i)).toBeDefined();
      });
    });

    it("renders welcome message for new user", async () => {
      render(<Chat {...makeProps({ isNewUser: true })} />);
      await waitFor(() => {
        expect(screen.getByText(/Welcome to Caloriq/i)).toBeDefined();
      });
    });

    it("shows chat loader while history is loading", () => {
      render(<Chat {...makeProps()} />);
      expect(screen.getByTestId("chat-loader")).toBeDefined();
    });

    it("hides loader after history loads", async () => {
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();
      expect(screen.queryByTestId("chat-loader")).toBeNull();
    });

    it("loads and displays chat history messages", async () => {
      mockHistory([
        { id: "msg-1", role: "user", text: "Hello AI", timestamp: "10:00" },
        { id: "msg-2", role: "model", text: "Hello! How can I help?", timestamp: "10:01" },
      ]);
      render(<Chat {...makeProps()} />);
      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeDefined();
        expect(screen.getByText("Hello! How can I help?")).toBeDefined();
      });
    });

    it("shows welcome message with timestamp when no history exists", async () => {
      mockHistory([]);
      render(<Chat {...makeProps()} />);
      await waitFor(() => {
        expect(screen.getByText(/Good morning/i)).toBeDefined();
      });
    });

    it("handles fetch network error gracefully", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();
      // Should not crash — welcome message still shows
      expect(screen.getByText(/Good morning/i)).toBeDefined();
    });

    it("handles fetch non-ok response gracefully", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, json: vi.fn() });
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();
      expect(screen.getByText(/Good morning/i)).toBeDefined();
    });
  });

  // ── Proactive nudge logic ─────────────────────────────────────────────────

  describe("Protein Nudge", () => {
    it("shows protein nudge when protein < 50% of target", async () => {
      const nudgeStatus = { protein: 10, proteinTarget: 100, calories: 1000, calorieTarget: 2000 };
      render(<Chat {...makeProps({ nudgeStatus })} />);
      await waitFor(() => {
        expect(screen.getByText(/noticed you're a bit behind on your protein/i)).toBeDefined();
      });
    });

    it("does NOT show protein nudge when protein >= 50% of target", async () => {
      const nudgeStatus = { protein: 60, proteinTarget: 100, calories: 1000, calorieTarget: 2000 };
      render(<Chat {...makeProps({ nudgeStatus })} />);
      await waitForHistoryLoad();
      expect(screen.queryByText(/noticed you're a bit behind on your protein/i)).toBeNull();
    });

    it("does not duplicate nudge on re-render with same status", async () => {
      const nudgeStatus = { protein: 10, proteinTarget: 100, calories: 1000, calorieTarget: 2000 };
      const { rerender } = render(<Chat {...makeProps({ nudgeStatus })} />);
      await waitFor(() => {
        expect(screen.getByText(/noticed you're a bit behind on your protein/i)).toBeDefined();
      });
      rerender(<Chat {...makeProps({ nudgeStatus })} />);
      expect(
        screen.queryAllByText(/noticed you're a bit behind on your protein/i),
      ).toHaveLength(1);
    });
  });

  // ── Message sending ───────────────────────────────────────────────────────
  // Chat is a CONTROLLED component: `input` is a prop managed by the parent.
  // Tests must render with a non-empty `input` prop to successfully trigger handleSend.

  describe("Chat Send Behaviour", () => {
    it("sends a message and renders the AI response text", async () => {
      vi.mocked(clientApi.requestJson).mockResolvedValue({ text: "AI response text" });
      vi.mocked(chatUtils.extractAndCleanLogData).mockReturnValue({
        hasData: false,
        cleanText: "AI response text",
        logs: [],
      });

      render(<Chat {...makeProps({ input: "Hello AI", onLogParsed: vi.fn() })} />);
      await waitForHistoryLoad();

      fireEvent.keyDown(screen.getByTestId("chat-input"), { key: "Enter", shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText("AI response text")).toBeDefined();
      });
    });

    it("shows error notice and error message when requestJson fails", async () => {
      vi.mocked(clientApi.requestJson).mockRejectedValue(new Error("Network timeout"));
      vi.mocked(clientApi.getClientErrorMessage).mockReturnValue("Network timeout");

      render(<Chat {...makeProps({ input: "Hello", onLogParsed: vi.fn() })} />);
      await waitForHistoryLoad();

      fireEvent.keyDown(screen.getByTestId("chat-input"), { key: "Enter", shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect/i)).toBeDefined();
      });
    });

    it("calls onLogParsed with logs when AI response has data", async () => {
      const mockLogs = [{ category: "food", data: {} }];
      vi.mocked(clientApi.requestJson).mockResolvedValue({ text: "DATA block" });
      vi.mocked(chatUtils.extractAndCleanLogData).mockReturnValue({
        hasData: true,
        cleanText: "Logged your food!",
        logs: mockLogs as any,
      });

      const onLogParsed = vi.fn();
      render(<Chat {...makeProps({ input: "log apple", onLogParsed })} />);
      await waitForHistoryLoad();

      fireEvent.keyDown(screen.getByTestId("chat-input"), { key: "Enter", shiftKey: false });

      await waitFor(() => {
        expect(onLogParsed).toHaveBeenCalledWith(mockLogs, true);
      });
    });

    it("calls onLogParsed([]) when state keyword is in response but no data block", async () => {
      vi.mocked(clientApi.requestJson).mockResolvedValue({ text: "I have logged your food." });
      vi.mocked(chatUtils.extractAndCleanLogData).mockReturnValue({
        hasData: false,
        cleanText: "I have logged your food.",
        logs: [],
      });

      const onLogParsed = vi.fn();
      render(<Chat {...makeProps({ input: "log something", onLogParsed })} />);
      await waitForHistoryLoad();

      fireEvent.keyDown(screen.getByTestId("chat-input"), { key: "Enter", shiftKey: false });

      await waitFor(() => {
        expect(onLogParsed).toHaveBeenCalledWith([]);
      });
    });

    it("shows warning notice when AI response includes a warning field", async () => {
      vi.mocked(clientApi.requestJson).mockResolvedValue({
        text: "Some reply",
        warning: "Low confidence in log data",
      });
      vi.mocked(chatUtils.extractAndCleanLogData).mockReturnValue({
        hasData: false,
        cleanText: "Some reply",
        logs: [],
      });

      render(<Chat {...makeProps({ input: "log banana", onLogParsed: vi.fn() })} />);
      await waitForHistoryLoad();

      fireEvent.keyDown(screen.getByTestId("chat-input"), { key: "Enter", shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText("Low confidence in log data")).toBeDefined();
      });
    });

    it("does not send when input is empty (empty string is trimmed)", async () => {
      render(<Chat {...makeProps({ input: "", onLogParsed: vi.fn() })} />);
      await waitForHistoryLoad();

      // Firing Enter with an empty input should not call requestJson
      fireEvent.keyDown(screen.getByTestId("chat-input"), { key: "Enter", shiftKey: false });

      expect(clientApi.requestJson).not.toHaveBeenCalled();
    });

    it("blocks a second send while the first is still in flight (isTyping guard)", async () => {
      // Keep requestJson pending so isTyping stays true
      let resolveFirst!: (v: unknown) => void;
      vi.mocked(clientApi.requestJson).mockReturnValue(
        new Promise((resolve) => { resolveFirst = resolve; }),
      );

      render(<Chat {...makeProps({ input: "First message", onLogParsed: vi.fn() })} />);
      await waitForHistoryLoad();

      const chatInput = screen.getByTestId("chat-input");

      // First send — triggers the pending requestJson
      fireEvent.keyDown(chatInput, { key: "Enter", shiftKey: false });
      expect(clientApi.requestJson).toHaveBeenCalledTimes(1);

      // Second send while still typing — should be blocked
      fireEvent.keyDown(chatInput, { key: "Enter", shiftKey: false });
      expect(clientApi.requestJson).toHaveBeenCalledTimes(1);

      // Resolve to let component clean up
      await act(async () => {
        resolveFirst({ text: "Done" });
      });
    });
  });

  // ── QuickChips ────────────────────────────────────────────────────────────

  describe("QuickChips", () => {
    it("renders chips correctly", () => {
      render(<QuickChips onSelect={vi.fn()} />);
      expect(screen.getByText("Breakfast")).toBeDefined();
      expect(screen.getByText("Water")).toBeDefined();
      expect(screen.getByText("Workout")).toBeDefined();
      expect(screen.getByText("Sleep")).toBeDefined();
      expect(screen.getByText("Weight")).toBeDefined();
      expect(screen.getByText("Stats")).toBeDefined();
    });

    it.each([
      ["Breakfast", "Log my breakfast"],
      ["Water", "Log 500ml of water"],
      ["Workout", "Record my training session"],
      ["Sleep", "Show my sleep data"],
      ["Weight", "Update my weight measurement"],
      ["Stats", "How are my stats for today?"],
      ["Summary", "Give me a weekly summary"],
      ["Delete", "Delete my last food log"],
    ])("clicking '%s' chip calls onSelect with '%s'", (label, expectedText) => {
      const onSelect = vi.fn();
      render(<QuickChips onSelect={onSelect} />);
      fireEvent.click(screen.getByText(label));
      expect(onSelect).toHaveBeenCalledWith(expectedText);
    });
  });
});
