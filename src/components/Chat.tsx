"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ImageIcon,
  Coffee,
  Dumbbell,
  Moon,
  Info,
  User,
  ArrowUp,
  Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

interface ChatProps {
  readonly onLogParsed: (category: string, data: any) => void;
}

export default function Chat({ onLogParsed }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      role: "model",
      text: "Good morning! 👋 I'm your LiveFit AI — speak naturally to log anything.\n\n🔍 \"Had 3 egg omelette and 150ml milk for breakfast\"\n💪 \"Finished chest day, 3200kg volume, 8 PRs\"\n😴 \"Slept 7.5h, bed at 11pm, woke at 6:30\"\n⚖️ \"Weight 70.5kg this morning\"",
      timestamp: "",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Populate the first message's timestamp on mount to avoid hydration mismatch
    setMessages(prev => prev.map(m => 
      m.id === "welcome-msg" && m.timestamp === "" 
        ? { ...m, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } 
        : m
    ));
  }, []);

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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
          { 
            id: crypto.randomUUID(), 
            role: "model", 
            text: cleanText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
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
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 h-full bg-[var(--surface)] rounded-[32px] flex flex-col shadow-[0_0_0_1px_var(--border),var(--shadow-lg)] overflow-hidden transition-all duration-300">
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth h-full no-scrollbar chat-viewport">
        <div className="w-full flex flex-col min-h-full chat-content-v-inset">
          <AnimatePresence mode="popLayout">
            {messages.map((msg, index) => {
              const isFirstInGroup = index === 0 || messages[index - 1].role !== msg.role;
              return (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`chat-msg-row ${msg.role === "user" ? "flex-row-reverse" : ""} ${isFirstInGroup ? "mt-6" : "mt-1"}`}
                >
                  <div className={`chat-avatar-container ${isFirstInGroup ? "" : "invisible opacity-0 h-0"}`}>
                    <div
                      className={`chat-avatar ${
                        msg.role === "model"
                          ? "bg-[var(--accent)] text-[var(--accent-inv)]"
                          : "bg-[var(--surface2)] text-[var(--text)]"
                      }`}
                    >
                      {msg.role === "model" ? (
                        <Activity className="w-4.5 h-4.5 text-[var(--accent-inv)]" strokeWidth={3} />
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
                      {msg.role === "model" && msg.text.includes("LiveFit AI") ? (
                        <div>
                          <p>
                            Good morning! 👋 <span className="chat-accent-text">I&apos;m your LiveFit AI</span> — speak naturally to log anything.
                          </p>
                          <div className="chat-bullet-list">
                            {[
                              { id: 'search', icon: "🔍", text: '"Had 3 egg omelette and 150ml milk for breakfast"' },
                              { id: 'work', icon: "💪", text: '"Finished chest day, 3200kg volume, 8 PRs"' },
                              { id: 'sleep', icon: "😴", text: '"Slept 7.5h, bed at 11pm, woke at 6:30"' },
                              { id: 'weight', icon: "⚖️", text: '"Weight 70.5kg this morning"' }
                            ].map((item) => (
                              <div key={item.id} className="chat-bullet-item">
                                <span className="chat-bullet-icon">{item.icon}</span>
                                <span className="chat-bullet-text">{item.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        msg.text
                      )}
                      
                      {/* Ghost Timestamp */}
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
                <Activity className="w-4.5 h-4.5 text-[var(--accent-inv)] animate-pulse" strokeWidth={3} />
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

        <div className="chat-input-wrapper">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="chat-photo-btn"
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
                  handleSend();
                }
              }}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
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
  readonly icon: any;
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
