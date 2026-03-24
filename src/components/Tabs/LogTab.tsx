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
import { cardVariants, rowVariants } from '@/lib/animations';
import EmptyState from '@/components/Shared/EmptyState';

interface LogTabProps {
  readonly foodLog: FoodLog[];
  readonly protein: number;
  readonly workouts: WorkoutLog[];
  readonly sleepLogs: SleepLog[];
}


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
                  <div className="log-row-val whitespace-nowrap text-[18px] font-extralight tracking-tighter text-[var(--text)]">
                    {food.protein}g
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
                        <Clock className="w-3 h-3" style={{ color: '#a86b12' }} />
                        {new Date(workout.time).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3" style={{ color: '#e67e22' }} />
                        {workout.volume ?? '--'} kg
                      </span>
                    </div>
                  </div>
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
                  <div className="log-row-val text-[16px]">
                    {sleep.hours}
                    <span className="text-[12px]"> hrs</span>
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
