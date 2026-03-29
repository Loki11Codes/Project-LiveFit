import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { ImageIcon, X, ArrowUp, Mic, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatAttachment } from "@/lib/types";

// Add Speech Recognition Types
interface SpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown)
    | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown)
    | null;
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const AuraRing = ({ isRecording }: { isRecording: boolean }) => {
  if (!isRecording) return null;
  return (
    <motion.div
      className="absolute rounded-full border pointer-events-none"
      style={{
        width: 44,
        height: 44,
        borderWidth: 2,
        borderColor: "var(--accent)",
        boxShadow: "0 0 15px var(--accent)",
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
};

const SpeechWaveform = ({ isRecording }: { isRecording: boolean }) => {
  const [bars, setBars] = useState<
    { id: string; duration: number; delay: number; heightSteps: string[] }[]
  >([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBars(
      Array.from({ length: 15 }).map((_, i) => ({
        id: `waveform-bar-${i}`,
        duration: 0.8 + Math.random() * 0.4,
        delay: Math.random() * 0.5,
        heightSteps: ["20%", "100%", "30%", "80%", "20%"],
      })),
    );
  }, []);

  if (!isRecording || bars.length === 0) return null;

  return (
    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-1 h-3 pointer-events-none opacity-50">
      {bars.map((bar) => (
        <motion.div
          key={bar.id}
          className="w-1 bg-(--accent) rounded-t-sm"
          animate={{
            height: bar.heightSteps,
          }}
          transition={{
            duration: bar.duration,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
            delay: bar.delay,
          }}
        />
      ))}
    </div>
  );
};

interface ChatInputProps {
  readonly input: string;
  readonly setInput: (val: string) => void;
  readonly isTyping: boolean;
  readonly pendingAttachments: ChatAttachment[];
  readonly onSend: () => void;
  readonly onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  onRemoveAttachment,
  textInputRef,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const hasSpeechSupport =
    globalThis.window !== undefined &&
    !!(
      globalThis.window.SpeechRecognition ||
      globalThis.window.webkitSpeechRecognition
    );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (globalThis.window !== undefined) {
      const SpeechRecognition =
        globalThis.window.SpeechRecognition ||
        globalThis.window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let currentTranscript = "";
          for (const result of Array.from(event.results)) {
            currentTranscript += result[0].transcript;
          }
          setInput(currentTranscript);
        };

        recognitionRef.current.onerror = (
          event: SpeechRecognitionErrorEvent,
        ) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
  }, [setInput]);

  const startRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Speech recognition could not start:", error);
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <>
      <AnimatePresence>
        {pendingAttachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="chat-attachments-strip"
          >
            {pendingAttachments.map((attachment) => {
              const isAudio = attachment.mediaType.startsWith("audio/");
              return (
                <div key={attachment.id} className="chat-attachment-thumb">
                  {isAudio ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-(--surface2) rounded-lg border border-(--border) relative top-0.5">
                      <Mic
                        className="w-4 h-4 text-(--accent)"
                        strokeWidth={2}
                      />
                      <span className="text-[12px] font-medium max-w-25 truncate">
                        {attachment.name}
                      </span>
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
                    <X className="w-3 h-3" strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="chat-input-wrapper">
        <SpeechWaveform isRecording={isRecording} />
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
          <ImageIcon
            className="w-5 h-5"
            style={{ color: "#7b5ea7" }}
            strokeWidth={2}
          />
        </motion.button>

        <div className="chat-input-box relative overflow-hidden flex items-center pr-1">
          <input
            ref={textInputRef}
            className="chat-input-field flex-1 pr-12 bg-transparent"
            type="text"
            placeholder={
              isRecording
                ? "Listening..."
                : "Tell me what you ate, your workout... or tap mic ???"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRecording}
            data-testid="chat-input"
            suppressHydrationWarning
          />
          <AnimatePresence>
            {(input.trim() || pendingAttachments.length > 0) && (
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
                className="absolute flex items-center justify-center right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg chat-send-btn-square shadow-sm p-0 m-0 shrink-0 z-10"
                suppressHydrationWarning
              >
                <ArrowUp
                  className="w-4 h-4"
                  style={{ color: "var(--accent-inv)" }}
                  strokeWidth={2.5}
                />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {isMounted && hasSpeechSupport && (
          <div className="relative flex items-center justify-center">
            <AuraRing isRecording={isRecording} />
            <AnimatePresence mode="wait">
              {isRecording ? (
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
                  className="chat-send-btn-square bg-[#e74c3c]! shadow-[0_0_15px_rgba(231,76,60,0.4)]"
                  suppressHydrationWarning
                >
                  <Square
                    className="w-4 h-4 fill-current"
                    style={{ fill: "#fff", color: "#fff" }}
                  />
                </motion.button>
              ) : (
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
                  className="chat-send-btn-square bg-(--surface2)!"
                  suppressHydrationWarning
                >
                  <Mic
                    className="w-5 h-5"
                    style={{ color: "#7b5ea7" }}
                    strokeWidth={2}
                  />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  );
}
