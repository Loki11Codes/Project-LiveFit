/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Dumbbell,
  X,
  Play,
  Trash2,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RoutinesTabProps {
  readonly onStart?: (routine: any) => void;
}

export function RoutinesTab({ onStart }: RoutinesTabProps) {
  const [view, setView] = useState<"list" | "create" | "preview">("list");
  const [routines, setRoutines] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Preview state — a local working copy of the routine being previewed/edited
  const [previewRoutine, setPreviewRoutine] = useState<any | null>(null);

  // Builder State
  const [newRoutineName, setNewRoutineName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [routinesRes, exercisesRes] = await Promise.all([
        fetch("/api/routines"),
        fetch("/api/exercises"),
      ]);
      if (routinesRes.ok) setRoutines(await routinesRes.json());
      if (exercisesRes.ok) setExercises(await exercisesRes.json());
    } catch (err) {
      console.error("Failed to load routine data", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Preview / Pre-workout editor ──────────────────────────────────────────

  const openPreview = (routine: any) => {
    // Deep-clone so edits don't mutate the saved routine list
    setPreviewRoutine({
      ...routine,
      exercises: routine.exercises.map((e: any) => ({
        ...e,
        // Give each entry a stable local key in case exercise obj differs
        _localId: crypto.randomUUID(),
        sets: Array.from({ length: Number(e.targetSets) || 3 }).map((_, i) => ({
          id: crypto.randomUUID(),
          weight: "",
          reps: e.targetReps || "",
          isCompleted: false,
        })),
      })),
    });
    setView("preview");
  };

  const addPreviewSet = (localId: string) => {
    setPreviewRoutine((prev: any) => ({
      ...prev,
      exercises: prev.exercises.map((e: any) => {
        if (e._localId === localId) {
          const lastSet = e.sets[e.sets.length - 1];
          return {
            ...e,
            sets: [
              ...e.sets,
              {
                id: crypto.randomUUID(),
                weight: lastSet?.weight || "",
                reps: lastSet?.reps || "",
                isCompleted: false,
              },
            ],
          };
        }
        return e;
      }),
    }));
  };

  const removePreviewSet = (localId: string, setId: string) => {
    if (!confirm("Are you sure you want to delete this set?")) return;
    setPreviewRoutine((prev: any) => ({
      ...prev,
      exercises: prev.exercises.map((e: any) =>
        e._localId === localId
          ? { ...e, sets: e.sets.filter((s: any) => s.id !== setId) }
          : e
      ),
    }));
  };

  const updatePreviewSet = (
    localId: string,
    setId: string,
    field: string,
    value: string
  ) => {
    setPreviewRoutine((prev: any) => ({
      ...prev,
      exercises: prev.exercises.map((e: any) => {
        if (e._localId === localId) {
          return {
            ...e,
            sets: e.sets.map((s: any) =>
              s.id === setId ? { ...s, [field]: value } : s
            ),
          };
        }
        return e;
      }),
    }));
  };

  const removePreviewExercise = (localId: string) => {
    if (!confirm("Are you sure you want to remove this exercise?")) return;
    setPreviewRoutine((prev: any) => ({
      ...prev,
      exercises: prev.exercises.filter((e: any) => e._localId !== localId),
    }));
  };

  const addPreviewExercise = (exercise: any) => {
    setPreviewRoutine((prev: any) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          _localId: crypto.randomUUID(),
          exercise: { name: exercise.name },
          exerciseId: exercise.id,
          targetSets: 3,
          targetReps: "8-12",
          sets: Array.from({ length: 3 }).map(() => ({
            id: crypto.randomUUID(),
            weight: "",
            reps: "8-12",
            isCompleted: false,
          })),
        },
      ],
    }));
    setIsSearching(false);
    setSearchQuery("");
  };

  const handleStartPreview = () => {
    if (previewRoutine) {
      onStart?.(previewRoutine);
    }
  };

  // ── Create builder ─────────────────────────────────────────────────────────

  const handleAddExercise = (exercise: any) => {
    setSelectedExercises([
      ...selectedExercises,
      {
        ...exercise,
        routineExerciseId: crypto.randomUUID(),
        targetSets: 3,
        targetReps: "8-12",
      },
    ]);
    setIsSearching(false);
    setSearchQuery("");
  };

  const handleRemoveExercise = (id: string) => {
    if (!confirm("Are you sure you want to remove this exercise?")) return;
    setSelectedExercises(
      selectedExercises.filter((e) => e.routineExerciseId !== id)
    );
  };

  const updateSetRep = (
    id: string,
    field: "targetSets" | "targetReps",
    value: string | number
  ) => {
    setSelectedExercises(
      selectedExercises.map((e) =>
        e.routineExerciseId === id ? { ...e, [field]: value } : e
      )
    );
  };

  const handleDeleteRoutine = async (id: string) => {
    if (!confirm("Delete this routine? This can't be undone.")) return;
    setRoutines((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch(`/api/routines?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete routine", err);
      fetchData();
    }
  };

  const handleSaveRoutine = async () => {
    if (!newRoutineName.trim() || selectedExercises.length === 0) return;

    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoutineName,
          exercises: selectedExercises.map((e, idx) => ({
            exerciseId: e.id,
            order: idx,
            targetSets: Number(e.targetSets),
            targetReps: e.targetReps,
          })),
        }),
      });

      if (res.ok) {
        setView("list");
        setNewRoutineName("");
        setSelectedExercises([]);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to save routine", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  const filteredExercises = exercises.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Header title / back button based on view ───────────────────────────────
  function getHeaderTitle() {
    if (view === "preview") return previewRoutine?.name ?? "Routine";
    if (view === "create") return "Create Routine";
    return "My Routines";
  }

  function getHeaderSub() {
    if (view === "preview") return `${previewRoutine?.exercises?.length ?? 0} exercises`;
    if (view === "create") return "Build a custom workout";
    return "Your saved workout templates";
  }

  const headerTitle = getHeaderTitle();
  const headerSub = getHeaderSub();

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col pt-safe-top tracking-tight text-[var(--foreground)] min-h-[100dvh] pb-24 px-4 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full flex items-center justify-between py-6 sticky top-0 bg-[var(--background)]/[0.85] backdrop-blur-md z-30 border-b border-[var(--border)]"
      >
        <div className="flex items-center gap-3">
          {view === "list" ? (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-gradient)] flex items-center justify-center shadow-lg transform rotate-3">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
          ) : (
            <button
              onClick={() => {
                setView("list");
                setPreviewRoutine(null);
                setSearchQuery("");
              }}
              className="p-2.5 bg-[var(--surface)] rounded-xl border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--foreground)] to-[var(--foreground-muted)]">
              {headerTitle}
            </h1>
            <p className="text-sm font-medium text-[var(--foreground-muted)]">
              {headerSub}
            </p>
          </div>
        </div>

        {view === "list" && routines.length > 0 && (
          <button
            onClick={() => setView("create")}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] text-[var(--accent)] font-semibold rounded-full border border-[var(--border)] shadow-sm active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Routine</span>
          </button>
        )}

        {view === "preview" && (
          <button
            onClick={handleStartPreview}
            disabled={!previewRoutine?.exercises?.length}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white font-bold rounded-xl shadow-lg shadow-[var(--accent)]/25 active:scale-95 transition-all disabled:opacity-40"
          >
            <Play className="w-4 h-4 fill-current" />
            Start
          </button>
        )}
      </motion.div>

      <div className="py-6 flex flex-col gap-6 relative">
        <AnimatePresence mode="wait">

          {/* ── LIST VIEW ──────────────────────────────────────────────────── */}
          {view === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-4"
            >
              {routines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-[var(--surface)] rounded-3xl border border-[var(--border)]">
                  <div className="w-16 h-16 rounded-full bg-[var(--surface2)] flex items-center justify-center mb-4">
                    <Dumbbell className="w-8 h-8 text-[var(--foreground-muted)] opacity-50" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">No Routines Yet</h3>
                  <p className="text-[var(--foreground-muted)] max-w-[250px] text-sm">
                    Create your first custom workout template to get started.
                  </p>
                  <button
                    onClick={() => setView("create")}
                    className="mt-6 px-6 py-2.5 bg-[var(--accent)] text-white font-semibold rounded-full shadow-[0_4px_14px_rgba(123,94,167,0.39)]"
                  >
                    Create Routine
                  </button>
                </div>
              ) : (
                routines.map((routine) => (
                  <motion.div
                    layout
                    key={routine.id}
                    className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden"
                  >
                    {/* Tappable card body → opens preview */}
                    <button
                      onClick={() => openPreview(routine)}
                      className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-[var(--surface2)]/40 transition-colors active:bg-[var(--surface2)]/60"
                    >
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <h3 className="text-lg font-bold">{routine.name}</h3>
                        <p className="text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                          {routine.exercises.length} Exercises
                        </p>
                        <div className="text-sm text-[var(--foreground)]/70 leading-relaxed truncate">
                          {routine.exercises
                            .map((e: any) => e.exercise.name)
                            .join(", ")}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[var(--foreground-muted)] shrink-0" />
                    </button>

                    {/* Action row */}
                    <div className="flex items-center gap-2 border-t border-[var(--border)]/60 px-5 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStart?.(routine);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-xl font-bold text-sm active:scale-95 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Start Workout
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoutine(routine.id);
                        }}
                        className="p-2.5 text-[var(--foreground-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-95"
                        title="Delete routine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* ── PREVIEW / PRE-WORKOUT EDITOR ──────────────────────────────── */}
          {view === "preview" && previewRoutine && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="flex flex-col gap-5"
            >
              <p className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-widest px-1">
                Customize before you start — changes only apply to this session.
              </p>

              {previewRoutine.exercises.map((ex: any, idx: number) => (
                <motion.div
                  layout
                  key={ex._localId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden"
                >
                  {/* Exercise header */}
                  <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]/50">
                    <span className="w-7 h-7 shrink-0 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-black text-xs">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base leading-tight">
                        {ex.exercise?.name || ex.customName}
                      </h3>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {ex.exercise?.category || ex.category} ·{" "}
                        {ex.exercise?.equipment || ex.equipment || "Standard"}
                      </p>
                    </div>
                    <button
                      onClick={() => removePreviewExercise(ex._localId)}
                      className="p-1.5 text-[var(--foreground-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sets List */}
                  <div className="px-4 pb-4">
                    {/* Table Header */}
                    <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-2 py-2 text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest text-center">
                      <div>Set</div>
                      <div>Weight (kg)</div>
                      <div>Reps</div>
                      <div></div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <AnimatePresence mode="popLayout">
                        {ex.sets?.map((set: any, sIdx: number) => (
                          <motion.div
                            layout
                            key={set.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-2 items-center transition-all duration-300 rounded-xl p-1"
                          >
                            <div className="text-center font-bold text-sm text-[var(--foreground-muted)]">
                              {sIdx + 1}
                            </div>
                            <input
                              type="number"
                              placeholder="0"
                              value={set.weight}
                              onChange={(e) =>
                                updatePreviewSet(ex._localId, set.id, "weight", e.target.value)
                              }
                              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg py-2.5 text-center font-bold text-sm outline-none focus:border-[var(--accent)] transition-all"
                            />
                            <input
                              type="number"
                              placeholder="0"
                              value={set.reps}
                              onChange={(e) =>
                                updatePreviewSet(ex._localId, set.id, "reps", e.target.value)
                              }
                              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg py-2.5 text-center font-bold text-sm outline-none focus:border-[var(--accent)] transition-all"
                            />
                            {/* Delete set */}
                            <button
                              onClick={() => removePreviewSet(ex._localId, set.id)}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--foreground-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"
                              title="Remove set"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <button
                      onClick={() => addPreviewSet(ex._localId)}
                      className="w-full mt-4 py-2.5 border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--foreground-muted)] font-bold text-sm hover:border-[var(--accent)]/30 hover:text-[var(--accent)] transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Add Set
                    </button>
                  </div>
                </motion.div>
              ))}

              {/* Add Exercise button */}
              <button
                onClick={() => setIsSearching(true)}
                className="w-full py-4 rounded-2xl bg-[var(--accent)]/5 border-2 border-dashed border-[var(--accent)]/20 text-[var(--accent)] font-bold text-base flex items-center justify-center gap-2 hover:bg-[var(--accent)]/10 transition-all active:scale-[0.98]"
              >
                <Plus className="w-5 h-5" /> Add Exercise
              </button>

              {/* Big start CTA */}
              <div className="pb-12">
                <button
                  onClick={handleStartPreview}
                  disabled={!previewRoutine.exercises.length}
                  className="w-full py-5 rounded-2xl font-black tracking-wide text-[16px] bg-[var(--accent)] text-white shadow-[0_8px_30px_rgba(123,94,167,0.35)] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-3"
                >
                  <Play className="w-5 h-5 fill-white" />
                  Start Workout
                </button>
              </div>
            </motion.div>
          )}

          {/* ── CREATE VIEW ────────────────────────────────────────────────── */}
          {view === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="routine-name"
                  className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-wider ml-1"
                >
                  Routine Name
                </label>
                <input
                  id="routine-name"
                  type="text"
                  placeholder="e.g. Push Day, Pull Day, Legs"
                  className="w-full px-5 py-3.5 bg-[var(--surface)] rounded-xl border border-[var(--border)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all font-medium text-lg placeholder:text-[var(--foreground-muted)]/50 shadow-inner"
                  value={newRoutineName}
                  onChange={(e) => setNewRoutineName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="exercise-search-trigger"
                    className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-wider ml-1"
                  >
                    Exercises
                  </label>
                  <button
                    id="exercise-search-trigger"
                    onClick={() => setIsSearching(true)}
                    className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-2 rounded-xl border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 transition-all active:scale-95"
                  >
                    <Search className="w-4 h-4" /> Search Exercises
                  </button>
                </div>

                {selectedExercises.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-[var(--border)] bg-[var(--surface)]/50 rounded-2xl flex flex-col items-center justify-center text-center">
                    <p className="text-[var(--foreground-muted)] font-medium mb-4">
                      You haven&apos;t added any exercises to this routine yet.
                    </p>
                    <button
                      onClick={() => setIsSearching(true)}
                      className="px-6 py-3 bg-[var(--accent)] text-white font-bold rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Search className="w-4 h-4" /> Search Exercises
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {selectedExercises.map((e, idx) => (
                      <div
                        key={e.routineExerciseId}
                        className="flex flex-col p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm relative group"
                      >
                        <button
                          onClick={() =>
                            handleRemoveExercise(e.routineExerciseId)
                          }
                          className="absolute top-3 right-3 p-1.5 text-[var(--foreground-muted)] bg-[var(--surface2)] rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-3 mb-3 pr-8">
                          <div className="w-8 h-8 rounded-full bg-[var(--surface2)] flex flex-col items-center justify-center font-bold text-[var(--foreground-muted)] text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-[var(--foreground)] text-[15px]">
                              {e.name}
                            </h4>
                            <p className="text-xs text-[var(--foreground-muted)] font-medium">
                              {e.muscleGroup || e.category} ·{" "}
                              {e.equipment || "Machine"}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-1">
                          <div className="relative">
                            <label
                              htmlFor={`sets-${e.routineExerciseId}`}
                              className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase absolute -top-2 left-3 bg-[var(--surface)] px-1"
                            >
                              Sets
                            </label>
                            <input
                              id={`sets-${e.routineExerciseId}`}
                              type="number"
                              value={e.targetSets}
                              onChange={(ev) =>
                                updateSetRep(
                                  e.routineExerciseId,
                                  "targetSets",
                                  ev.target.value
                                )
                              }
                              className="w-full bg-transparent border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                          <div className="relative">
                            <label
                              htmlFor={`reps-${e.routineExerciseId}`}
                              className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase absolute -top-2 left-3 bg-[var(--surface)] px-1"
                            >
                              Target Reps
                            </label>
                            <input
                              id={`reps-${e.routineExerciseId}`}
                              type="text"
                              placeholder="e.g. 8-12"
                              value={e.targetReps}
                              onChange={(ev) =>
                                updateSetRep(
                                  e.routineExerciseId,
                                  "targetReps",
                                  ev.target.value
                                )
                              }
                              className="w-full bg-transparent border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pb-12">
                <button
                  onClick={handleSaveRoutine}
                  disabled={
                    !newRoutineName.trim() || selectedExercises.length === 0
                  }
                  className="w-full py-4 rounded-2xl font-bold tracking-wide text-[15px] disabled:opacity-50 transition-all bg-[var(--accent)] text-white shadow-lg active:scale-[0.98]"
                >
                  Save Routine
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── EXERCISE SEARCH OVERLAY (shared between create & preview) ──────── */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[2000] bg-[var(--background)] flex flex-col pt-safe-top"
          >
            <div className="flex flex-col gap-0 sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)] shadow-md">
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => {
                    setIsSearching(false);
                    setSearchQuery("");
                  }}
                  className="p-2.5 bg-[var(--surface2)] rounded-full text-[var(--foreground)] hover:bg-[var(--surface2)]/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-[var(--foreground-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search exercises..."
                    className="w-full pl-9 pr-4 py-2 bg-[var(--surface2)] rounded-xl outline-none font-medium text-[15px] placeholder:text-[var(--foreground-muted)]/60 h-11 border border-transparent focus:border-[var(--accent)]/30 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 content-scroll">
              <div className="flex flex-col gap-2 pb-safe-bottom">
                {filteredExercises.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() =>
                      view === "preview"
                        ? addPreviewExercise(ex)
                        : handleAddExercise(ex)
                    }
                    className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)] active:scale-95 transition-transform text-left"
                  >
                    <div>
                      <h4 className="font-bold text-[15px]">{ex.name}</h4>
                      <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                        {ex.category} · {ex.equipment || "Machine"}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                      <Plus className="w-4 h-4" />
                    </div>
                  </button>
                ))}
                {filteredExercises.length === 0 && (
                  <div className="p-8 text-center text-[var(--foreground-muted)] font-medium">
                    No exercises found matching &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
