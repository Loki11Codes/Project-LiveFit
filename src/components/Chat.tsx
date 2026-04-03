"use client";

import React, { useEffect, useRef, useState } from "react";
import { Activity, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getClientErrorMessage, requestJson } from "@/lib/client-api";
import type {
  ChatAttachment,
  ChatAttachmentPayload,
  InlineNotice,
} from "@/lib/types";
import { extractAndCleanLogData } from "@/lib/chat-utils";

import { MessageBubble, type Message } from "./Chat/MessageBubble";
import { QuickChips } from "./Chat/QuickChips";
import { ChatInput } from "./Chat/ChatInput";

interface ChatProps {
  readonly onLogParsed: (logs?: import("@/lib/persistence").ParsedLogEnvelope[], hasData?: boolean) => void;
  readonly isNewUser?: boolean;
  readonly initialMessage?: string | null;
  readonly onMessageSent?: () => void;
  readonly nudgeStatus?: {
    protein: number;
    proteinTarget: number;
    calories: number;
    calorieTarget: number;
  };
  readonly input: string;
  readonly setInput: (val: string) => void;
}

type ChatResponse = {
  text?: string;
  error?: string;
  warning?: string;
};

export default function Chat({
  onLogParsed,
  isNewUser,
  initialMessage,
  onMessageSent,
  nudgeStatus,
  input,
  setInput,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      role: "model",
      text: isNewUser
        ? "Welcome to LiveFit! 👋 I'm your AI assistant. To help you set your targets, could you tell me your age, gender, height, and primary fitness goal?"
        : 'Good morning! 👋 I\'m your LiveFit AI - speak naturally to log anything.\n\n🔍 "Had 3 egg omelette and 150ml milk for breakfast"\n💪 "Finished chest day, 3200kg volume, 8 PRs"\n😴 "Slept 7.5h, bed at 11pm, woke at 6:30"\n⚖️ "Weight 70.5kg this morning"',
      timestamp: "",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    ChatAttachment[]
  >([]);
  const [notice, setNotice] = useState<InlineNotice | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const isInitialMount = useRef(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollBottom(!isAtBottom);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Proactive Nudge logic
    if (
      nudgeStatus &&
      messages.length === 1 &&
      messages[0].id === "welcome-msg"
    ) {
      const alreadyHasNudge = messages.some((m) => m.id === "protein-nudge");
      if (alreadyHasNudge) return;

      const proteinPct =
        (nudgeStatus.protein / nudgeStatus.proteinTarget) * 100;
      if (proteinPct < 50) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === "protein-nudge")) return prev;
          return [
            ...prev,
            {
              id: "protein-nudge",
              role: "model",
              text: `I noticed you're a bit behind on your protein goal today (${Math.round(nudgeStatus.protein)}g / ${nudgeStatus.proteinTarget}g). Would you like some high-protein dinner ideas to help you catch up? 🥩`,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ];
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudgeStatus, messages.length]);

  useEffect(() => {
    if (initialMessage) {
      setInput(initialMessage);
      onMessageSent?.();
      // We use a small timeout to ensure the input state is updated before sending
      const timeoutId = setTimeout(() => {
        handleSend();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/chat/history");
        if (!res.ok) return;

        const data = (await res.json()) as Message[];
        if (data && data.length > 0) {
          setMessages(data);
        } else {
          setMessages((prev) => updateWelcomeMessageTimestamp(prev));
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    void fetchHistory();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const userText = input.trim();
    const attachedFiles = [...pendingAttachments];

    if ((!userText && attachedFiles.length === 0) || isTyping) return;

    const userMsg = createChatMessage(
      "user",
      userText ||
        (attachedFiles.some((a) => a.mediaType.startsWith("audio"))
          ? "Audio message"
          : "Image attached"),
      attachedFiles,
    );
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPendingAttachments([]);
    setIsTyping(true);
    setNotice(null);

    await submitChat(userText, attachedFiles);
    setIsTyping(false);
  };

  const submitChat = async (prompt: string, images: ChatAttachment[] = []) => {
    try {
      const history = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const now = new Date();
      const clientDate =
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0");
      const clientTime =
        String(now.getHours()).padStart(2, "0") +
        ":" +
        String(now.getMinutes()).padStart(2, "0");

      const data = await requestJson<ChatResponse>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          history,
          images: images.map(toPayload),
          clientDate,
          clientTime,
        }),
      });

      processChatResponse(data);
    } catch (error) {
      handleChatError(error);
    }
  };

  const handleDeleteMessage = async (msg: Message) => {
    if (isTyping) return;
    
    setIsTyping(true);
    setNotice(null);
    
    // Construct a specific command for the AI to "undo" or delete the log from that message
    const deleteCommand = `Delete the log for: "${msg.text}"`;
    
    await submitChat(deleteCommand);
    setIsTyping(false);
  };

  const processChatResponse = (data: ChatResponse) => {
    if (data.text) {
      const { hasData, cleanText, logs } = extractAndCleanLogData(data.text);

      onLogParsed?.(logs, hasData);

      if (!hasData) {
        // Safety Fallback: AI sometimes forgets the DATA block but confirms in text.
        const stateKeywords = [
          "training",
          "lite",
          "light",
          "rest",
          "logged",
          "recorded",
          "saved",
          "deleted",
          "removed",
        ];
        const lowerText = cleanText.toLowerCase();
        if (stateKeywords.some((kw) => lowerText.includes(kw))) {
          onLogParsed([]);
        }
      }

      const modelMsg = createChatMessage("model", cleanText);
      setMessages((prev) => [...prev, modelMsg]);
    }

    if (data.warning) {
      setNotice({ tone: "warning", message: data.warning });
    }
  };

  const handleChatError = (error: unknown) => {
    const message = getClientErrorMessage(error);
    console.error("Chat connection error:", message);
    setNotice({ tone: "error", message });

    const errorMsg = createChatMessage(
      "model",
      `Unable to connect to AI service. ${message}`,
    );
    setMessages((prev) => [...prev, errorMsg]);
  };

  const handleFileSelection = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    try {
      const newAttachments = await Promise.all(files.map(readAttachmentFile));
      setPendingAttachments((current) => [...current, ...newAttachments]);
      setNotice(null);
    } catch (error) {
      const message = getClientErrorMessage(error);
      console.error("Failed to read attachment:", message);
      setNotice({
        tone: "error",
        message: `Unable to read selected file: ${message}`,
      });
    } finally {
      event.target.value = "";
    }
  };

  const removePendingAttachment = (attachmentId: string) => {
    setPendingAttachments((current) =>
      current.filter((att) => att.id !== attachmentId),
    );
  };

  const handleQuickChipSelect = (text: string) => {
    setInput(text);
    textInputRef.current?.focus();
  };

  return (
    <div
      className="flex-1 min-w-0 h-full bg-[var(--surface)] rounded-[var(--radius-xl)] flex flex-col border border-[var(--border)] shadow-[var(--shadow-lg)] overflow-hidden transition-all duration-300 [background-clip:padding-box] [transform:translateZ(0)] [mask-image:linear-gradient(#fff,#fff)] relative"
      role="log"
      aria-label="Chat history"
      aria-live="polite"
    >
      <div
        ref={viewportRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth no-scrollbar chat-viewport rounded-[inherit]"
      >
        <div className="w-full flex flex-col chat-content-v-inset">
          {isLoadingHistory ? (
            <div className="flex justify-center py-6" data-testid="chat-loader">
              <Activity
                className="w-6 h-6 animate-pulse"
                style={{ color: "#e67e22" }}
                strokeWidth={2.5}
              />
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {messages.map((msg, index) => {
                const isFirstInGroup =
                  index === 0 || messages[index - 1].role !== msg.role;
                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isFirstInGroup={isFirstInGroup}
                    isNewUser={isNewUser}
                    onDelete={handleDeleteMessage}
                  />
                );
              })}
            </AnimatePresence>
          )}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="chat-msg-row mt-4"
            >
              <div className="chat-avatar bg-[var(--accent)] text-[var(--accent-inv)]">
                <Activity
                  className="w-4.5 h-4.5 text-[var(--accent-inv)] animate-pulse"
                  strokeWidth={3}
                />
              </div>
              <div className="chat-msg-bubble chat-bubble-model flex gap-2 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40 animate-bounce [animation-duration:1s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40 animate-bounce [animation-duration:1s] [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40 animate-bounce [animation-duration:1s] [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}
        </div>
        <div ref={chatEndRef} />
      </div>

      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-40 right-8 z-50 w-10 h-10 rounded-full bg-[var(--accent)] text-[var(--accent-inv)] shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
            aria-label="Scroll to bottom"
          >
            <ArrowUp className="w-5 h-5 rotate-180" strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="chat-footer-container">
        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className={`notice-banner notice-banner-${notice.tone} chat-notice`}
                role="status"
                aria-live="polite"
              >
                {notice.message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <QuickChips onSelect={handleQuickChipSelect} />

        <ChatInput
          input={input}
          setInput={setInput}
          isTyping={isTyping}
          pendingAttachments={pendingAttachments}
          onSend={handleSend}
          onFileSelect={handleFileSelection}
          onRemoveAttachment={removePendingAttachment}
          textInputRef={textInputRef}
        />
      </div>
    </div>
  );
}

function updateWelcomeMessageTimestamp(prev: Message[]): Message[] {
  return prev.map((msg) =>
    msg.id === "welcome-msg" && msg.timestamp === ""
      ? {
          ...msg,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }
      : msg,
  );
}

function createChatMessage(
  role: "user" | "model",
  text: string,
  attachments?: ChatAttachment[],
): Message {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    attachments,
  };
}

function toPayload(attachment: ChatAttachment): ChatAttachmentPayload {
  return {
    base64: attachment.base64,
    mediaType: attachment.mediaType,
    name: attachment.name,
  };
}

async function readAttachmentFile(file: File): Promise<ChatAttachment> {
  const previewUrl = await readFileAsDataUrl(file);
  const [prefix, base64 = ""] = previewUrl.split(",");
  const mediaType =
    file.type || getMediaTypeFromDataUrl(prefix) || "application/octet-stream";

  return {
    id: crypto.randomUUID(),
    base64,
    mediaType,
    previewUrl,
    name: file.name,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unexpected file reader result."));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function getMediaTypeFromDataUrl(prefix: string): string | null {
  const match = /^data:(.*?);base64$/i.exec(prefix);
  return match?.[1] ?? null;
}
