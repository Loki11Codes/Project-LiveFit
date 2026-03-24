import React, { useRef } from "react";
import Image from "next/image";
import { ImageIcon, X, ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import type { ChatImageAttachment } from "@/lib/types";

interface ChatInputProps {
  readonly input: string;
  readonly setInput: (val: string) => void;
  readonly isTyping: boolean;
  readonly pendingImages: ChatImageAttachment[];
  readonly onSend: () => void;
  readonly onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onRemoveImage: (id: string) => void;
  readonly textInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChatInput({
  input,
  setInput,
  isTyping,
  pendingImages,
  onSend,
  onFileSelect,
  onRemoveImage,
  textInputRef,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <>
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
                onClick={() => onRemoveImage(image.id)}
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
          onChange={onFileSelect}
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
          <ImageIcon className="w-5 h-5" style={{ color: "#7b5ea7" }} />
        </motion.button>

        <div className="chat-input-box">
          <input
            ref={textInputRef}
            className="chat-input-field"
            type="text"
            placeholder="Tell me what you ate, your workout, sleep... or attach a photo 📷"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid="chat-input"
            suppressHydrationWarning
          />
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSend}
          disabled={isTyping || (!input.trim() && pendingImages.length === 0)}
          aria-label="Send message"
          className="chat-send-btn-square"
          suppressHydrationWarning
        >
          <ArrowUp className="w-5 h-5" style={{ color: "var(--accent-inv)" }} />
        </motion.button>
      </div>
    </>
  );
}
