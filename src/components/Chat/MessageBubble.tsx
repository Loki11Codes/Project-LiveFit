import React from "react";
import Image from "next/image";
import { User, Activity, Trash2 } from "lucide-react";
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
  onDelete?: (msg: Message) => void;
}

export function MessageBubble({ msg, isFirstInGroup, isNewUser, onDelete }: Readonly<MessageBubbleProps>) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={`chat-msg-row ${
        msg.role === "user" ? "flex-row-reverse" : ""
      } ${isFirstInGroup ? "mt-6" : "mt-1"} group/row`}
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
            <User className="w-5 h-5" style={{ color: "#7b5ea7" }} strokeWidth={2.5} />
          )}
        </div>
      </div>
      <div
        className={`flex flex-col max-w-[95%] group ${
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
                   
                  <audio
                    key={attachment.id}
                    controls
                    src={attachment.previewUrl}
                    className="w-full max-w-[240px] h-10 outline-none"
                  >
                    <track kind="captions" />
                  </audio>
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

      {onDelete && msg.id !== "welcome-msg" && (
        <button
          onClick={() => onDelete(msg)}
          className="chat-delete-btn opacity-0 group-hover/row:opacity-100 transition-opacity p-2 hover:text-red-500 rounded-full hover:bg-[var(--surface2)]"
          aria-label="Delete message"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}
