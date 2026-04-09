"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  X,
  Search,
  Clock,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ActiveWorkoutSession, TrackedExercise, TrackedSet } from "@/lib/types";

interface WorkoutSessionProps {
  readonly session: ActiveWorkoutSession;
  readonly onFinish: (session: ActiveWorkoutSession) => void;
  readonly onDiscard: () => void;
  readonly onUpdate: (session: ActiveWorkoutSession) => void;
}

export function WorkoutSession({ 
  session, 
  onFinish, 
  onDiscard, 
  onUpdate 
}: WorkoutSessionProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer logic
  useEffect(() => {
    const updateTimer = () => {
      setElapsed(Math.floor((Date.now() - session.startTime) / 1000));
    };
    
    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.startTime]);

  // Fetch exercises for search
  useEffect(() => {
    fetch("/api/exercises")
      .then(res => res.json())
      .then(data => setAvailableExercises(data))
      .catch(err => console.error("Failed to load exercises", err));
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleUpdate = (updates: Partial<ActiveWorkoutSession>) => {
    onUpdate({ ...session, ...updates });
  };

  const addSet = (exId: string) => {
    const newExercises = session.exercises.map(ex => {
      if (ex.id === exId) {
        const lastSet = ex.sets.at(-1);
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: crypto.randomUUID(),
              weight: lastSet?.weight || "",
              reps: lastSet?.reps || "",
              isCompleted: false,
            }
          ]
        };
      }
      return ex;
    });
    handleUpdate({ exercises: newExercises });
  };

  const removeSet = (exId: string, setId: string) => {
    if (!confirm("Are you sure you want to delete this set?")) return;
    const newExercises = session.exercises.map((ex) => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: ex.sets.filter((s) => s.id !== setId),
        };
      }
      return ex;
    });
    handleUpdate({ exercises: newExercises });
  };


  const updateSet = (exId: string, setId: string, updates: Partial<TrackedSet>) => {
    const newExercises = session.exercises.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: ex.sets.map(s => s.id === setId ? { ...s, ...updates } : s)
        };
      }
      return ex;
    });
    handleUpdate({ exercises: newExercises });
  };

  const removeExercise = (exId: string) => {
    if (confirm("Remove this exercise from your workout?")) {
      handleUpdate({
        exercises: session.exercises.filter(ex => ex.id !== exId)
      });
    }
  };

  const addExercise = (exercise: any) => {
    const newEx: TrackedExercise = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      name: exercise.name,
      sets: [
        {
          id: crypto.randomUUID(),
          weight: "",
          reps: "",
          isCompleted: false,
        }
      ]
    };
    handleUpdate({
      exercises: [...session.exercises, newEx]
    });
    setIsSearching(false);
    setSearchQuery("");
  };

  const filteredExercises = availableExercises.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[5000] bg-[var(--background)] flex flex-col pt-safe-top overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 glass-premium border-b border-black/5 shadow-md shrink-0 relative z-30">
        <div className="flex flex-col">
          <h2 className="text-[10px] font-black text-[var(--red)] uppercase tracking-[0.2em] opacity-60">
            {session.name || "Live Session"}
          </h2>
          <div className="flex items-center gap-2 text-2xl font-black tabular-nums">
            <Clock className="w-5 h-5 text-[var(--red)]" />
            {formatTime(elapsed)}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onDiscard}
            className="p-3 text-[var(--foreground-muted)] hover:text-[var(--energy-coral)] hover:bg-[var(--energy-coral)]/10 rounded-[var(--radius-md)] transition-all active:scale-95 border border-transparent hover:border-[var(--energy-coral)]/20"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => onFinish(session)}
            className="px-6 py-3 bg-[var(--energy-coral)] text-white font-black uppercase text-xs tracking-widest rounded-[var(--radius-md)] shadow-xl shadow-[var(--energy-coral)]/30 active:scale-95 transition-all"
          >
            Finish
          </button>
        </div>
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto content-scroll p-4 pb-32">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          {session.exercises.map((ex, exIdx) => (
            <motion.div
              layout
              key={ex.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-premium rounded-[var(--radius-lg)] overflow-hidden relative group"
            >
              <div className="p-4 flex items-center justify-between border-b border-black/5 bg-black/[0.02]">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--energy-coral)]/10 text-[var(--energy-coral)] flex items-center justify-center font-black text-xs shadow-inner">
                    {exIdx + 1}
                  </span>
                  <div className="flex flex-col">
                    <h3 className="font-black text-lg tracking-tight leading-none mb-1">{ex.name}</h3>
                    <span className="text-[9px] font-black uppercase text-[var(--red)] tracking-widest opacity-40">Target Reached: 85%</span>
                  </div>
                </div>
                <button
                  onClick={() => removeExercise(ex.id)}
                  className="p-2 text-[var(--foreground-muted)] hover:text-[var(--energy-coral)] hover:bg-[var(--energy-coral)]/10 rounded-[var(--radius-sm)] transition-all opacity-0 group-hover:opacity-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-4 pb-4">
                {/* Table Header */}
                <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem_2.5rem] gap-2 py-2 text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest text-center">
                  <div>Set</div>
                  <div>Weight (kg)</div>
                  <div>Reps</div>
                  <div>Done</div>
                  <div></div>
                </div>

                {/* Sets */}
                <div className="flex flex-col gap-2">
                  <AnimatePresence mode="popLayout">
                    {ex.sets.map((set, sIdx) => (
                      <motion.div
                        layout
                        key={set.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className={`grid grid-cols-[2.5rem_1fr_1fr_2.5rem_2.5rem] gap-2 items-center transition-all duration-300 rounded-[var(--radius-md)] p-1 ${
                          set.isCompleted ? "bg-[var(--nutri-green)]/5" : ""
                        }`}
                      >
                        <div className="text-center font-bold text-sm text-[var(--foreground-muted)]">
                          {sIdx + 1}
                        </div>
                        <input
                          type="number"
                          placeholder="0"
                          value={set.weight}
                          onChange={(e) => updateSet(ex.id, set.id, { weight: e.target.value })}
                          className={`w-full bg-black/5 border border-transparent rounded-[var(--radius-md)] py-2.5 text-center font-black text-sm outline-none focus:border-[var(--energy-coral)]/30 focus:bg-white/50 transition-all ${
                            set.isCompleted ? "opacity-30" : ""
                          }`}
                        />
                        <input
                          type="number"
                          placeholder="0"
                          value={set.reps}
                          onChange={(e) => updateSet(ex.id, set.id, { reps: e.target.value })}
                          className={`w-full bg-black/5 border border-transparent rounded-xl py-2.5 text-center font-black text-sm outline-none focus:border-[var(--red)]/30 focus:bg-white/50 transition-all ${
                            set.isCompleted ? "opacity-30" : ""
                          }`}
                        />
                        {/* Complete toggle */}
                        <button
                          onClick={() => updateSet(ex.id, set.id, { isCompleted: !set.isCompleted })}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                            set.isCompleted
                              ? "bg-[var(--red)] text-white shadow-xl shadow-[var(--red)]/40 scale-105"
                              : "bg-black/5 text-[var(--foreground-muted)] border border-transparent hover:border-black/10"
                          }`}
                        >
                          {set.isCompleted ? (
                            <Check className="w-4 h-4 stroke-[4]" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-black/20" />
                          )}
                        </button>
                        {/* Delete set */}
                        <button
                          onClick={() => removeSet(ex.id, set.id)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-red-500/20 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          title="Remove set"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => addSet(ex.id)}
                  className="w-full mt-4 py-2.5 border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--foreground-muted)] font-bold text-sm hover:border-[var(--red)]/30 hover:text-[var(--red)] transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Set
                </button>
              </div>
            </motion.div>
          ))}

          <button
            onClick={() => setIsSearching(true)}
            className="w-full py-5 rounded-3xl bg-[var(--red)]/5 border-2 border-dashed border-[var(--red)]/20 text-[var(--red)] font-bold text-lg flex items-center justify-center gap-2 hover:bg-[var(--red)]/10 transition-all active:scale-[0.98]"
          >
            <Plus className="w-6 h-6" /> Add Exercise
          </button>
        </div>
      </div>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[6000] bg-[var(--background)] flex flex-col pt-safe-top"
          >
            <div className="p-4 flex items-center gap-3 border-b border-[var(--border)] shadow-sm bg-[var(--surface)]">
              <button
                onClick={() => setIsSearching(false)}
                className="p-2 text-[var(--foreground-muted)]"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface2)] rounded-xl outline-none font-bold"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {filteredExercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)] text-left hover:border-[var(--accent)] transition-all active:scale-[0.98]"
                >
                  <h4 className="font-bold text-lg">{ex.name}</h4>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    {ex.category} • {ex.equipment || "Standard"}
                  </p>
                </button>
              ))}
              {filteredExercises.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center gap-4 text-[var(--foreground-muted)]">
                  <div className="p-4 rounded-full bg-[var(--surface2)]">
                    <Search className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="font-bold">No exercises found for "{searchQuery}"</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discard Confirmation Backdrop (Handled by confirmation, but adding a safe area at bottom) */}
      <div className="h-safe-bottom shrink-0 bg-[var(--background)]" />
    </motion.div>
  );
}
