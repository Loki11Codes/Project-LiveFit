'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface ChatProps {
  readonly onLogParsed: (category: string, data: any) => void;
}

export default function Chat({ onLogParsed }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: crypto.randomUUID(),
      role: 'model',
      text: "Good morning! 👋 I'm your LiveFit AI — speak naturally to log anything.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input;
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText, history }),
      });

      const data = await res.json();
      if (data.text) {
        // Parse the dynamic state block if present
        const dataMatch = data.text.match(/\|\|\|DATA\n([\s\S]*?)\n\|\|\|/);
        let cleanText = data.text;
        
        if (dataMatch) {
          try {
            const logData = JSON.parse(dataMatch[1]);
            onLogParsed(logData.category, logData.data);
            cleanText = cleanText.replace(/\|\|\|DATA[\s\S]*?\|\|\|/, '').trim();
          } catch (e) {
            console.error('Failed to parse log data:', e);
          }
        }

        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'model', text: cleanText }]);
      }
    } catch (e) {
      console.error('Chat handleSend error:', e);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'model', text: 'Connection error.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-5 min-h-0">
      <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg flex flex-col min-h-[500px] shadow-[var(--shadow)] overflow-hidden transition-colors duration-250">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col gap-4 scroll-behavior-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 animate-[rise_0.2s_ease] min-w-0 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-medium flex-shrink-0 mt-[2px] ${
                  msg.role === 'model' ? 'bg-[var(--accent)] text-[var(--accent-inv)]' : 'bg-[var(--surface2)] text-[var(--text)] border border-[var(--border)]'
                }`}
              >
                {msg.role === 'model' ? 'L' : '↑'}
              </div>
              <div
                className={`max-w-[72%] min-w-0 px-4 py-3 rounded-[10px] text-[13.5px] leading-[1.65] font-light break-words overflow-wrap-anywhere whitespace-pre-wrap ${
                  msg.role === 'model' ? 'bg-[var(--surface2)] border-bl-[3px]' : 'bg-[var(--accent)] text-[var(--accent-inv)] border-br-[3px]'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3 animate-[rise_0.2s_ease] min-w-0">
              <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-[var(--accent-inv)] flex items-center justify-center text-[13px] font-medium flex-shrink-0 mt-[2px]">L</div>
              <div className="max-w-[72%] min-w-0 px-4 py-3 rounded-[10px] bg-[var(--surface2)]">
                <div className="flex gap-1.5 py-1 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="flex flex-wrap gap-1.5 px-5 pb-3.5">
          <QuickChip label="🍳 Breakfast" onClick={() => setInput('Log breakfast')} />
          <QuickChip label="💪 Workout" onClick={() => setInput('Log workout')} />
          <QuickChip label="😴 Sleep" onClick={() => setInput('Log sleep')} />
          <QuickChip label="🥚 Protein left?" onClick={() => setInput('How much protein do I still need today?')} />
        </div>

        <div className="p-4 px-5 border-t border-[var(--border)] flex gap-2.5 items-end relative">
          <button className="w-[38px] h-[38px] rounded-md bg-transparent border border-[var(--border)] cursor-pointer flex items-center justify-center text-lg text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-all duration-150">
            📷
          </button>
          <textarea
            className="flex-1 border border-[var(--border)] rounded-md px-3.5 py-2.5 text-[13.5px] font-light resize-none outline-none bg-[var(--input-bg)] text-[var(--text)] min-h-[42px] max-h-[120px] transition-all duration-150 tracking-[0.01em] line-height-[1.5] overflow-y-auto"
            rows={1}
            placeholder="Tell me what you ate, your workout, sleep…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={isTyping}
            className="w-[38px] h-[38px] rounded-md bg-[var(--accent)] text-[var(--accent-inv)] border-none cursor-pointer flex items-center justify-center text-[17px] hover:opacity-75 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-150 flex-shrink-0"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

interface QuickChipProps {
  readonly label: string;
  readonly onClick: () => void;
}

function QuickChip({ label, onClick }: QuickChipProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-transparent text-[11px] font-normal tracking-[0.04em] cursor-pointer text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text)] transition-all duration-150"
    >
      {label}
    </button>
  );
}
