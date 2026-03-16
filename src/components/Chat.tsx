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
}

type ChatResponse = {
  text?: string;
  error?: string;
  warning?: string;
};

export default function Chat({ onLogParsed }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      role: "model",
      text:
        "Good morning! 👋 I'm your LiveFit AI - speak naturally to log anything.\n\n🔍 \"Had 3 egg omelette and 150ml milk for breakfast\"\n💪 \"Finished chest day, 3200kg volume, 8 PRs\"\n😴 \"Slept 7.5h, bed at 11pm, woke at 6:30\"\n⚖️ \"Weight 70.5kg this morning\"",
      timestamp: "",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingImages, setPendingImages] = useState<ChatImageAttachment[]>([]);
  const [notice, setNotice] = useState<InlineNotice | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === "welcome-msg" && message.timestamp === ""
          ? {
              ...message,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }
          : message
      )
    );
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

    if ((!userText && attachedImages.length === 0) || isTyping) {
      return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: userText || "Image attached",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      images: attachedImages,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPendingImages([]);
    setIsTyping(true);
    setNotice(null);

    try {
      const history = messages.map((message) => ({
        role: message.role,
        parts: [{ text: message.text }],
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

      if (data.text) {
        const dataMatch = data.text.match(/\|\|\|DATA\n([\s\S]*?)\n\|\|\|/);
        let cleanText = data.text;

        if (dataMatch) {
          try {
            JSON.parse(dataMatch[1]) as unknown;
            onLogParsed();
            cleanText = cleanText.replace(/\|\|\|DATA[\s\S]*?\|\|\|/, "").trim();
          } catch (error) {
            console.error("Failed to parse log data:", error);
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "model",
            text: cleanText,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }

      if (data.warning) {
        setNotice({
          tone: "warning",
          message: data.warning,
        });
      }
    } catch (error) {
      const message = getClientErrorMessage(error);
      console.error("Chat connection error:", message);
      setNotice({
        tone: "error",
        message,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "model",
          text: `Unable to connect to AI service. ${message}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
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
    <div className="flex-1 min-w-0 h-full bg-[var(--surface)] rounded-[32px] flex flex-col shadow-[0_0_0_1px_var(--border),var(--shadow-lg)] overflow-hidden transition-all duration-300">
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth h-full no-scrollbar chat-viewport">
        <div className="w-full flex flex-col min-h-full chat-content-v-inset">
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
                        <User className="w-5 h-5" />
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

                      {msg.role === "model" && msg.text.includes("LiveFit AI") ? (
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

      <div className="chat-footer-container chat-viewport">
        {notice && (
          <div
            className={`notice-banner notice-banner-${notice.tone} chat-notice`}
            role="status"
            aria-live="polite"
          >
            {notice.message}
          </div>
        )}

        <div className="chat-quick-chips-row no-scrollbar">
          <QuickChip
            icon={Coffee}
            label="Breakfast"
            onClick={() => setInput("Log my breakfast")}
          />
          <QuickChip
            icon={Dumbbell}
            label="Workout"
            onClick={() => setInput("Record my training session")}
          />
          <QuickChip
            icon={Moon}
            label="Sleep"
            onClick={() => setInput("Show my sleep data")}
          />
          <QuickChip
            icon={Info}
            label="Protein left?"
            onClick={() => setInput("How is my protein intake?")}
          />
          <QuickChip
            icon={ImageIcon}
            label="Summary"
            onClick={() => setInput("Give me a summary")}
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
          >
            <ImageIcon className="w-5 h-5" />
          </motion.button>

          <div className="chat-input-box">
            <input
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
            />
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => void handleSend()}
            disabled={isTyping || (!input.trim() && pendingImages.length === 0)}
            className="chat-send-btn-square"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

interface QuickChipProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly onClick: () => void;
}

function QuickChip({ icon: Icon, label, onClick }: QuickChipProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, translateY: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="chat-quick-chip"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </motion.button>
  );
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
