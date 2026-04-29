 
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
import type { ParsedLogEnvelope } from "@/lib/types";

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
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => <img {...props} />,
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

    it("auto-sends initialMessage when provided", async () => {
      mockHistory([]);
      const onMessageSent = vi.fn();
      const setInput = vi.fn();
      const requestJsonMock = vi.mocked(clientApi.requestJson).mockResolvedValue({ text: "Hello response" });

      // We need to provide a non-empty input prop because handleSend uses it
      // In a real app, setInput would update the parent state which updates the input prop
      const { rerender } = render(
        <Chat
          {...makeProps({
            initialMessage: "Log 50kg bench",
            onMessageSent,
            setInput,
            input: "Log 50kg bench" 
          })}
        />,
      );

      await waitForHistoryLoad();
      await waitFor(() => expect(onMessageSent).toHaveBeenCalled());
      
      // rerender to simulate parent state update if needed, but handleSend uses current prop
      await waitFor(() => expect(requestJsonMock).toHaveBeenCalled());
    });

    it("handles quick chip selection", async () => {
      mockHistory([]);
      const setInput = vi.fn();
      render(<Chat {...makeProps({ setInput })} />);
      await waitForHistoryLoad();

      const chip = screen.getByRole("button", { name: /Breakfast/i });
      fireEvent.click(chip);
      expect(setInput).toHaveBeenCalledWith(expect.stringContaining("Log my breakfast"));
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

    it("handles nudge when protein-nudge message already exists", async () => {
      mockHistory([{ id: "protein-nudge", role: "model", text: "Nudge" }]);
      const nudgeStatus = { protein: 10, proteinTarget: 100, calories: 1000, calorieTarget: 2000 };
      render(<Chat {...makeProps({ nudgeStatus })} />);
      await waitForHistoryLoad();
      // Should NOT add another nudge (line 90 or 96)
      expect(screen.queryAllByText(/noticed you're a bit behind/i)).toHaveLength(0);
    });

    it("covers roundNumber with float in nudge", async () => {
      const nudgeStatus = { protein: 12.5, proteinTarget: 100, calories: 100, calorieTarget: 2000 };
      render(<Chat {...makeProps({ nudgeStatus })} />);
      await waitFor(() => {
        expect(screen.getByText(/13g \/ 100g/i)).toBeDefined();
      });
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
      vi.mocked(clientApi.requestJson).mockRejectedValueOnce(new Error("Network timeout"));
      vi.mocked(clientApi.getClientErrorMessage).mockReturnValueOnce("Network timeout");

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
        logs: mockLogs as ParsedLogEnvelope[],
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

    it("triggers onLogParsed([]) on 'deleted' keyword without data block", async () => {
      vi.mocked(clientApi.requestJson).mockResolvedValue({ text: "I have deleted your log." });
      vi.mocked(chatUtils.extractAndCleanLogData).mockReturnValue({
        hasData: false,
        cleanText: "I have deleted your log.",
        logs: [],
      });

      const onLogParsed = vi.fn();
      render(<Chat {...makeProps({ input: "delete last", onLogParsed })} />);
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

    it("handles response with warning but no text", async () => {
      vi.mocked(clientApi.requestJson).mockResolvedValue({
        warning: "Empty text warning",
      });

      render(<Chat {...makeProps({ input: "log empty", onLogParsed: vi.fn() })} />);
      await waitForHistoryLoad();

      fireEvent.keyDown(screen.getByTestId("chat-input"), { key: "Enter", shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText("Empty text warning")).toBeDefined();
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

  // ── Scroll & UI Behavior ──────────────────────────────────────────────────

  describe("Chat UI Behavior", () => {
    it("shows scroll-to-bottom button when scrolled up", async () => {
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();

      const viewport = screen.getByRole("log").querySelector(".chat-viewport")!;
      // JSDOM doesn't support real layout, so we must stub the properties
      Object.defineProperty(viewport, "scrollTop", { value: 0, writable: true });
      Object.defineProperty(viewport, "scrollHeight", { value: 2000, writable: true });
      Object.defineProperty(viewport, "clientHeight", { value: 500, writable: true });

      fireEvent.scroll(viewport);

      await waitFor(() => {
        expect(screen.getByLabelText("Scroll to bottom")).toBeDefined();
      });
    });

    it("scrolls to bottom when the button is clicked", async () => {
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();

      const viewport = screen.getByRole("log").querySelector(".chat-viewport")!;
      Object.defineProperty(viewport, "scrollTop", { value: 0, writable: true });
      Object.defineProperty(viewport, "scrollHeight", { value: 2000, writable: true });
      Object.defineProperty(viewport, "clientHeight", { value: 500, writable: true });

      fireEvent.scroll(viewport);

      const scrollBtn = await screen.findByLabelText("Scroll to bottom");
      fireEvent.click(scrollBtn);

      expect(globalThis.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
    });

    it("handles initialMessage prop by triggering handleSend", async () => {
      vi.mocked(clientApi.requestJson).mockResolvedValue({ text: "Auto-reply" });
      const setInput = vi.fn();
      const onMessageSent = vi.fn();
      
      const props = makeProps({ 
        initialMessage: "Seed message",
        setInput,
        onMessageSent 
      });

      render(<Chat {...props} />);
      
      // The initialMessage effect calls setInput and onMessageSent synchronously,
      // then schedules handleSend after 100ms. Since input is controlled and stays "",
      // handleSend will not fire requestJson, but setInput and onMessageSent are called.
      await waitFor(() => {
        expect(setInput).toHaveBeenCalledWith("Seed message");
        expect(onMessageSent).toHaveBeenCalled();
      }, { timeout: 1000 });
    });
  });

  // ── Message Deletion ──────────────────────────────────────────────────────

  describe("Message Deletion", () => {
    it("calls submitChat with a delete command when onDelete is triggered", async () => {
      mockHistory([
        { id: "msg-to-delete", role: "user", text: "Delete me", timestamp: "10:00" },
      ]);
      vi.mocked(clientApi.requestJson).mockResolvedValue({ text: "Deleted." });
      
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();

      // MessageBubble renders a delete button if onDelete is provided
      // The test-id is based on msg.id
      const deleteBtn = screen.getByTestId("delete-msg-msg-to-delete");
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(clientApi.requestJson).toHaveBeenCalledWith(
          "/api/chat",
          expect.objectContaining({
            body: expect.stringContaining('Delete the log for: \\"Delete me\\"'),
          }),
        );
      });
    });

    it("ignores delete requests if currently typing", async () => {
      mockHistory([
        { id: "msg-to-delete", role: "user", text: "Delete me", timestamp: "10:00" },
      ]);
      // Make requestJson hang so isTyping stays true
      let resolveFirst!: (v: unknown) => void;
      vi.mocked(clientApi.requestJson).mockReturnValue(
        new Promise((resolve) => { resolveFirst = resolve; }),
      );
      
      render(<Chat {...makeProps({ input: "Sending" })} />);
      await waitForHistoryLoad();

      // Trigger a send to set isTyping = true
      fireEvent.keyDown(screen.getByTestId("chat-input"), { key: "Enter", shiftKey: false });
      
      // Now try to delete a message
      const deleteBtn = screen.getByTestId("delete-msg-msg-to-delete");
      fireEvent.click(deleteBtn);

      // requestJson should have been called ONCE for the send, not twice for the delete
      expect(clientApi.requestJson).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveFirst({ text: "Done" });
      });
    });
  });

  // ── File Attachments ──────────────────────────────────────────────────────

  describe("File Attachments", () => {
    const dummyDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    /** Create a FileReader mock that properly sets this.result before calling onload */
    function stubFileReader(dataUrl: string) {
      class MockFileReader {
        result: string | null = null;
        onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
        onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;
        readAsDataURL() {
          this.result = dataUrl;
          if (this.onload) {
            this.onload({ target: { result: dataUrl } } as unknown as ProgressEvent<FileReader>);
          }
        }
      }
      vi.stubGlobal("FileReader", MockFileReader);
    }

    /** Get the hidden file input rendered by ChatInput */
    function getFileInput(): HTMLInputElement {
      return document.querySelector('input[type="file"]') as HTMLInputElement;
    }

    it("handles image file selection and renders preview", async () => {
      stubFileReader(dummyDataUrl);

      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();

      const fileInput = getFileInput();
      const file = new File(["(⌐□_□)"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByAltText("test.png")).toBeDefined();
      });
    });

    it("removes a pending attachment when the remove button is clicked", async () => {
      stubFileReader(dummyDataUrl);

      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();

      const fileInput = getFileInput();
      const file = new File(["(⌐□_□)"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByAltText("test.png")).toBeDefined();
      });

      const removeBtn = screen.getByLabelText("Remove test.png");
      fireEvent.click(removeBtn);

      expect(screen.queryByAltText("test.png")).toBeNull();
    });

    it("handles file selection errors", async () => {
      vi.stubGlobal("FileReader", class {
        readAsDataURL() {
          if (this.onerror) this.onerror(new ProgressEvent('error'));
        }
      });
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();

      const fileInput = getFileInput();
      fireEvent.change(fileInput, { target: { files: [new File([], "bad.png")] } });

      await waitFor(() => {
        expect(screen.getByText(/Unable to read selected file/i)).toBeInTheDocument();
      });
    });

    it("handles empty file selection", async () => {
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();
      const fileInput = getFileInput();
      fireEvent.change(fileInput, { target: { files: [] } });
      expect(screen.queryByText(/Unable to read selected file/i)).toBeNull();
    });

    it("handles null file selection", async () => {
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();
      const fileInput = getFileInput();
      // Force files to be null to cover the fallback `event.target.files ?? []`
      fireEvent.change(fileInput, { target: { files: null } });
      expect(screen.queryByText(/Unable to read selected file/i)).toBeNull();
    });

    it("handles unexpected FileReader result", async () => {
      vi.stubGlobal("FileReader", class {
        readAsDataURL() {
          this.result = 123; // Not a string
          if (this.onload) this.onload({} as any);
        }
      });
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();
      const fileInput = getFileInput();
      fireEvent.change(fileInput, { target: { files: [new File([], "bad.png")] } });
      await waitFor(() => {
        expect(screen.getByText(/Unexpected file reader result/i)).toBeInTheDocument();
      });
    });

    it("extracts media type from data URL correctly", async () => {
      // This is hit during send. We need to mock requestJson to succeed.
      vi.mocked(clientApi.requestJson).mockResolvedValue({ text: "Received" });
      stubFileReader("data:image/jpeg;base64,abc");
      
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();
      
      const fileInput = getFileInput();
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [new File([], "test.jpg")] } });
      });
      
      fireEvent.change(screen.getByTestId("chat-input"), { target: { value: "Look at this" } });
      fireEvent.keyDown(screen.getByTestId("chat-input"), { key: "Enter" });
      
      await waitFor(() => {
        expect(clientApi.requestJson).toHaveBeenCalledWith(
          "/api/chat",
          expect.objectContaining({
            body: expect.stringContaining("image/jpeg"),
          })
        );
      });
    });

    it("covers getMediaTypeFromDataUrl fallback", async () => {
      stubFileReader("data:;base64,abc"); // Missing type in data URL
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();
      
      const fileInput = getFileInput();
      // File with no type
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [new File([], "test.no-ext", { type: "" })] } });
      });
      
      fireEvent.change(screen.getByTestId("chat-input"), { target: { value: "Send file" } });
      fireEvent.keyDown(screen.getByTestId("chat-input"), { key: "Enter" });
      
      await waitFor(() => {
        expect(clientApi.requestJson).toHaveBeenCalledWith(
          "/api/chat",
          expect.objectContaining({
            body: expect.stringContaining("application/octet-stream"),
          })
        );
      });
    });

    it("covers missing comma in data URL and missing base64 marker", async () => {
      // No comma means base64 fallback "" is used.
      // "data:image/png" doesn't match the regex (missing ";base64$"), so match is null.
      stubFileReader("data:image/png"); 
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();
      
      const fileInput = getFileInput();
      // Provide a file without type so it relies on data URL parsing
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [new File([], "test.png", { type: "" })] } });
      });
      
      fireEvent.change(screen.getByTestId("chat-input"), { target: { value: "Send file" } });
      fireEvent.keyDown(screen.getByTestId("chat-input"), { key: "Enter" });
      
      await waitFor(() => {
        expect(clientApi.requestJson).toHaveBeenCalledWith(
          "/api/chat",
          expect.objectContaining({
            body: expect.stringContaining("application/octet-stream"),
          })
        );
      });
    });

    it("uses 'Audio message' fallback text for audio attachments", async () => {
      stubFileReader("data:audio/mp3;base64,abc");
      render(<Chat {...makeProps()} />);
      await waitForHistoryLoad();
      
      const fileInput = getFileInput();
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [new File([], "test.mp3", { type: "audio/mp3" })] } });
      });
      
      // Send without text
      fireEvent.keyDown(screen.getByTestId("chat-input"), { key: "Enter" });
      
      // Wait for the UI to update with the message bubble
      await waitFor(() => {
        expect(screen.getByText("Audio message")).toBeInTheDocument();
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

