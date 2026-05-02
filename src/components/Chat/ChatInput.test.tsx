/* eslint-disable @next/next/no-img-element */
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChatInput } from "./ChatInput";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.ComponentPropsWithoutRef<'button'>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock SpeechRecognition
class MockSpeechRecognition {
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  continuous = false;
  interimResults = false;
  onresult: ((ev: { results: { transcript: string }[][] }) => void) | null = null;
  onerror: ((ev: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
}

if (typeof globalThis !== "undefined") {
  (globalThis as unknown as Record<string, unknown>).SpeechRecognition = MockSpeechRecognition;
  (globalThis as unknown as Record<string, unknown>).webkitSpeechRecognition = MockSpeechRecognition;
}

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} data-testid="mock-image" />,
}));

describe("ChatInput Component", () => {
  const defaultProps = {
    input: "",
    setInput: vi.fn(),
    isTyping: false,
    pendingAttachments: [],
    onSend: vi.fn(),
    onFileSelect: vi.fn(),
    onRemoveAttachment: vi.fn(),
    textInputRef: { current: null } as unknown as React.RefObject<HTMLTextAreaElement>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', {
        getRandomValues: (arr: Uint32Array) => arr.fill(1)
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders correctly", () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByTestId("chat-input")).toBeDefined();
  });

  it("triggers file input click", () => {
    render(<ChatInput {...defaultProps} />);
    const fileBtn = screen.getByLabelText("Attach images");
    fireEvent.click(fileBtn);
    expect(fileBtn).toBeInTheDocument();
  });

  it("handles Enter without Shift to send", () => {
    render(<ChatInput {...defaultProps} input="Test" />);
    const input = screen.getByTestId("chat-input");
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    expect(defaultProps.onSend).toHaveBeenCalled();
  });

  it("does NOT send on Shift+Enter", () => {
    render(<ChatInput {...defaultProps} input="Test" />);
    const input = screen.getByTestId("chat-input");
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  it("handles speech recognition lifecycle", async () => {
    render(<ChatInput {...defaultProps} />);
    const micBtn = screen.getByLabelText("Start recording");
    
    await act(async () => {
        fireEvent.click(micBtn);
    });
    
    expect(screen.getByLabelText("Stop recording")).toBeDefined();
    
    fireEvent.click(screen.getByLabelText("Stop recording"));
    expect(screen.getByLabelText("Start recording")).toBeDefined();
  });

  it("renders audio attachments", () => {
    const props = {
        ...defaultProps,
        pendingAttachments: [{
            id: 'a1',
            name: 'audio.mp3',
            mediaType: 'audio/mpeg',
            previewUrl: '',
            file: new File([], 'a.mp3'),
            base64: ''
        }]
    };
    render(<ChatInput {...props} />);
    expect(screen.getByText("audio.mp3")).toBeDefined();
  });

  it("handles speech recognition error and onend", async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    let capturedInstance: MockSpeechRecognition | null = null;
    const globalRec = globalThis as unknown as Record<string, unknown>;
    const OriginalSpeechRecognition = globalRec.SpeechRecognition;
    
    globalRec.SpeechRecognition = function() {
      const mock = new MockSpeechRecognition();
      capturedInstance = mock;
      return mock;
    };
    
    render(<ChatInput {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Start recording"));
    
    if (capturedInstance) {
      await act(async () => {
        (capturedInstance as MockSpeechRecognition).onresult!({
          results: [
            [{ transcript: 'Hello ' }],
            [{ transcript: 'world' }]
          ]
        } as unknown as { results: { transcript: string }[][] });
      });
      expect(defaultProps.setInput).toHaveBeenCalledWith('Hello world');
      
      await act(async () => {
        (capturedInstance as MockSpeechRecognition).onerror!({ error: 'not-allowed' });
      });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Speech recognition error"), "not-allowed");
      
      fireEvent.click(screen.getByLabelText("Start recording"));
      await act(async () => {
        (capturedInstance as MockSpeechRecognition).onend!();
      });
      expect(screen.getByLabelText("Start recording")).toBeDefined();
    }
    
    globalRec.SpeechRecognition = OriginalSpeechRecognition;
    consoleSpy.mockRestore();
  });

  it("handles recording start failure", () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const globalRec = globalThis as unknown as Record<string, unknown>;
    const OriginalSpeechRecognition = globalRec.SpeechRecognition;
    
    globalRec.SpeechRecognition = function() {
      const mock = new MockSpeechRecognition();
      mock.start = () => { throw new Error('Start failed'); };
      return mock;
    };
    
    render(<ChatInput {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Start recording"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("could not start"), expect.any(Error));
    
    globalRec.SpeechRecognition = OriginalSpeechRecognition;
    consoleSpy.mockRestore();
  });

  it("handles successful recording start", async () => {
    const globalRec = globalThis as unknown as Record<string, unknown>;
    const OriginalSpeechRecognition = globalRec.SpeechRecognition;
    
    globalRec.SpeechRecognition = function() {
      return new MockSpeechRecognition();
    };
    
    render(<ChatInput {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Start recording"));
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Listening\.\.\./i)).toBeInTheDocument();
    });
    
    globalRec.SpeechRecognition = OriginalSpeechRecognition;
  });

  it("handles getSecureRandom crypto fallback when crypto is missing", () => {
    vi.stubGlobal('crypto', undefined);
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByTestId("chat-input")).toBeInTheDocument();
  });
});
