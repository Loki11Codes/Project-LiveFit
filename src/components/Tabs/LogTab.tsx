'use client';

import React from 'react';
import type { FoodLog, SleepLog, WorkoutLogWithRelations } from '@/lib/types';
import {
  Utensils,
  Dumbbell,
  Moon,
  Clock,
  Flame,
  Wheat,
  Droplets,
  Leaf,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cardVariants, rowVariants } from '@/lib/animations';
import EmptyState from '@/components/Shared/EmptyState';

interface LogTabProps {
  readonly foodLog: FoodLog[];
  readonly protein: number;
  readonly workouts: WorkoutLogWithRelations[];
  readonly sleepLogs: SleepLog[];
  readonly onDeleteWorkout?: (id: string) => void;
  readonly onDeleteFood?: (id: string) => void;
  readonly onDeleteSleep?: (id: string) => void;
}


export default function LogTab({
  foodLog,
  protein,
  workouts,
  sleepLogs,
  onDeleteWorkout,
  onDeleteFood,
  onDeleteSleep,
}: LogTabProps) {
  const [expandedWorkouts, setExpandedWorkouts] = React.useState<Record<string, boolean>>({});

  const toggleWorkout = (id: string) => {
    setExpandedWorkouts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Food Log Card */}
        <motion.div
          className="card md:col-span-2 lg:col-span-2"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5" style={{ color: '#e6ac50' }} />
              <div className="card-label mb-0">Food Log</div>
            </div>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[24px] font-extralight tracking-tighter text-[var(--text)]">
                {protein}g
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Protein
              </span>
            </span>
          </div>
          <div id="food-list" className="space-y-1">
            {foodLog.length > 0 ? (
              foodLog.map((food, index) => (
                <motion.div
                  key={food.id}
                  className="log-row"
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  custom={index}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                >
                  <div className="flex-1">
                    <div className="log-row-name flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] opacity-40" />
                      {food.name}
                    </div>
                    <div className="log-row-meta flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" style={{ color: '#a86b12' }} />
                        {new Date(food.time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3" style={{ color: '#e67e22' }} />
                        {food.kcal ?? '?'} kcal
                      </span>
                      <span className="flex items-center gap-1 text-[var(--amber)]">
                        <Wheat className="w-3 h-3" style={{ color: '#e6ac50' }} />
                        {food.carbs ?? '?'}g
                      </span>
                      <span className="flex items-center gap-1 text-[var(--red)]">
                        <Droplets className="w-3 h-3" style={{ color: '#d4a23a' }} />
                        {food.fats ?? '?'}g
                      </span>
                      <span className="flex items-center gap-1 text-[var(--green)]">
                        <Leaf className="w-3 h-3" style={{ color: '#4db382' }} />
                        {food.fiber ?? '?'}g
                      </span>
                    </div>
                  </div>
                  <div className="log-row-val whitespace-nowrap text-[18px] font-extralight tracking-tighter text-[var(--text)] group relative pr-8">
                    {food.protein}g
                    {onDeleteFood && (
                      <button
                        onClick={() => onDeleteFood(food.id)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--red)] transition-all bg-[var(--surface2)] rounded-lg"
                        title="Delete food log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <EmptyState
                icon={Utensils}
                message="No food logged yet"
                description="Use the Chat tab to log your meals and track nutrition automatically."
                iconColor="#e6ac50"
              />
            )}
          </div>
        </motion.div>
        
        {/* Workout Card */}
        <motion.div
          className="card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <div className="flex items-center gap-2 mb-6">
            <Dumbbell className="w-5 h-5" style={{ color: '#c0392b' }} />
            <div className="card-label mb-0">Workout</div>
          </div>
          <div className="space-y-3">
            {workouts.length > 0 ? (
              workouts.slice(0, 5).map((workout, index) => (
                <motion.div
                  key={workout.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface2)]/30"
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  custom={index}
                >
                  <button
                    onClick={() => toggleWorkout(workout.id)}
                    className="flex-1 flex items-start justify-between p-4 hover:bg-[var(--surface2)]/50 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <div className="log-row-name flex items-center gap-2 font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" />
                        {workout.focus}
                      </div>
                      <div className="log-row-meta flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" style={{ color: '#a86b12' }} />
                          {new Date(workout.time).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-[var(--accent)]">
                          <Flame className="w-3 h-3" style={{ color: '#e67e22' }} />
                          {workout.volume ?? '--'} kg
                        </span>
                        {workout.exercises.length > 0 && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                            {workout.exercises.length} Exercises
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pr-4">
                      {onDeleteWorkout && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteWorkout(workout.id);
                          }}
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)]/20 rounded-xl transition-all shrink-0"
                          title="Delete workout"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {workout.exercises.length > 0 && (
                        <div className="mt-1">
                          {expandedWorkouts[workout.id] ? (
                            <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                          )}
                        </div>
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedWorkouts[workout.id] && workout.exercises.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-[var(--border)] bg-[var(--surface)]/40 px-4 py-3"
                      >
                        <div className="space-y-4">
                          {workout.exercises.map((ex) => (
                            <div key={ex.id} className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[var(--text)]">
                                  {ex.exercise?.name || ex.customName}
                                </span>
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                                  {ex.sets.length} Sets
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {ex.sets.map((set) => (
                                  <div
                                    key={set.id}
                                    className="px-2 py-1 rounded bg-[var(--surface2)] border border-[var(--border)] text-[10px] font-medium"
                                  >
                                    <span className="text-[var(--text-muted)]">S{set.setNumber}: </span>
                                    <span className="text-[var(--text)]">
                                      {set.weight ?? '--'}kg x {set.reps ?? '--'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            ) : (
              <EmptyState
                icon={Dumbbell}
                message="No workouts logged"
                description="Nothing logged yet. Start a session and log it via the Chat tab."
                iconColor="#c0392b"
                compact
              />
            )}
          </div>
        </motion.div>

        {/* Sleep Card */}
        <motion.div
          className="card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <div className="flex items-center gap-2 mb-6">
            <Moon className="w-5 h-5" style={{ color: '#6b7ea8' }} />
            <div className="card-label mb-0">Sleep</div>
          </div>
          <div className="space-y-2">
            {sleepLogs.length > 0 ? (
              sleepLogs.slice(0, 3).map((sleep, index) => (
                <motion.div
                  key={sleep.id}
                  className="log-row border-none hover:bg-transparent"
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  custom={index}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                >
                  <div>
                    <div className="log-row-name flex items-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: '#a86b12' }} />
                      Duration
                    </div>
                    <div className="log-row-meta">
                      {new Date(sleep.time).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                      {(sleep.bedTime || sleep.wakeTime) &&
                        ` | ${sleep.bedTime ?? '--'} to ${sleep.wakeTime ?? '--'}`}
                    </div>
                  </div>
                  <div className="log-row-val text-[16px] group relative pr-8">
                    {sleep.hours}
                    <span className="text-[12px]"> hrs</span>
                    {onDeleteSleep && (
                      <button
                        onClick={() => onDeleteSleep(sleep.id)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--red)] transition-all bg-[var(--surface2)] rounded-lg"
                        title="Delete sleep log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <EmptyState
                icon={Moon}
                message="No sleep records"
                description="No sleep logged yet. Track your rest to optimize recovery."
                iconColor="#6b7ea8"
                compact
              />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
