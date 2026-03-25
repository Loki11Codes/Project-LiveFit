import React from "react";
import Image from "next/image";
import { User, Activity } from "lucide-react";
import { motion } from "framer-motion";
import type { ChatAttachment } from "@/lib/types";

export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  attachments?: ChatAttachment[];
}

interface MessageBubbleProps {
  msg: Message;
  isFirstInGroup: boolean;
  isNewUser?: boolean;
}

export function MessageBubble({ msg, isFirstInGroup, isNewUser }: Readonly<MessageBubbleProps>) {
  return (
    <motion.div
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
            <Activity className="w-4.5 h-4.5 text-[var(--accent-inv)]" strokeWidth={3} />
          ) : (
            <User className="w-5 h-5" style={{ color: "#7b5ea7" }} />
          )}
        </div>
      </div>
      <div
        className={`flex flex-col max-w-[80%] group ${
          msg.role === "user" ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`chat-msg-bubble relative w-fit ${
            msg.role === "model" ? "chat-bubble-model" : "chat-bubble-user"
          }`}
        >
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="chat-msg-image-grid flex flex-col gap-2">
              {msg.attachments.filter((att) => att.previewUrl).map((attachment) => {
                const isAudio = attachment.mediaType.startsWith("audio/");
                return isAudio ? (
                  /* eslint-disable-next-line jsx-a11y/media-has-caption */
                  <audio
                    key={attachment.id}
                    controls
                    src={attachment.previewUrl}
                    className="w-full max-w-[240px] h-10 outline-none"
                  />
                ) : (
                  <div key={attachment.id} className="chat-msg-image-frame">
                    <Image
                      src={attachment.previewUrl}
                      alt={attachment.name}
                      fill
                      unoptimized
                      className="chat-msg-image"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {msg.role === "model" && msg.id === "welcome-msg" && !isNewUser ? (
            <div>
              <p>
                Good morning! 👋{" "}
                <span className="chat-accent-text">I&apos;m your LiveFit AI</span> -
                speak naturally to log anything.
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
                    <span className="chat-bullet-icon">{item.icon}</span>
                    <span className="chat-bullet-text">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <span>{msg.text}</span>
          )}

          <span className="chat-message-timestamp">{msg.timestamp}</span>
        </div>
      </div>
    </motion.div>
  );
}
