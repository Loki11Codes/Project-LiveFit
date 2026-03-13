'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Sparkles, Coffee, Dumbbell, Moon, Info, User } from 'lucide-react';

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
      text: "Connection established. How can I assist you with your fitness goals today?",
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
      
      if (data.error) {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'model', text: `Connection issue: ${data.error}` }]);
        return;
      }

      if (data.text) {
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
      console.error('Chat connection error:', e);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'model', text: 'Unable to connect to AI service.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 min-w-0">
      <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-[32px] flex flex-col min-h-[600px] shadow-2xl shadow-black/5 overflow-hidden transition-all duration-300">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 flex flex-col gap-6 scroll-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 min-w-0 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center text-[13px] font-bold flex-shrink-0 mt-0.5 shadow-md ${
                  msg.role === 'model' ? 'bg-[var(--accent)] text-[var(--accent-inv)]' : 'bg-[var(--surface2)] text-[var(--text)] border border-[var(--border)]'
                }`}
              >
                {msg.role === 'model' ? <Sparkles className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div
                className={`max-w-[85%] md:max-w-[80%] min-w-0 px-6 py-4.5 rounded-[28px] text-[15px] leading-relaxed font-medium tracking-tight break-words overflow-wrap-anywhere whitespace-pre-wrap ${
                  msg.role === 'model' 
                    ? 'bg-[var(--surface2)]/50 text-[var(--text)] rounded-tl-none border border-[var(--border)]/20' 
                    : 'bg-[var(--accent)] text-[var(--accent-inv)] rounded-tr-none shadow-lg shadow-[var(--accent)]/10'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-4 animate-in fade-in duration-300">
              <div className="w-9 h-9 rounded-2xl bg-[var(--accent)] text-[var(--accent-inv)] flex items-center justify-center flex-shrink-0 shadow-md">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="px-7 py-5 rounded-[28px] bg-[var(--surface2)]/50 flex gap-2 items-center border border-[var(--border)]/20">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/30 animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/30 animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/30 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="flex flex-wrap gap-2.5 px-6 pb-5 overflow-x-auto no-scrollbar">
          <QuickChip icon={Coffee} label="Breakfast" onClick={() => setInput('Log my breakfast')} />
          <QuickChip icon={Dumbbell} label="Workout" onClick={() => setInput('Record my training session')} />
          <QuickChip icon={Moon} label="Sleep Stats" onClick={() => setInput('Show my sleep data')} />
          <QuickChip icon={Info} label="Protein Check" onClick={() => setInput('How is my protein intake?')} />
        </div>

        <div className="p-4 md:p-5 border-t border-[var(--border)] bg-[var(--surface)] relative">
          <div className="flex gap-2.5 items-end max-w-4xl mx-auto">
            <button className="w-11 h-11 flex-shrink-0 rounded-xl bg-[var(--surface2)] border border-[var(--border)]/50 cursor-pointer flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-all active:scale-95">
              <ImageIcon className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <textarea
                className="w-full border border-[var(--border)]/50 rounded-2xl px-5 py-4 text-[15px] font-medium resize-none outline-none bg-[var(--surface2)]/30 text-[var(--text)] min-h-[52px] max-h-[150px] transition-all focus:border-[var(--accent)]/50 focus:bg-[var(--surface)] placeholder:text-[var(--text-muted)] placeholder:opacity-50"
                rows={1}
                placeholder="Message LiveFit..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="w-11 h-11 flex-shrink-0 rounded-xl bg-[var(--accent)] text-[var(--accent-inv)] border-none cursor-pointer flex items-center justify-center shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
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
