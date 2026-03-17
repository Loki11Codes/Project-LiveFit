'use client';

import React from 'react';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Dumbbell,
  Flame,
  Layout,
  Moon,
  Scale,
  Target,
  TrendingUp,
  Beef,
  Wheat,
  Droplets,
  Leaf,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { AnalyticsResponse, HistoryRow, NutritionStat, WeightTrendPoint } from '@/lib/types';

interface HistoryTabProps {
  readonly history: HistoryRow[];
  readonly analytics: AnalyticsResponse | null;
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
  hidden: { opacity: 0, y: 10 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05, type: 'spring' as const, damping: 20, stiffness: 100 },
  }),
};

const floatAnimation = {
  y: [0, -6, 0],
  transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
};

export default function HistoryTab({ history, analytics }: HistoryTabProps) {
  const nutritionStats = analytics?.nutritionStats ?? [];
  const weightTrend = analytics?.weightTrend ?? [];
  const weightDelta = getWeightDelta(weightTrend);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
          <AnalyticsMetricCard
            icon={Beef}
            label="7-Day Avg Protein"
            value={`${roundNumber(analytics?.averages.protein ?? 0)}g`}
            subtitle={`${analytics?.meta.logCount ?? 0} nutrition entries`}
            tone="var(--green)"
          />
        </motion.div>
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
          <AnalyticsMetricCard
            icon={Flame}
            label="7-Day Avg Calories"
            value={`${roundNumber(analytics?.averages.kcal ?? 0)}`}
            subtitle={`${analytics?.meta.period ?? '7d'} average`}
            tone="var(--amber)"
            suffix="kcal"
          />
        </motion.div>
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
          <WeightTrendCard weightTrend={weightTrend} delta={weightDelta} />
        </motion.div>
      </div>

      <motion.div
        className="card shadow-xl border-[var(--border)]"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={3}
      >
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--surface2)] rounded-lg">
              <TrendingUp className="w-5 h-5" style={{ color: '#4db382' }} />
            </div>
            <div>
              <div className="card-label mb-0">7-Day Nutrition Trend</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">
                Protein and calories by day
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
              Protein
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--amber)]" />
              Calories
            </span>
          </div>
        </div>

        {nutritionStats.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
            {nutritionStats.map((stat, index) => (
              <motion.div
                key={stat.day}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                custom={index}
              >
                <NutritionDayCard stat={stat} nutritionStats={nutritionStats} />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <EmptyAnalyticsState
              icon={TrendingUp}
              message="No nutrition data yet. Log meals to populate the 7-day trend."
            />
          </motion.div>
        )}
      </motion.div>

      <motion.div
        className="card shadow-xl border-[var(--border)]"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={4}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--surface2)] rounded-lg">
              <Calendar className="w-5 h-5" style={{ color: '#7b5ea7' }} />
            </div>
            <div>
              <div className="card-label mb-0">Activity History</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">
                {history.length} Days Tracking
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="history-table w-full border-collapse">
            <thead>
              <tr className="bg-[var(--surface2)]">
                <th className="py-3 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase">
                  Day
                </th>
                <th className="py-3 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center flex items-center justify-center gap-1.5">
                  <Layout className="w-3 h-3" style={{ color: '#e6ac50' }} /> Type
                </th>
                <th className="py-3 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <Moon className="w-3 h-3" style={{ color: '#6b7ea8' }} /> Sleep
                  </span>
                </th>
                <th className="py-3 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <Beef className="w-3 h-3" style={{ color: '#8b4513' }} /> Protein
                  </span>
                </th>
                <th className="py-3 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <Target className="w-3 h-3" style={{ color: '#4db382' }} /> Target
                  </span>
                </th>
                <th className="py-3 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" style={{ color: '#4db382' }} /> Status
                  </span>
                </th>
                <th className="py-3 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <Flame className="w-3 h-3" style={{ color: '#e67e22' }} /> Calories
                  </span>
                </th>
                <th className="py-3 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <Wheat className="w-3 h-3" style={{ color: '#e6ac50' }} /> Carbs
                  </span>
                </th>
                <th className="py-3 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <Droplets className="w-3 h-3" style={{ color: '#d4a23a' }} /> Fats
                  </span>
                </th>
                <th className="py-3 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <Leaf className="w-3 h-3" style={{ color: '#4db382' }} /> Fiber
                  </span>
                </th>
                <th className="py-3 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <Dumbbell className="w-3 h-3" style={{ color: '#c0392b' }} /> Workout
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {history.length > 0 ? (
                history.map((entry, index) => (
                  <motion.tr
                    key={entry.day}
                    className="hover:bg-[var(--surface2)]/50 transition-colors"
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                  >
                    <td className="py-3 px-4 text-[13px] font-medium">{entry.day}</td>
                    <td className="py-3 px-4 text-[12px] text-center font-light uppercase tracking-tight">
                      {entry.type}
                    </td>
                    <td className="py-3 px-4 text-[16px] font-extralight tracking-tighter text-center">
                      {entry.sleep === '--' ? '--' : `${entry.sleep}h`}
                    </td>
                    <td className="py-3 px-4 text-[18px] font-extralight tracking-tighter text-center text-[var(--accent)]">
                      {entry.protein}g
                    </td>
                    <td className="py-3 px-4 text-[14px] text-center text-[var(--text-muted)] opacity-60 tracking-tight">
                      {entry.target}g
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            entry.status === 'completed'
                              ? 'bg-[var(--green)]'
                              : 'bg-[var(--amber)] opacity-40'
                          }`}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[16px] font-extralight tracking-tighter text-center">
                      {entry.kcal}{' '}
                      <span className="text-[10px] text-[var(--text-muted)] opacity-50 uppercase tracking-widest">
                        kcal
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[15px] font-extralight tracking-tighter text-center text-[var(--amber)]">
                      {entry.carbs}g
                    </td>
                    <td className="py-3 px-4 text-[15px] font-extralight tracking-tighter text-center text-[var(--red)]">
                      {entry.fats}g
                    </td>
                    <td className="py-3 px-4 text-[15px] font-extralight tracking-tighter text-center text-[var(--green)]">
                      {entry.fiber}g
                    </td>
                    <td className="py-3 px-4 text-[13px] text-center text-[var(--text-muted)] font-medium opacity-60">
                      {entry.workout}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-[var(--text-muted)]">
                    <motion.div animate={floatAnimation}>
                      <Calendar className="w-8 h-8 mx-auto mb-3 opacity-40" style={{ color: '#7b5ea7' }} />
                    </motion.div>
                    No history logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function AnalyticsMetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  tone,
  suffix,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  subtitle: string;
  tone: string;
  suffix?: string;
}) {
  return (
    <div className="card shadow-xl border-[var(--border)] h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[var(--surface2)] rounded-lg">
          <Icon className="w-5 h-5" style={{ color: tone }} />
        </div>
        <div>
          <div className="card-label mb-0">{label}</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">
            {subtitle}
          </div>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="text-[32px] font-extralight tracking-[-0.04em]" style={{ color: tone }}>
          {value.replace(` ${suffix}`, '')}
        </div>
        {suffix && (
          <span className="pb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function WeightTrendCard({
  weightTrend,
  delta,
}: {
  weightTrend: WeightTrendPoint[];
  delta: number | null;
}) {
  const latestWeight = weightTrend.at(-1)?.weight ?? null;

  return (
    <div className="card shadow-xl border-[var(--border)] h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[var(--surface2)] rounded-lg">
          <Scale className="w-5 h-5" style={{ color: '#a86b12' }} />
        </div>
        <div>
          <div className="card-label mb-0">Weight Trend</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">
            Last 7 days
          </div>
        </div>
      </div>

      {weightTrend.length > 0 && latestWeight !== null ? (
        <>
          <div className="flex items-end justify-between gap-4">
            <div className="text-[32px] font-extralight tracking-[-0.04em] text-[var(--text)]">
              {roundNumber(latestWeight)}
              <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                kg
              </span>
            </div>
            <div
              className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
                delta === null
                  ? 'text-[var(--text-muted)]'
                  : delta <= 0
                    ? 'text-[var(--green)]'
                    : 'text-[var(--amber)]'
              }`}
            >
              {delta === null ? 'No change' : `${delta > 0 ? '+' : ''}${roundNumber(delta)} kg`}
            </div>
          </div>

          <div className="mt-5 h-[88px]">
            <Sparkline points={weightTrend.map((point) => point.weight)} />
          </div>
        </>
      ) : (
        <EmptyAnalyticsState
          icon={Scale}
          message="Add body measurements to unlock the weight trend."
          compact
        />
      )}
    </div>
  );
}

function NutritionDayCard({
  stat,
  nutritionStats,
}: {
  stat: NutritionStat;
  nutritionStats: NutritionStat[];
}) {
  const maxProtein = Math.max(...nutritionStats.map((entry) => entry.protein), 1);
  const maxKcal = Math.max(...nutritionStats.map((entry) => entry.kcal), 1);
  const proteinHeight = `${Math.max((stat.protein / maxProtein) * 100, 8)}%`;
  const kcalHeight = `${Math.max((stat.kcal / maxKcal) * 100, 8)}%`;

  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface2)]/60 p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">
        {stat.day}
      </div>
      <div className="h-[100px] flex items-end justify-center gap-2">
        <div className="flex h-full w-full max-w-[42px] flex-col justify-end">
          <motion.div
            className="rounded-t-[14px] bg-[var(--accent)]"
            initial={{ height: 0 }}
            animate={{ height: proteinHeight }}
            transition={{ delay: 0.3, type: 'spring', damping: 15, stiffness: 80 }}
          />
        </div>
        <div className="flex h-full w-full max-w-[42px] flex-col justify-end">
          <motion.div
            className="rounded-t-[14px] bg-[var(--amber)]"
            initial={{ height: 0 }}
            animate={{ height: kcalHeight }}
            transition={{ delay: 0.4, type: 'spring', damping: 15, stiffness: 80 }}
          />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div>
          <div className="text-[16px] font-light tracking-[-0.04em] text-[var(--text)]">
            {roundNumber(stat.protein)}
          </div>
          <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            protein
          </div>
        </div>
        <div>
          <div className="text-[16px] font-light tracking-[-0.04em] text-[var(--text)]">
            {roundNumber(stat.kcal)}
          </div>
          <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            kcal
          </div>
        </div>
      </div>
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const width = 320;
  const height = 64;
  const padding = 8;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const linePath = points
    .map((point, index) => {
      const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((point - min) / range) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const areaPath = `${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
  const finalPoint = points.at(-1) ?? points[0];
  const finalX = padding + (Math.max(points.length - 1, 0) / Math.max(points.length - 1, 1)) * (width - padding * 2);
  const finalY =
    height - padding - ((finalPoint - min) / range) * (height - padding * 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.24" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#weight-area)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={finalX} cy={finalY} r="4.5" fill="var(--accent)" />
    </svg>
  );
}

function EmptyAnalyticsState({
  icon: Icon,
  message,
  compact = false,
}: {
  icon: typeof Activity;
  message: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`text-center rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface2)]/20 ${
        compact ? 'py-10 px-5' : 'py-16 px-5'
      }`}
    >
      <motion.div animate={floatAnimation}>
        <Icon className="w-8 h-8 mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
      </motion.div>
      <p className="text-[12px] text-[var(--text-muted)] leading-relaxed max-w-[260px] mx-auto">
        {message}
      </p>
    </div>
  );
}

function getWeightDelta(weightTrend: WeightTrendPoint[]): number | null {
  if (weightTrend.length < 2) {
    return null;
  }

  return weightTrend[weightTrend.length - 1].weight - weightTrend[0].weight;
}

function roundNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
