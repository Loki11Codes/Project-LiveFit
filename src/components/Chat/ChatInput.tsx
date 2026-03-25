import React, { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, X, ArrowUp, Mic, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatAttachment } from "@/lib/types";

interface ChatInputProps {
  readonly input: string;
  readonly setInput: (val: string) => void;
  readonly isTyping: boolean;
  readonly pendingAttachments: ChatAttachment[];
  readonly onSend: () => void;
  readonly onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onAudioRecorded: (file: File) => void;
  readonly onRemoveAttachment: (id: string) => void;
  readonly textInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChatInput({
  input,
  setInput,
  isTyping,
  pendingAttachments,
  onSend,
  onFileSelect,
  onAudioRecorded,
  onRemoveAttachment,
  textInputRef,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `Voice Note - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.webm`, { type: "audio/webm" });
        onAudioRecorded(audioFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access denied or error:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const renderActionButton = () => {
    if (isRecording) {
      return (
        <motion.button
          key="stop"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={stopRecording}
          aria-label="Stop recording"
          className="chat-send-btn-square !bg-[#e74c3c] shadow-[0_0_15px_rgba(231,76,60,0.4)]"
          suppressHydrationWarning
        >
          <Square className="w-4 h-4 fill-current" style={{ fill: "#fff", color: "#fff" }} />
        </motion.button>
      );
    }

    if (!input.trim() && pendingAttachments.length === 0) {
      return (
        <motion.button
          key="mic"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startRecording}
          aria-label="Start recording"
          className="chat-send-btn-square !bg-[var(--surface2)]"
          suppressHydrationWarning
        >
          <Mic className="w-5 h-5" style={{ color: "#7b5ea7" }} />
        </motion.button>
      );
    }

    return (
      <motion.button
        key="send"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSend}
        disabled={isTyping}
        aria-label="Send message"
        className="chat-send-btn-square"
        suppressHydrationWarning
      >
        <ArrowUp className="w-5 h-5" style={{ color: "var(--accent-inv)" }} />
      </motion.button>
    );
  };

  return (
    <>
      <AnimatePresence>
        {pendingAttachments.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="chat-attachments-strip"
          >
            {pendingAttachments.map((attachment) => {
              const isAudio = attachment.mediaType.startsWith("audio/");
              return (
                <div key={attachment.id} className="chat-attachment-thumb">
                  {isAudio ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface2)] rounded-lg border border-[var(--border)] relative top-[2px]">
                      <Mic className="w-4 h-4 text-[var(--accent)]" />
                      <span className="text-[12px] font-medium max-w-[100px] truncate">{attachment.name}</span>
                    </div>
                  ) : (
                    <div className="chat-attachment-thumb-image">
                      <Image
                        src={attachment.previewUrl}
                        alt={attachment.name}
                        fill
                        unoptimized
                        className="chat-msg-image"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(attachment.id)}
                    className="chat-attachment-remove"
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

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
            pendingAttachments.length > 0 ? "chat-photo-btn-active" : ""
          }`}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach images"
          disabled={isRecording}
          suppressHydrationWarning
        >
          <ImageIcon className="w-5 h-5" style={{ color: "#7b5ea7" }} />
        </motion.button>

        <div className="chat-input-box relative overflow-hidden">
          {isRecording && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-[var(--surface)] z-10 flex items-center px-4 gap-3 text-[var(--accent)]"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#e74c3c] animate-pulse" />
              <span className="text-[14px] font-medium tracking-wide">Recording Voice Note...</span>
            </motion.div>
          )}
          <input
            ref={textInputRef}
            className="chat-input-field"
            type="text"
            placeholder="Tell me what you ate, your workout... or tap mic 🎤"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRecording}
            data-testid="chat-input"
            suppressHydrationWarning
          />
        </div>

        <AnimatePresence mode="wait">
          {renderActionButton()}
        </AnimatePresence>
      </div>
    </>
  );
}
