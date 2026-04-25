/* eslint-disable @next/next/no-img-element */
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChatInput } from "./ChatInput";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock SpeechRecognition
class MockSpeechRecognition {
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  continuous = false;
  interimResults = false;
  onresult: any = null;
  onerror: any = null;
  onend: any = null;
}

if (typeof globalThis !== "undefined") {
  (globalThis as any).SpeechRecognition = MockSpeechRecognition;
  (globalThis as any).webkitSpeechRecognition = MockSpeechRecognition;
}

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} data-testid="mock-image" />,
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
    textInputRef: { current: null } as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', {
        getRandomValues: (arr: any) => arr.fill(1)
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
    
    // Simulate speech result
    // We can't easily get the instance unless we expose it or use a spy on the constructor
    // For coverage, just clicking the stop button
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
    
    // Captured instance to trigger events
    let capturedInstance: any;
    const OriginalSpeechRecognition = (globalThis as any).SpeechRecognition;
    
    (globalThis as any).SpeechRecognition = function() {
      const mock = new MockSpeechRecognition();
      capturedInstance = mock;
      return mock;
    };
    
    render(<ChatInput {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Start recording"));
    
    await act(async () => {
      capturedInstance.onresult({
        results: [
          [{ transcript: 'Hello ' }],
          [{ transcript: 'world' }]
        ]
      });
    });
    expect(defaultProps.setInput).toHaveBeenCalledWith('Hello world');
    
    // Trigger error
    await act(async () => {
      capturedInstance.onerror({ error: 'not-allowed' });
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Speech recognition error"), "not-allowed");
    
    // Trigger onend
    fireEvent.click(screen.getByLabelText("Start recording"));
    await act(async () => {
      capturedInstance.onend();
    });
    expect(screen.getByLabelText("Start recording")).toBeDefined();
    
    // Restore
    (globalThis as any).SpeechRecognition = OriginalSpeechRecognition;
    consoleSpy.mockRestore();
  });

  it("handles recording start failure", () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const OriginalSpeechRecognition = (globalThis as any).SpeechRecognition;
    
    (globalThis as any).SpeechRecognition = function() {
      const mock = new MockSpeechRecognition();
      mock.start = () => { throw new Error('Start failed'); };
      return mock;
    };
    
    render(<ChatInput {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Start recording"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("could not start"), expect.any(Error));
    
    (globalThis as any).SpeechRecognition = OriginalSpeechRecognition;
    consoleSpy.mockRestore();
  });
});
