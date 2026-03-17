"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ImageIcon,
  Coffee,
  Dumbbell,
  Moon,
  Info,
  User,
  ArrowUp,
  Activity,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getClientErrorMessage, requestJson } from "@/lib/client-api";
import type {
  ChatImageAttachment,
  ChatImagePayload,
  InlineNotice,
} from "@/lib/types";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  images?: ChatImageAttachment[];
}

interface ChatProps {
  readonly onLogParsed: () => void;
  readonly isNewUser?: boolean;
}

type ChatResponse = {
  text?: string;
  error?: string;
  warning?: string;
};

export default function Chat({ onLogParsed, isNewUser }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      role: "model",
      text: isNewUser 
        ? "Welcome to LiveFit! 👋 I'm your AI assistant. To help you set your targets, could you tell me your age, gender, height, and primary fitness goal?"
        : "Good morning! 👋 I'm your LiveFit AI - speak naturally to log anything.\n\n🔍 \"Had 3 egg omelette and 150ml milk for breakfast\"\n💪 \"Finished chest day, 3200kg volume, 8 PRs\"\n😴 \"Slept 7.5h, bed at 11pm, woke at 6:30\"\n⚖️ \"Weight 70.5kg this morning\"",
      timestamp: "",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingImages, setPendingImages] = useState<ChatImageAttachment[]>([]);
  const [notice, setNotice] = useState<InlineNotice | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const attachedImages = [...pendingImages];

    if ((!userText && attachedImages.length === 0) || isTyping) return;

    const userMsg = createChatMessage("user", userText || "Image attached", attachedImages);
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPendingImages([]);
    setIsTyping(true);
    setNotice(null);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const data = await requestJson<ChatResponse>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userText,
          history,
          images: attachedImages.map(toPayload),
        }),
      });

      processChatResponse(data);
    } catch (error) {
      handleChatError(error);
    } finally {
      setIsTyping(false);
    }
  };

  const processChatResponse = (data: ChatResponse) => {
    if (data.text) {
      const { hasData, cleanText } = extractAndCleanData(data.text);

      if (hasData) {
        console.log("AI Data block detected! Triggering UI refresh...");
        onLogParsed();
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
    
    const errorMsg = createChatMessage("model", `Unable to connect to AI service. ${message}`);
    setMessages((prev) => [...prev, errorMsg]);
  };

  const handleFileSelection = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    try {
      const newImages = await Promise.all(files.map(readImageFile));
      setPendingImages((current) => [...current, ...newImages]);
      setNotice(null);
    } catch (error) {
      const message = getClientErrorMessage(error);
      console.error("Failed to read image attachment:", message);
      setNotice({
        tone: "error",
        message: `Unable to read selected image: ${message}`,
      });
    } finally {
      event.target.value = "";
    }
  };

  const removePendingImage = (imageId: string) => {
    setPendingImages((current) =>
      current.filter((image) => image.id !== imageId)
    );
  };

  return (
    <div className="flex-1 min-w-0 h-full bg-[var(--surface)] rounded-[32px] flex flex-col border border-[var(--border)] shadow-[var(--shadow-lg)] overflow-hidden transition-all duration-300 [background-clip:padding-box] [transform:translateZ(0)] [mask-image:linear-gradient(#fff,#fff)] relative"
      role="log"
      aria-label="Chat history"
      aria-live="polite"
    >
      <div 
        ref={viewportRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth h-full no-scrollbar chat-viewport rounded-[inherit]"
      >
        <div className="w-full flex flex-col chat-content-v-inset">
          {isLoadingHistory ? (
            <div className="flex justify-center py-6">
              <Activity className="w-6 h-6 animate-pulse" style={{ color: "#e67e22" }} />
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {messages.map((msg, index) => {
              const isFirstInGroup =
                index === 0 || messages[index - 1].role !== msg.role;

              return (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`chat-msg-row ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  } ${isFirstInGroup ? "mt-6" : "mt-1"}`}
                >
                  <div
                    className={`chat-avatar-container ${
                      isFirstInGroup ? "" : "invisible opacity-0 h-0"
                    }`}
                  >
                    <div
                      className={`chat-avatar ${
                        msg.role === "model"
                          ? "bg-[var(--accent)] text-[var(--accent-inv)]"
                          : "bg-[var(--surface2)] text-[var(--text)]"
                      }`}
                    >
                      {msg.role === "model" ? (
                        <Activity
                          className="w-4.5 h-4.5 text-[var(--accent-inv)]"
                          strokeWidth={3}
                        />
                      ) : (
                        <User className="w-5 h-5" style={{ color: '#7b5ea7' }} />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col max-w-[80%] group">
                    <div
                      className={`chat-msg-bubble relative ${
                        msg.role === "model"
                          ? "chat-bubble-model"
                          : "chat-bubble-user"
                      }`}
                    >
                      {msg.images && msg.images.length > 0 && (
                        <div className="chat-msg-image-grid">
                          {msg.images.map((image) => (
                            <div key={image.id} className="chat-msg-image-frame">
                              <Image
                                src={image.previewUrl}
                                alt={image.name}
                                fill
                                unoptimized
                                className="chat-msg-image"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.role === "model" && msg.id === "welcome-msg" && !isNewUser ? (
                        <div>
                          <p>
                            Good morning! 👋{" "}
                            <span className="chat-accent-text">
                              I&apos;m your LiveFit AI
                            </span>{" "}
                            - speak naturally to log anything.
                          </p>
                          <div className="chat-bullet-list">
                            {[
                              {
                                id: "search",
                                icon: "🔍",
                                text: '"Had 3 egg omelette and 150ml milk for breakfast"',
                              },
                              {
                                id: "work",
                                icon: "💪",
                                text: '"Finished chest day, 3200kg volume, 8 PRs"',
                              },
                              {
                                id: "sleep",
                                icon: "😴",
                                text: '"Slept 7.5h, bed at 11pm, woke at 6:30"',
                              },
                              {
                                id: "weight",
                                icon: "⚖️",
                                text: '"Weight 70.5kg this morning"',
                              },
                            ].map((item) => (
                              <div key={item.id} className="chat-bullet-item">
                                <span className="chat-bullet-icon">
                                  {item.icon}
                                </span>
                                <span className="chat-bullet-text">
                                  {item.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span>{msg.text}</span>
                      )}

                      <span className="chat-message-timestamp">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                </motion.div>
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
            <ArrowUp className="w-5 h-5 rotate-180" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="chat-footer-container">
        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
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

        <div className="chat-quick-chips-row no-scrollbar">
          <QuickChip
            icon={Coffee}
            label="Breakfast"
            color="#e6ac50"
            onClick={() => {
              setInput("Log my breakfast");
              textInputRef.current?.focus();
            }}
          />
          <QuickChip
            icon={Dumbbell}
            label="Workout"
            color="#c0392b"
            onClick={() => {
              setInput("Record my training session");
              textInputRef.current?.focus();
            }}
          />
          <QuickChip
            icon={Moon}
            label="Sleep"
            color="#6b7ea8"
            onClick={() => {
              setInput("Show my sleep data");
              textInputRef.current?.focus();
            }}
          />
          <QuickChip
            icon={Info}
            label="Protein left?"
            color="#4db382"
            onClick={() => {
              setInput("How is my protein intake?");
              textInputRef.current?.focus();
            }}
          />
          <QuickChip
            icon={ImageIcon}
            label="Summary"
            color="#7b5ea7"
            onClick={() => {
              setInput("Give me a summary");
              textInputRef.current?.focus();
            }}
          />
        </div>

        {pendingImages.length > 0 && (
          <div className="chat-attachments-strip">
            {pendingImages.map((image) => (
              <div key={image.id} className="chat-attachment-thumb">
                <div className="chat-attachment-thumb-image">
                  <Image
                    src={image.previewUrl}
                    alt={image.name}
                    fill
                    unoptimized
                    className="chat-msg-image"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePendingImage(image.id)}
                  className="chat-attachment-remove"
                  aria-label={`Remove ${image.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="chat-input-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelection}
          />

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`chat-photo-btn ${
              pendingImages.length > 0 ? "chat-photo-btn-active" : ""
            }`}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach images"
            suppressHydrationWarning
          >
            <ImageIcon className="w-5 h-5" style={{ color: '#7b5ea7' }} />
          </motion.button>

          <div className="chat-input-box">
            <input
              ref={textInputRef}
              className="chat-input-field"
              type="text"
              placeholder="Tell me what you ate, your workout, sleep... or attach a photo 📷"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              suppressHydrationWarning
            />
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => void handleSend()}
            disabled={isTyping || (!input.trim() && pendingImages.length === 0)}
            className="chat-send-btn-square"
            suppressHydrationWarning
          >
            <ArrowUp className="w-5 h-5" style={{ color: 'var(--accent-inv)' }} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

interface QuickChipProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly color?: string;
  readonly onClick: () => void;
}

function QuickChip({ icon: Icon, label, color, onClick }: QuickChipProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, translateY: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="chat-quick-chip"
      suppressHydrationWarning
    >
      <Icon className="w-3.5 h-3.5" style={{ color }} />
      {label}
    </motion.button>
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
      : msg
  );
}

function createChatMessage(
  role: "user" | "model",
  text: string,
  images?: ChatImageAttachment[]
): Message {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    images,
  };
}

function extractAndCleanData(text: string): { hasData: boolean; cleanText: string } {
  const startMarker = "|||DATA";
  const endMarker = "|||";
  let hasData = false;
  let currentPos = 0;

  // Detect
  while (true) {
    const s = text.indexOf(startMarker, currentPos);
    if (s === -1) break;
    const c = s + startMarker.length;
    const e = text.indexOf(endMarker, c);
    if (e === -1) break;

    hasData = true;
    const json = text.substring(c, e).trim();
    try {
      if (json) JSON.parse(json);
    } catch (err) {
      console.error("Failed to parse log data:", err);
    }
    currentPos = e + endMarker.length;
  }

  // Clean
  let cleanText = text;
  let sIdx = cleanText.indexOf(startMarker);
  while (sIdx >= 0) {
    const eIdx = cleanText.indexOf(endMarker, sIdx + startMarker.length);
    if (eIdx >= 0) {
      cleanText =
        cleanText.substring(0, sIdx) + cleanText.substring(eIdx + endMarker.length);
      sIdx = cleanText.indexOf(startMarker);
    } else {
      break;
    }
  }

  return { hasData, cleanText: cleanText.trim() };
}

function toPayload(image: ChatImageAttachment): ChatImagePayload {
  return {
    base64: image.base64,
    mediaType: image.mediaType,
    name: image.name,
  };
}

async function readImageFile(file: File): Promise<ChatImageAttachment> {
  const previewUrl = await readFileAsDataUrl(file);
  const [prefix, base64 = ""] = previewUrl.split(",");
  const mediaType = file.type || getMediaTypeFromDataUrl(prefix) || "image/jpeg";

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
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function getMediaTypeFromDataUrl(prefix: string): string | null {
  const match = /^data:(.*?);base64$/i.exec(prefix);
  return match?.[1] ?? null;
}
