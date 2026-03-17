'use client';

import React from 'react';
import type { FoodLog, SleepLog, WorkoutLog } from '@prisma/client';
import {
  Utensils,
  Dumbbell,
  Moon,
  Clock,
  Flame,
  Wheat,
  Droplets,
  Leaf,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface LogTabProps {
  readonly foodLog: FoodLog[];
  readonly protein: number;
  readonly workouts: WorkoutLog[];
  readonly sleepLogs: SleepLog[];
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.1, type: 'spring' as const, damping: 20, stiffness: 100 },
  }),
};

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.15 + index * 0.05, type: 'spring' as const, damping: 20, stiffness: 120 },
  }),
};

const floatAnimation = {
  y: [0, -6, 0],
  transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
};

export default function LogTab({
  foodLog,
  protein,
  workouts,
  sleepLogs,
}: LogTabProps) {
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
              <Utensils className="w-5 h-5 text-[var(--text-muted)]" />
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
                        <Clock className="w-3 h-3" />
                        {new Date(food.time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {food.kcal ?? '?'} kcal
                      </span>
                      <span className="flex items-center gap-1 text-[var(--amber)]">
                        <Wheat className="w-3 h-3" />
                        {food.carbs ?? '?'}g
                      </span>
                      <span className="flex items-center gap-1 text-[var(--red)]">
                        <Droplets className="w-3 h-3" />
                        {food.fats ?? '?'}g
                      </span>
                      <span className="flex items-center gap-1 text-[var(--green)]">
                        <Leaf className="w-3 h-3" />
                        {food.fiber ?? '?'}g
                      </span>
                    </div>
                  </div>
                  <div className="log-row-val whitespace-nowrap text-[18px] font-extralight tracking-tighter text-[var(--text)]">
                    {food.protein}g
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                className="empty text-center py-12 px-5 text-[var(--text-muted)] text-[12px] tracking-[0.04em] border border-dashed border-[var(--border)] rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div animate={floatAnimation}>
                  <Utensils className="w-8 h-8 mx-auto mb-3 opacity-20" />
                </motion.div>
                No food logged yet - use the Chat tab.
              </motion.div>
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
            <Dumbbell className="w-5 h-5 text-[var(--text-muted)]" />
            <div className="card-label mb-0">Workout</div>
          </div>
          <div className="space-y-2">
            {workouts.length > 0 ? (
              workouts.slice(0, 4).map((workout, index) => (
                <motion.div
                  key={workout.id}
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
                      {workout.focus}
                    </div>
                    <div className="log-row-meta flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(workout.time).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {workout.volume ?? '--'} kg
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                className="empty text-center py-12 px-5 text-[var(--text-muted)] text-[12px] border border-dashed border-[var(--border)] rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div animate={floatAnimation}>
                  <Dumbbell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                </motion.div>
                Nothing logged yet.
              </motion.div>
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
            <Moon className="w-5 h-5 text-[var(--text-muted)]" />
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
                      <Clock className="w-4 h-4 text-[var(--text-muted)]" />
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
                  <div className="log-row-val text-[16px]">
                    {sleep.hours}
                    <span className="text-[12px]"> hrs</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                className="empty text-center py-12 px-5 text-[var(--text-muted)] text-[12px] border border-dashed border-[var(--border)] rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <motion.div animate={floatAnimation}>
                  <Moon className="w-8 h-8 mx-auto mb-3 opacity-20" />
                </motion.div>
                No sleep logged yet.
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
