 
/* eslint-disable @next/next/no-img-element */
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChatInput } from "./ChatInput";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      style,
      ...props
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props} style={style}>
        {children}
      </div>
    ),
    button: ({
      children,
      style,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props} style={style}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock SpeechRecognition
class MockSpeechRecognition {
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}

if (typeof globalThis !== "undefined") {
  Object.defineProperty(globalThis, "SpeechRecognition", {
    writable: true,
    value: MockSpeechRecognition,
  });
}

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img src={src} alt={alt} data-testid="mock-image" />
  ),
}));

describe("ChatInput Component", () => {
  const defaultProps = {
    input: "",
    setInput: vi.fn(),
    isTyping: false,
    pendingAttachments: [],
    onSend: vi.fn(),
    onFileSelect: vi.fn(),
    onAudioRecorded: vi.fn(),
    onRemoveAttachment: vi.fn(),
    textInputRef: { current: null },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the input field correctly", () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByTestId("chat-input")).toBeDefined();
  });

  it("calls setInput when typing", () => {
    render(<ChatInput {...defaultProps} />);
    const input = screen.getByTestId("chat-input");
    fireEvent.change(input, { target: { value: "Hello world" } });
    expect(defaultProps.setInput).toHaveBeenCalledWith("Hello world");
  });

  it("calls onSend when Enter is pressed", () => {
    render(<ChatInput {...defaultProps} input="Test message" />);
    const input = screen.getByTestId("chat-input");
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", shiftKey: false });
    expect(defaultProps.onSend).toHaveBeenCalled();
  });

  it("renders mic button when input is empty", () => {
    render(<ChatInput {...defaultProps} input="" />);
    expect(screen.getByLabelText("Start recording")).toBeDefined();
  });

  it("renders send button when input has text", () => {
    render(<ChatInput {...defaultProps} input="Hello" />);
    expect(screen.getByLabelText("Send message")).toBeDefined();
  });

  it("calls onSend when send button is clicked", () => {
    render(<ChatInput {...defaultProps} input="Hello" />);
    const sendBtn = screen.getByLabelText("Send message");
    fireEvent.click(sendBtn);
    expect(defaultProps.onSend).toHaveBeenCalled();
  });

  it("renders pending attachments correctly", () => {
    const props = {
      ...defaultProps,
      pendingAttachments: [
        {
          id: "1",
          file: new File([], "img.png"),
          previewUrl: "foo.png",
          mediaType: "image/png",
          name: "img.png",
          base64: "data:image/png;base64,foo",
        },
      ],
    };
    render(<ChatInput {...props} />);
    expect(screen.getByTestId("mock-image")).toBeDefined();
  });

  it("calls onRemoveAttachment when remove button is clicked", () => {
    const props = {
      ...defaultProps,
      pendingAttachments: [
        {
          id: "1",
          file: new File([], "img.png"),
          previewUrl: "foo.png",
          mediaType: "image/png",
          name: "img.png",
          base64: "data:image/png;base64,foo",
        },
      ],
      onRemoveAttachment: vi.fn(),
    };
    render(<ChatInput {...props} />);
    const removeBtn = screen.getByLabelText("Remove img.png");
    fireEvent.click(removeBtn);
    expect(props.onRemoveAttachment).toHaveBeenCalledWith("1");
  });
});

