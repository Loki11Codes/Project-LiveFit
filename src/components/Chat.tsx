"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Image as ImageIcon,
  Sparkles,
  Coffee,
  Dumbbell,
  Moon,
  Info,
  User,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
}

interface ChatProps {
  readonly onLogParsed: (category: string, data: any) => void;
}

export default function Chat({ onLogParsed }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: crypto.randomUUID(),
      role: "model",
      text: "Connection established. How can I assist you with your fitness goals today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const scrollToBottom = () => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: userText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText, history }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "model",
            text: `Connection issue: ${data.error}`,
          },
        ]);
        return;
      }

      if (data.text) {
        const dataMatch = data.text.match(/\|\|\|DATA\n([\s\S]*?)\n\|\|\|/);
        let cleanText = data.text;

        if (dataMatch) {
          try {
            const logData = JSON.parse(dataMatch[1]);
            onLogParsed(logData.category, logData.data);
            cleanText = cleanText
              .replace(/\|\|\|DATA[\s\S]*?\|\|\|/, "")
              .trim();
          } catch (e) {
            console.error("Failed to parse log data:", e);
          }
        }

        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "model", text: cleanText },
        ]);
      }
    } catch (e) {
      console.error("Chat connection error:", e);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "model",
          text: "Unable to connect to AI service.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 min-w-0 h-[625px]">
      <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-[32px] flex flex-col shadow-2xl shadow-black/5 overflow-hidden transition-all duration-300">
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth h-full no-scrollbar chat-viewport">
          <div className="w-full flex flex-col gap-10 min-h-full chat-content-v-inset">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 items-start animate-in fade-in slide-in-from-bottom-4 duration-500 min-w-0 ${
                  msg.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-[13px] font-bold flex-shrink-0 mt-1 shadow-md ${
                    msg.role === "model"
                      ? "bg-[var(--accent)] text-[var(--accent-inv)]"
                      : "bg-[var(--surface2)] text-[var(--text)] border border-[var(--border)]"
                  }`}
                >
                  {msg.role === "model" ? (
                    <Sparkles className="w-5 h-5 transition-transform hover:scale-110" />
                  ) : (
                    <User className="w-5 h-5 transition-transform hover:scale-110" />
                  )}
                </div>
                <div
                  className={`max-w-[85%] md:max-w-[75%] min-w-0 w-fit px-6 py-4.5 rounded-[28px] text-[15px] leading-relaxed font-medium tracking-tight break-words overflow-wrap-anywhere whitespace-pre-wrap flex-shrink shadow-sm border ${
                    msg.role === "model"
                      ? "bg-[var(--surface2)]/40 text-[var(--text)] rounded-bl-none border-[var(--border)]/60"
                      : "bg-[#1f2937] dark:bg-[var(--accent)] text-white dark:text-[var(--accent-inv)] rounded-br-none shadow-xl shadow-black/10 dark:shadow-[var(--accent)]/15 border-[#374151] dark:border-[var(--accent)]/10"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-4 items-start animate-in fade-in duration-300">
                <div className="w-11 h-11 rounded-2xl bg-[var(--accent)] text-[var(--accent-inv)] flex items-center justify-center flex-shrink-0 shadow-md">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div className="px-6 py-4 rounded-[28px] bg-[var(--surface2)]/40 flex gap-2.5 items-center border border-[var(--border)]/60 flex-shrink-0 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40 animate-bounce [animation-duration:1s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40 animate-bounce [animation-duration:1s] [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40 animate-bounce [animation-duration:1s] [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>
          <div ref={chatEndRef} />
        </div>

        <div className="pb-6 pt-2 chat-viewport">
          <div className="w-full flex flex-nowrap gap-3 overflow-x-auto no-scrollbar chat-chip-row">
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
              label="Sleep Stats"
              onClick={() => setInput("Show my sleep data")}
            />
            <QuickChip
              icon={Info}
              label="Protein Check"
              onClick={() => setInput("How is my protein intake?")}
            />
          </div>
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-md relative chat-footer-inset">
          <div className="flex gap-4 items-center w-full bg-[var(--surface2)]/40 pr-2 md:pr-2.5 rounded-[30px] border border-[var(--border)]/50 shadow-sm overflow-hidden">
            <button className="w-11 h-11 flex-shrink-0 bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface2)]/50 transition-all active:scale-95 shadow-sm flex items-center justify-center border-none">
              <ImageIcon className="w-5 h-5" />
            </button>
            <div className="flex-1 relative group">
              <textarea
                className="w-full border-none px-3 py-3 text-[15px] font-medium resize-none outline-none bg-transparent text-[var(--text)] min-h-[44px] max-h-[150px] transition-all placeholder:text-[var(--text-muted)] placeholder:opacity-40 flex items-center"
                rows={1}
                placeholder="Message LiveFit..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="w-11 h-11 flex-shrink-0 rounded-[22px] bg-[var(--accent)] text-[var(--accent-inv)] border-none cursor-pointer flex items-center justify-center shadow-lg shadow-[var(--accent)]/25 hover:scale-[1.05] hover:brightness-110 disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
            >
              <Send className="w-5 h-5 translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface QuickChipProps {
  readonly icon: any;
  readonly label: string;
  readonly onClick: () => void;
}

function QuickChip({ icon: Icon, label, onClick }: QuickChipProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface2)]/50 text-[11px] font-bold tracking-tight cursor-pointer text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-all whitespace-nowrap active:scale-95"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
