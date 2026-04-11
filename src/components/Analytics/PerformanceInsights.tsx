'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Calendar } from 'lucide-react';
import type { HistoryRow } from '@/lib/types';
import { cardVariants } from '@/lib/animations';

interface PerformanceInsightsProps {
  readonly history: HistoryRow[];
}

export default function PerformanceInsights({ history }: PerformanceInsightsProps) {
  const reversedHistory = useMemo(() => [...history].reverse(), [history]);
  
  // 1. Volume Trend Data
  const volumeData = useMemo(() => {
    return reversedHistory.map(h => h.totalVolume ?? 0);
  }, [reversedHistory]);

  // 2. Focus Distribution Data
  const focusDistribution = useMemo(() => {
    const map = new Map<string, number>();
    history.forEach(h => {
      if (h.workout !== '--') {
        h.workout.split(', ').forEach(f => {
          map.set(f, (map.get(f) ?? 0) + 1);
        });
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [history]);

  // 3. Consistency Stats
  const stats = useMemo(() => {
    const last30Days = history.slice(0, 30);
    const workoutDays = last30Days.filter(h => h.workout !== '--').length;
    const avgVolume = last30Days.reduce((acc, h) => acc + (h.totalVolume ?? 0), 0) / (workoutDays || 1);
    
    return {
      frequency: (workoutDays / (last30Days.length || 1)) * 100,
      workoutDays,
      avgVolume: Math.round(avgVolume)
    };
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="py-20 text-center opacity-40">
        <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="text-sm font-black uppercase tracking-widest">No performance data yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Volume Trend Chart */}
      <motion.div 
        className="glass-premium p-6 rounded-[var(--radius-lg)] lg:col-span-2"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#185fa5]/10 rounded-xl">
              <TrendingUp className="w-5 h-5 text-[#3b82f6]" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Progression</div>
              <h3 className="text-sm font-black uppercase tracking-tight">Strength Volume Trend</h3>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[18px] font-black text-[#3b82f6] tracking-tight">{stats.avgVolume} kg</div>
            <div className="text-[8px] font-black uppercase tracking-widest opacity-40">Avg Volume / Session</div>
          </div>
        </div>

        <div className="h-[200px] w-full mt-4">
          <VolumeChart data={volumeData} labels={reversedHistory.map(h => h.day)} />
        </div>
      </motion.div>

      {/* Focus Distribution */}
      <motion.div 
        className="glass-premium p-6 rounded-[var(--radius-lg)]"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={1}
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-[#f59e0b]/10 rounded-xl">
            <Target className="w-5 h-5 text-[#f59e0b]" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Analysis</div>
            <h3 className="text-sm font-black uppercase tracking-tight">Focus Distribution</h3>
          </div>
        </div>

        <div className="space-y-4">
          {focusDistribution.map(([name, count], idx) => (
            <div key={name} className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                <span className="opacity-60">{name}</span>
                <span className="text-[#f59e0b]">{count} Sessions</span>
              </div>
              <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / history.length) * 100}%` }}
                  transition={{ delay: 0.5 + (idx * 0.1), duration: 1 }}
                />
              </div>
            </div>
          ))}
          {focusDistribution.length === 0 && (
            <div className="py-10 text-center opacity-30 text-[10px] uppercase font-bold tracking-widest">
              No focuses logged yet
            </div>
          )}
        </div>
      </motion.div>

      {/* Consistency Stats */}
      <motion.div 
        className="glass-premium p-6 rounded-[var(--radius-lg)]"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={2}
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-[#10b981]/10 rounded-xl">
            <Calendar className="w-5 h-5 text-[#10b981]" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Consistency</div>
            <h3 className="text-sm font-black uppercase tracking-tight">Active Frequency</h3>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center h-[calc(100%-80px)]">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="64" cy="64" r="58" 
                className="stroke-black/5 dark:stroke-white/5 fill-none" 
                strokeWidth="8"
              />
              <motion.circle 
                cx="64" cy="64" r="58" 
                className="stroke-[#10b981] fill-none" 
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ strokeDasharray: "364 364", strokeDashoffset: 364 }}
                animate={{ strokeDashoffset: 364 - (364 * (stats.frequency / 100)) }}
                transition={{ delay: 0.8, duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-[#10b981]">{Math.round(stats.frequency)}%</span>
              <span className="text-[8px] font-black opacity-40 uppercase tracking-widest">Active</span>
            </div>
          </div>
          <div className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
            {stats.workoutDays} Workouts / Last 30 Days
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function VolumeChart({ data, labels }: { readonly data: number[], readonly labels: string[] }) {
  const max = Math.max(...data, 1000); // Scale to at least 1000kg
  const min = Math.min(...data);
  const range = max - min || 1;


  const points = useMemo(() => {
    return data.map((val, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - ((val - min) / range) * 80 - 10; // 10% padding
      return { x, y, val, label: labels[i] };
    });
  }, [data, min, range, labels]);

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaData = `${pathData} L ${points.at(-1)?.x || 0} 100 L 0 100 Z`;

  return (
    <div className="relative w-full h-full group">
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="vol-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Helper Lines */}
        <line x1="0" y1="10" x2="100" y2="10" className="stroke-black/5 dark:stroke-white/5" strokeWidth="0.5" strokeDasharray="2" />
        <line x1="0" y1="50" x2="100" y2="50" className="stroke-black/5 dark:stroke-white/5" strokeWidth="0.5" strokeDasharray="2" />
        <line x1="0" y1="90" x2="100" y2="90" className="stroke-black/5 dark:stroke-white/5" strokeWidth="0.5" strokeDasharray="2" />

        <path d={areaData} fill="url(#vol-grad)" />
        <motion.path 
          d={pathData} 
          fill="none" 
          stroke="#3b82f6" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />

        {/* Interaction Points */}
        {points.map((p, i) => (
          <g key={`${p.x}-${i}`} className="group/point">
            <motion.circle 
              cx={p.x} cy={p.y} r="0.8" 
              className="fill-white dark:fill-blue-500 stroke-[#3b82f6] stroke-[0.5]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1 + (i * 0.05) }}
            />
            {/* Tooltip Simulation on hover */}
            <rect x={p.x - 5} y={p.y - 12} width="10" height="8" rx="1" className="fill-[#185fa5] opacity-0 group-hover/point:opacity-100 transition-opacity" />
            <text x={p.x} y={p.y - 7} className="text-[3px] font-black fill-white text-center opacity-0 group-hover/point:opacity-100 transition-opacity" textAnchor="middle">
              {p.val}kg
            </text>
          </g>
        ))}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-[-25px] left-0 right-0 flex justify-between px-2">
        <span className="text-[7px] font-black uppercase opacity-30">{labels[0]}</span>
        <span className="text-[7px] font-black uppercase opacity-30">{labels[Math.floor(labels.length/2)]}</span>
        <span className="text-[7px] font-black uppercase opacity-30">{labels.at(-1)}</span>
      </div>
    </div>
  );
}
