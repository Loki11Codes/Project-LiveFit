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
  lang: string;
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

const MASTER_LIST = [
  "had", "three", "eggs", "for", "breakfast", "lunch", "dinner", "snack", "ate", "eating",
  "protein", "creatine", "pre-workout", "post-workout", "BCAA", "vitamin", "omega",
  "squat", "bench", "press", "deadlift", "overhead", "rows", "pullups", "pushups", "dips",
  "warm-up", "cool-down", "reps", "sets", "kg", "lbs", "kilograms", "pounds", "seconds",
  "cardio", "running", "cycling", "weight", "height", "target", "goal", "calories", "water",
  "yesterday", "today", "tomorrow"
];

const BIGRAMS: Record<string, string> = {
  "bench press": "bench press",
  "dead lift": "deadlift",
  "pre workout": "pre-workout",
  "post workout": "post-workout",
  "protein shake": "protein shake",
  "warm up": "warm-up",
  "cool down": "cool-down",
};

const levenshtein = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
};

const getSoundex = (s: string) => {
  if (!s) return "";
  const a = s.toLowerCase().split("");
  const f = a.shift() || "";
  const r = a.map((v) => {
    if ("bfpv".includes(v)) return "1";
    if ("cgjkqsxz".includes(v)) return "2";
    if ("dt".includes(v)) return "3";
    if ("l".includes(v)) return "4";
    if ("mn".includes(v)) return "5";
    if ("r".includes(v)) return "6";
    return "";
  }).join("").replaceAll(/(.)\1+/g, "$1").replaceAll("0", "");
  return (f + r + "000").slice(0, 4).toUpperCase();
};

const cleanTranscript = (text: string) => {
  const JUNK_MAP: Record<string, string> = { 
    "xxx": "three eggs", 
    "haddi": "had", 
    "export": "eggs for",
    "exported": "eggs for",
    "theme": "three",
    "theme x": "three eggs",
    "x": "eggs",
    "the": "three"
  };
  let processed = text.toLowerCase();
  
  // Apply Bigram Weighting
  for (const [key, value] of Object.entries(BIGRAMS)) {
    processed = processed.replaceAll(key, value);
  }

  const words = processed.split(/\s+/);
  const cleanedWords = words.map((word) => {
    if (JUNK_MAP[word]) return JUNK_MAP[word];
    if (word.length < 2) return word;
    
    const wordSound = getSoundex(word);
    let bestMatch = word;
    let minDistance = word.length > 5 ? 4 : 3;

    for (const term of MASTER_LIST) {
      if (wordSound === getSoundex(term)) return term;
      const d = levenshtein(word, term);
      if (d < minDistance) {
        minDistance = d;
        bestMatch = term;
      }
    }
    return bestMatch;
  });
  return cleanedWords.join(" ");
};

const AuraRing = ({ volume, confidence }: { volume: number; confidence: number }) => {
  const intensity = volume / 255;
  const isUnsure = confidence > 0 && confidence < 0.6;
  const color = isUnsure ? "#f39c12" : "var(--accent)";
  return (
    <motion.div
      className="absolute rounded-full border pointer-events-none"
      style={{
        width: 44,
        height: 44,
        opacity: 0.1 + intensity * 0.4,
        borderWidth: 1 + intensity * 4,
        borderColor: color,
        boxShadow: `0 0 ${10 + intensity * 30}px ${color}`,
      }}
      animate={{ 
        scale: [1, 1 + intensity * 0.2, 1],
        opacity: isUnsure ? [0.2, 0.5, 0.2] : 0.1 + intensity * 0.4
      }}
      transition={{ duration: 0.2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
};

const WaveformLine = ({ frequencyData }: { frequencyData: Uint8Array }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frequencyData.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = "var(--accent)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const sliceWidth = canvas.width / frequencyData.length;
    let x = 0;

    for (const val of frequencyData) {
      const v = val / 128;
      const y = (v * canvas.height) / 2;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
  }, [frequencyData]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={20}
      className="absolute bottom-0 left-0 w-full h-[2px] opacity-30 pointer-events-none"
    />
  );
};

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
  useEffect(() => {
    console.log("ChatInput rendered - Voice features v2 active");
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioVolume, setAudioVolume] = useState(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopRecordingRef = useRef<(() => void) | null>(null);
  const recognitionActiveRef = useRef(false);
  const [recognitionConfidence, setRecognitionConfidence] = useState(1);

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

  const playBeep = (frequency: number, duration: number, type: "start" | "stop" = "start") => {
    if (globalThis.window === undefined) return;
    try {
      const AudioContextClass =
        globalThis.window.AudioContext || (globalThis.window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const context = new AudioContextClass();
      const gainNode = context.createGain();
      gainNode.connect(context.destination);

      const playTone = (freq: number, startOffset: number, vol: number, dur: number) => {
        const osc = context.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, context.currentTime + startOffset);
        
        const g = context.createGain();
        g.gain.setValueAtTime(0, context.currentTime + startOffset);
        g.gain.linearRampToValueAtTime(vol, context.currentTime + startOffset + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + startOffset + dur);
        
        osc.connect(g);
        g.connect(gainNode);
        osc.start(context.currentTime + startOffset);
        osc.stop(context.currentTime + startOffset + dur);
      };

      if (type === "start") {
        // Welcoming Major Arpeggio (C5, E5, G5)
        playTone(523.25, 0, 0.08, 0.4);
        playTone(659.25, 0.07, 0.07, 0.4);
        playTone(783.99, 0.14, 0.06, 0.4);
      } else {
        // Soft descending "hum" (C5, G4)
        playTone(523.25, 0, 0.06, 0.3);
        playTone(392, 0.12, 0.08, 0.5);
      }
    } catch (e) {
      console.warn("Failed to play beep:", e);
    }
  };

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      console.log("Silence timeout reached - stopping recording");
      if (stopRecordingRef.current) stopRecordingRef.current();
    }, 3000);
  };

  // Alien Tech Audio Engine (DSP, Noise Gate, Neural Analysis)
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startAudioAnalysis = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        const AudioContextClass = (globalThis.window?.AudioContext || (globalThis.window as any)?.webkitAudioContext);
        if (!AudioContextClass) return;
        
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128; // Smaller for faster particle response
        analyserRef.current = analyser;
        
        // --- Alien Tech DSP Pipeline ---
        // 1. Vocal EQ (Boost speech frequencies around 2kHz)
        const speechEQ = audioContext.createBiquadFilter();
        speechEQ.type = "peaking";
        speechEQ.frequency.value = 2000;
        speechEQ.Q.value = 1;
        speechEQ.gain.value = 6; // +6dB boost for clarity

        // 2. High-Pass Filter (Remove low-end rumble)
        const lowCut = audioContext.createBiquadFilter();
        // 3. Hard Noise Gate (DSP Layer)
        // This ensures the AI only gets audio above a certain threshold, cutting hiss.
        const noiseGate = audioContext.createDynamicsCompressor();
        noiseGate.threshold.setValueAtTime(-50, audioContext.currentTime);
        noiseGate.knee.setValueAtTime(0, audioContext.currentTime); // No knee = hard cut
        noiseGate.ratio.setValueAtTime(20, audioContext.currentTime); // Max ratio for gating
        noiseGate.attack.setValueAtTime(0.003, audioContext.currentTime);
        noiseGate.release.setValueAtTime(0.25, audioContext.currentTime);

        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-32, audioContext.currentTime);
        compressor.knee.setValueAtTime(40, audioContext.currentTime);
        compressor.ratio.setValueAtTime(8, audioContext.currentTime);
        compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
        compressor.release.setValueAtTime(0.25, audioContext.currentTime);
        
        // Connect the chain: Source -> EQ -> LowCut -> Gate -> Normalizer -> Analyser
        source.connect(lowCut);
        lowCut.connect(speechEQ);
        speechEQ.connect(noiseGate);
        noiseGate.connect(compressor);
        compressor.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let silenceStartTime: number | null = null;

        // Adaptive Environmental Calibration (God Tier)
        // Sample room noise for 200ms before opening the gate
        let ambientSum = 0;
        let samples = 0;
        const calibrate = () => {
          if (samples < 10) {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (const val of dataArray) sum += val;
            ambientSum += sum / dataArray.length;
            samples++;
            requestAnimationFrame(calibrate);
          } else {
            const ambientAvg = ambientSum / samples;
            const threshold = Math.max(-50, -60 + ambientAvg); // Dynamic threshold
            noiseGate.threshold.setValueAtTime(threshold, audioContext.currentTime);
            console.log(`Mic Calibrated. Ambient: ${ambientAvg.toFixed(2)}, Gate: ${threshold}dB`);
            updateFrequencyData();
          }
        };

        const updateFrequencyData = () => {
          if (!isRecording) return;
          analyser.getByteFrequencyData(dataArray);
          
          setFrequencyData(new Uint8Array(dataArray));
          
          let sum = 0;
          for (const val of dataArray) {
            sum += val;
          }
          const average = sum / dataArray.length;
          setAudioVolume(average);

          // Custom Silence Detection (3s threshold)
          if (average < 15) { // Adjusted silence threshold
            if (silenceStartTime === null) {
              silenceStartTime = Date.now();
            } else if (Date.now() - silenceStartTime > 3000) {
              console.log("Volume-based silence detected - stopping");
              if (stopRecordingRef.current) stopRecordingRef.current();
              return;
            }
          } else {
            silenceStartTime = null;
          }
          
          animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
        };
        
        updateFrequencyData();
      } catch (err) {
        console.warn("Alien audio engine failed to initialize:", err);
      }
    };

    const stopAudioContext = async () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          await audioContextRef.current.close();
        } catch (e) {
          console.warn("Error closing AudioContext:", e);
        }
        audioContextRef.current = null;
      }
    };

    if (isRecording) {
      startAudioAnalysis();
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      stopAudioContext();
      setAudioVolume(0);
      setFrequencyData(new Uint8Array(0));
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      stopAudioContext();
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [isRecording]);

  useEffect(() => {
    if (globalThis.window !== undefined) {
      const SpeechRecognition =
        globalThis.window.SpeechRecognition ||
        globalThis.window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-IN"; // Optimized for IST locale

        (recognitionRef.current as any).onsoundstart = resetSilenceTimer;
        (recognitionRef.current as any).onspeechstart = resetSilenceTimer;
        (recognitionRef.current as any).onstart = () => {
          console.log("Recognition started - resetting silence timer");
          resetSilenceTimer();
        };

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          resetSilenceTimer();
          let finalTranscript = "";
          let interimText = "";
          let totalConfidence = 0;
          let resultCount = 0;

          for (const result of Array.from(event.results)) {
            // Multi-Alternative Scoring Logic: Analyze up to 5 alternatives per result
            const alternatives = Array.from({ length: Math.min(5, (result as any).length || 1) }, (_, idx) => (result as any)[idx]);
            
            // Pick the alternative that matches our MASTER_LIST best or has highest confidence
            let bestAlt = alternatives[0];
            for (const alt of alternatives) {
              const cleaned = cleanTranscript(alt.transcript);
              if (MASTER_LIST.some(term => cleaned.includes(term))) {
                bestAlt = alt;
                break;
              }
            }

            const transcript = bestAlt.transcript;
            totalConfidence += bestAlt.confidence || 1;
            resultCount++;

            if ((result as any).isFinal) {
              finalTranscript += transcript;
            } else {
              interimText += transcript;
            }
          }

          if (resultCount > 0) setRecognitionConfidence(totalConfidence / resultCount);

          if (finalTranscript || interimText) {
            const finalCleaned = cleanTranscript(finalTranscript);
            const interimCleaned = cleanTranscript(interimText);
            
            if (finalCleaned) {
              setInput(finalCleaned);
              setInterimTranscript("");
            } else if (interimCleaned) {
              setInterimTranscript(interimCleaned);
            }
          }
        };

        recognitionRef.current.onerror = (
          event: SpeechRecognitionErrorEvent,
        ) => {
          console.error("Speech recognition error:", event.error);
          recognitionActiveRef.current = false;
          setIsRecording(false);
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };

        recognitionRef.current.onend = () => {
          recognitionActiveRef.current = false;
          setIsRecording(false);
          setInterimTranscript("");
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        };
      }
    }
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [setInput]);

  const startRecording = () => {
    if (isRecording || recognitionActiveRef.current) {
      console.warn("Recognition already active or starting, skipping start()");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        playBeep(880, 0.25, "start"); 
        resetSilenceTimer();
      } catch (error) {
        console.error("Speech recognition could not start:", error);
        setIsRecording(false);
        recognitionActiveRef.current = false;
      }
    }
  };

  const stopRecording = () => {
    if (!isRecording && !recognitionActiveRef.current) {
       return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }
    recognitionActiveRef.current = false;
    setIsRecording(false);
    playBeep(440, 0.25, "stop");
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };
  stopRecordingRef.current = stopRecording;

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


        <div 
          className="chat-input-box relative overflow-hidden flex items-center pr-1 transition-all duration-300"
          style={{
            borderColor: isRecording ? "var(--accent)" : "var(--border)",
            background: isRecording ? "rgba(var(--accent-rgb), 0.02)" : "transparent"
          }}
        >
          {isRecording && (
            <WaveformLine frequencyData={frequencyData} />
          )}

          <input
            ref={textInputRef}
            className={`chat-input-field flex-1 pr-12 bg-transparent transition-all duration-300 ${isRecording ? "opacity-60" : ""}`}
            type="text"
            placeholder={
              isRecording
                ? "Listening..."
                : "Tell me what you ate, your workout... or tap mic ???"
            }
            value={isRecording ? (input + interimTranscript) : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (isRecording) stopRecording();
            }}
            onClick={() => {
              if (isRecording) stopRecording();
            }}
            onPointerDown={() => {
              if (isRecording) stopRecording();
            }}
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
          <div className="relative">
            <AnimatePresence>
              {isRecording && (
                <div className="absolute inset-0 flex items-center justify-center -z-1">
                  <AuraRing volume={audioVolume} confidence={recognitionConfidence} />
                </div>
              )}
            </AnimatePresence>

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
                  className="chat-send-btn-square bg-[#e74c3c]! shadow-[0_0_15px_rgba(231,76,60,0.4)] relative z-10"
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
                  className="chat-send-btn-square bg-(--surface2)! relative z-10"
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
