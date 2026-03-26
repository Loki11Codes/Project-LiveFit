"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Dumbbell, X, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RoutinesTabProps {
  readonly onStart?: (routine: any) => void;
}

export function RoutinesTab({ onStart }: RoutinesTabProps) {
  const [view, setView] = useState<"list" | "create">("list");
  const [routines, setRoutines] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      // We will fetch routines and exercises from the API
      const [routinesRes, exercisesRes] = await Promise.all([
        fetch("/api/routines"),
        fetch("/api/exercises")
      ]);
      if (routinesRes.ok) setRoutines(await routinesRes.json());
      if (exercisesRes.ok) setExercises(await exercisesRes.json());
    } catch (err) {
      console.error("Failed to load routine data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExercise = (exercise: any) => {
    setSelectedExercises([
      ...selectedExercises,
      {
        ...exercise,
        routineExerciseId: crypto.randomUUID(),
        targetSets: 3,
        targetReps: "8-12"
      }
    ]);
    setIsSearching(false);
    setSearchQuery("");
  };

  const handleRemoveExercise = (id: string) => {
    setSelectedExercises(selectedExercises.filter(e => e.routineExerciseId !== id));
  };

  const updateSetRep = (id: string, field: "targetSets" | "targetReps", value: string | number) => {
    setSelectedExercises(selectedExercises.map(e => 
      e.routineExerciseId === id ? { ...e, [field]: value } : e
    ));
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
            targetReps: e.targetReps
          }))
        })
      });

      if (res.ok) {
        setView("list");
        setNewRoutineName("");
        setSelectedExercises([]);
        fetchData(); // Refresh list
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

  const filteredExercises = exercises.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col pt-safe-top tracking-tight text-[var(--foreground)] min-h-[100dvh] pb-24 px-4 sm:px-6">
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full flex items-center justify-between py-6 sticky top-0 bg-[var(--background)]/[0.85] backdrop-blur-md z-30 border-b border-[var(--border)]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-gradient)] flex items-center justify-center shadow-lg transform rotate-3">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--foreground)] to-[var(--foreground-muted)]">
              {view === "list" ? "My Routines" : "Create Routine"}
            </h1>
            <p className="text-sm font-medium text-[var(--foreground-muted)]">
              {view === "list" ? "Your saved workout templates" : "Build a custom workout"}
            </p>
          </div>
        </div>
        
        {view === "list" ? (
          routines.length > 0 && (
            <button 
              onClick={() => setView("create")}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] text-[var(--accent)] font-semibold rounded-full border border-[var(--border)] shadow-sm active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Routine</span>
            </button>
          )
        ) : (
          <button 
            onClick={() => setView("list")}
            className="p-2 bg-[var(--surface)] text-[var(--foreground-muted)] rounded-full border border-[var(--border)] shadow-sm active:scale-95 transition-transform"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </motion.div>

      <div className="py-6 flex flex-col gap-6 relative">
        <AnimatePresence mode="wait">
          {view === "list" ? (
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
                  <p className="text-[var(--foreground-muted)] max-w-[250px] text-sm">Create your first custom workout template to get started.</p>
                  <button 
                    onClick={() => setView("create")}
                    className="mt-6 px-6 py-2.5 bg-[var(--accent)] text-white font-semibold rounded-full shadow-[0_4px_14px_rgba(123,94,167,0.39)]"
                  >
                    Create Routine
                  </button>
                </div>
              ) : (
                routines.map((routine) => (
                  <div key={routine.id} className="p-5 bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">{routine.name}</h3>
                      <button 
                        onClick={() => onStart?.(routine)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg font-semibold text-sm active:scale-95 transition-transform"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Start
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">{routine.exercises.length} Exercises</p>
                      <div className="text-sm text-[var(--foreground)]/80 leading-relaxed truncate">
                        {routine.exercises.map((e: any) => e.exercise.name).join(", ")}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <label htmlFor="routine-name" className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-wider ml-1">Routine Name</label>
                <input
                  id="routine-name"
                  type="text"
                  placeholder="e.g. Push Day, Pull Day, Legs"
                  className="w-full px-5 py-3.5 bg-[var(--surface)] rounded-xl border border-[var(--border)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all font-medium text-lg placeholder:text-[var(--foreground-muted)]/50 shadow-inner"
                  value={newRoutineName}
                  onChange={e => setNewRoutineName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="exercise-search-trigger" className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-wider ml-1">Exercises</label>
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
                      <p className="text-[var(--foreground-muted)] font-medium mb-4">You haven't added any exercises to this routine yet.</p>
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
                      <div key={e.routineExerciseId} className="flex flex-col p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm relative group">
                        <button onClick={() => handleRemoveExercise(e.routineExerciseId)} className="absolute top-3 right-3 p-1.5 text-[var(--foreground-muted)] bg-[var(--surface2)] rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-3 pr-8">
                           <div className="w-8 h-8 rounded-full bg-[var(--surface2)] flex flex-col items-center justify-center font-bold text-[var(--foreground-muted)] text-sm">
                             {idx + 1}
                           </div>
                           <div>
                             <h4 className="font-bold text-[var(--foreground)] text-[15px]">{e.name}</h4>
                             <p className="text-xs text-[var(--foreground-muted)] font-medium">{e.muscleGroup || e.category} • {e.equipment || "Machine"}</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-1">
                          <div className="relative">
                            <label htmlFor={`sets-${e.routineExerciseId}`} className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase absolute -top-2 left-3 bg-[var(--surface)] px-1">Sets</label>
                            <input 
                              id={`sets-${e.routineExerciseId}`}
                              type="number" 
                              value={e.targetSets} 
                              onChange={(ev) => updateSetRep(e.routineExerciseId, "targetSets", ev.target.value)}
                              className="w-full bg-transparent border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                          <div className="relative">
                            <label htmlFor={`reps-${e.routineExerciseId}`} className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase absolute -top-2 left-3 bg-[var(--surface)] px-1">Target Reps</label>
                            <input 
                              id={`reps-${e.routineExerciseId}`}
                              type="text" 
                              placeholder="e.g. 8-12"
                              value={e.targetReps} 
                              onChange={(ev) => updateSetRep(e.routineExerciseId, "targetReps", ev.target.value)}
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
                  disabled={!newRoutineName.trim() || selectedExercises.length === 0}
                  className="w-full py-4 rounded-2xl font-bold tracking-wide text-[15px] disabled:opacity-50 transition-all bg-[var(--accent)] text-white shadow-lg active:scale-[0.98]"
                >
                  Save Routine
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Overlay */}
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
                  onClick={() => setIsSearching(false)} 
                  className="p-2.5 bg-[var(--surface2)] rounded-full text-[var(--foreground)] hover:bg-[var(--surface2)]/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex-1 relative flex items-center gap-2">
                   <div className="flex-1 relative">
                     <Search className="w-4 h-4 text-[var(--foreground-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                     <input 
                       type="text"
                       autoFocus
                       placeholder="Search exercises..."
                       className="w-full pl-9 pr-4 py-2 bg-[var(--surface2)] rounded-xl outline-none font-medium text-[15px] placeholder:text-[var(--foreground-muted)]/60 h-11 border border-transparent focus:border-[var(--accent)]/30 transition-all"
                       value={searchQuery}
                       onChange={e => setSearchQuery(e.target.value)}
                     />
                   </div>
                   <button 
                    className="px-5 h-11 bg-[var(--accent)] text-[var(--accent-inv)] font-bold rounded-xl shadow-lg active:scale-95 transition-all text-sm"
                   >
                     Search
                   </button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 content-scroll">
               <div className="flex flex-col gap-2 pb-safe-bottom">
                 {filteredExercises.map(ex => (
                   <button 
                     key={ex.id} 
                     onClick={() => handleAddExercise(ex)}
                     className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)] active:scale-95 transition-transform text-left"
                   >
                     <div>
                       <h4 className="font-bold text-[15px]">{ex.name}</h4>
                       <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{ex.category} • {ex.equipment || 'Machine'}</p>
                     </div>
                     <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                       <Plus className="w-4 h-4" />
                     </div>
                   </button>
                 ))}
                 {filteredExercises.length === 0 && (
                   <div className="p-8 text-center text-[var(--foreground-muted)] font-medium">
                     No exercises found matching "{searchQuery}"
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
