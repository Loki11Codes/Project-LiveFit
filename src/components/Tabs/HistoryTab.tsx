'use client';

import React from 'react';
import {
  Activity,
  Calendar,
  Scale,
  TrendingUp,
  Beef,
  Flame,
  LayoutGrid,
  Trophy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cardVariants, rowVariants } from '@/lib/animations';
import EmptyState from '@/components/Shared/EmptyState';
import PerformanceInsights from '@/components/Analytics/PerformanceInsights';
import type { AnalyticsResponse, HistoryRow, NutritionStat, WeightTrendPoint } from '@/lib/types';

interface HistoryTabProps {
  readonly history: HistoryRow[];
  readonly analytics: AnalyticsResponse | null;
  readonly kcalTarget: number;
  readonly proteinTarget: number;
}


export default function HistoryTab({
  history,
  analytics,
  kcalTarget,
  proteinTarget,
}: HistoryTabProps) {
  const [viewMode, setViewMode] = React.useState<'table' | 'performance'>('table');
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
        className="glass-premium p-6 rounded-[var(--radius-lg)] overflow-hidden"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={3}
      >
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--surface2)] rounded-xl">
              <TrendingUp className="w-5 h-5 text-[var(--trend-up)]" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Composition</div>
              <h3 className="text-sm font-black tracking-tight">7-Day Nutrition Trend</h3>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)]" /> Protein
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--amber)]" /> Calories
            </span>
          </div>
        </div>

        {nutritionStats.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {nutritionStats.map((stat, index) => (
              <motion.div
                key={stat.day}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                custom={index}
              >
                <NutritionDayCard
                  stat={stat}
                  nutritionStats={nutritionStats}
                  kcalTarget={kcalTarget}
                  proteinTarget={proteinTarget}
                />
              </motion.div>
            ))}
          </div>
        ) : (
            <EmptyState
              icon={TrendingUp}
              message="No nutrition data yet"
              description="Log meals via the chat to populate the 7-day trend visualization."
              iconColor="var(--trend-up)"
            />
        )}
      </motion.div>

      <motion.div
        className="glass-premium p-6 rounded-[var(--radius-lg)] overflow-hidden"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={4}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--surface2)] rounded-xl">
              <Calendar className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Timeline</div>
              <h3 className="text-sm font-black tracking-tight uppercase">Activity Logs</h3>
              <div className="text-[10px] font-black opacity-30 uppercase tracking-widest mt-0.5">
                {history.length} Days Tracking
              </div>
            </div>
          </div>

          <div className="flex bg-[var(--surface2)] p-1 rounded-xl border border-[var(--border)]">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                viewMode === 'table'
                  ? 'bg-[var(--accent)] text-white shadow-lg'
                  : 'opacity-40 hover:opacity-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode('performance')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                viewMode === 'performance'
                  ? 'bg-[var(--accent)] text-white shadow-lg'
                  : 'opacity-40 hover:opacity-100'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Performance
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'table' ? (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] dark:border-white/5"
            >
              <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--surface2)]">
                <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--text-muted)] uppercase text-left">Day</th>
                <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--text-muted)] uppercase text-center">Type</th>
                <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--green)] uppercase text-center">Protein</th>
                <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--amber)] uppercase text-center">Kcal</th>
                <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--red)] uppercase text-center">Workout</th>
                <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--text-muted)] uppercase text-center">Sleep</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {history.length > 0 ? (
                history.map((entry, index) => (
                  <motion.tr
                    key={entry.day}
                    className="hover:bg-white/50 dark:hover:bg-black/50 transition-colors"
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                  >
                    <td className="py-4 px-4 text-[11px] font-black uppercase opacity-60">{entry.day}</td>
                    <td className="py-4 px-4 text-[10px] text-center font-black uppercase tracking-widest opacity-40">
                      {entry.type}
                    </td>
                    <td className="py-4 px-4 text-[16px] font-black tracking-tight text-center text-[var(--green)]">
                      {entry.protein}g
                    </td>
                    <td className="py-4 px-4 text-[16px] font-black tracking-tight text-center text-[var(--amber)]">
                      {entry.kcal}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {entry.workout === '--' ? (
                         <span className="text-[12px] font-black opacity-40">--</span>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[12px] font-black text-[var(--red)] uppercase tracking-tight">
                            {entry.workout}
                          </span>
                          {(entry.workoutDetail || entry.totalVolume) && (
                            <div className="flex items-center gap-1.5">
                              {entry.workoutDetail && (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-[var(--red)]/10 text-[var(--red)] uppercase">
                                  {entry.workoutDetail}
                                </span>
                              )}
                              {entry.totalVolume && (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-[var(--surface3)] text-[var(--text-muted)] uppercase">
                                  {entry.totalVolume} kg
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-[12px] font-black text-center opacity-40">
                      {entry.sleep === '--' ? '--' : `${entry.sleep}h`}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-[var(--text-muted)] opacity-40">
                    No history logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
            </motion.div>
          ) : (
            <motion.div
              key="performance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <PerformanceInsights history={history} />
            </motion.div>
          )}
        </AnimatePresence>
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
  readonly icon: typeof Activity;
  readonly label: string;
  readonly value: string;
  readonly subtitle: string;
  readonly tone: string;
  readonly suffix?: string;
}) {
  return (
    <div className="glass-premium hover-glow p-6 rounded-[var(--radius-lg)] h-full transition-all group">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-[var(--surface2)] rounded-xl group-hover:bg-[var(--accent)]/5 transition-colors">
          <Icon className="w-5 h-5" style={{ color: tone }} />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{label}</div>
          <div className="text-xs font-black tracking-tight opacity-60">
            {subtitle}
          </div>
        </div>
      </div>

      <div className="flex items-end gap-2 px-1">
        <div className="text-[36px] font-black tracking-tighter leading-none" style={{ color: tone }}>
          {value.replaceAll(` ${suffix}`, '').replaceAll('g', '')}
          {value.includes('g') && <span className="ml-1 text-sm opacity-40 uppercase tracking-widest font-black">g</span>}
        </div>
        {suffix && (
          <span className="pb-1.5 text-[10px] font-black uppercase tracking-[0.2em] opacity-30">
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
  readonly weightTrend: WeightTrendPoint[];
  readonly delta: number | null;
}) {
  const latestWeight = weightTrend.at(-1)?.weight ?? null;
  const isPositive = delta! > 0;
  
  const getWeightStatus = () => {
    if (delta === null) return { color: 'text-neutral-500 bg-neutral-500/10', text: 'No change' };
    return {
      color: delta <= 0 ? 'text-[var(--trend-up)] bg-[var(--trend-up)]/10' : 'text-[var(--trend-down)] bg-[var(--trend-down)]/10',
      text: `${isPositive ? '+' : ''}${roundNumber(delta)} kg`
    };
  };

  const { color: deltaBadge, text: deltaText } = getWeightStatus();

  return (
    <div className="glass-premium hover-glow p-6 rounded-[var(--radius-lg)] h-full group overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-[var(--surface2)] rounded-xl">
          <Scale className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Performance</div>
          <h3 className="text-sm font-black tracking-tight">Weight Trend</h3>
        </div>
      </div>

      {weightTrend.length > 0 && latestWeight !== null ? (
        <>
          <div className="flex items-end justify-between gap-4 px-1">
            <div className="text-[36px] font-black tracking-tighter leading-none text-[var(--foreground)]">
              {roundNumber(latestWeight)}
              <span className="ml-1 text-sm font-black uppercase tracking-widest opacity-30">
                kg
              </span>
            </div>
            <div className={`trend-badge ${deltaBadge}`}>
              {deltaText}
            </div>
          </div>

          <div className="mt-5 h-[88px] -mx-6 mb-[-24px]">
            <Sparkline points={weightTrend.map((point) => point.weight)} />
          </div>
        </>
      ) : (
        <EmptyState
          icon={Scale}
          message="Add body measurements"
          description="Record your weight to unlock the weight trend visualization."
          iconColor="var(--accent)"
          compact
        />
      )}
    </div>
  );
}

function NutritionDayCard({
  stat,
  nutritionStats,
  kcalTarget,
  proteinTarget,
}: {
  readonly stat: NutritionStat;
  readonly nutritionStats: NutritionStat[];
  readonly kcalTarget: number;
  readonly proteinTarget: number;
}) {
  const maxProtein = Math.max(...nutritionStats.map((entry) => entry.protein), proteinTarget, 1);
  const maxKcal = Math.max(...nutritionStats.map((entry) => entry.kcal), kcalTarget, 1);
  const proteinHeight = `${Math.max((stat.protein / maxProtein) * 100, 8)}%`;
  const kcalHeight = `${Math.max((stat.kcal / maxKcal) * 100, 8)}%`;
  const proteinTargetPos = `${(proteinTarget / maxProtein) * 100}%`;
  const kcalTargetPos = `${(kcalTarget / maxKcal) * 100}%`;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface2)] p-4 transition-all hover:bg-[var(--surface2)] group">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-4 text-center">
        {stat.day}
      </div>
      <div className="h-[120px] flex items-end justify-center gap-3">
        <div className="flex h-full w-full max-w-[42px] flex-col justify-end relative group/bar">
          <motion.div
            className="rounded-[12px] bg-[var(--green)] shadow-lg shadow-[var(--green)]/20"
            initial={{ height: 0 }}
            animate={{ height: proteinHeight }}
            transition={{ delay: 0.3, type: 'spring', damping: 15, stiffness: 80 }}
          />
          <div 
            className="absolute left-0 right-0 border-t-2 border-dashed border-black/10 dark:border-white/10 z-10"
            style={{ bottom: proteinTargetPos }}
          />
        </div>
        <div className="flex h-full w-full max-w-[42px] flex-col justify-end relative group/bar">
          <motion.div
            className="rounded-[12px] bg-[var(--amber)] shadow-lg shadow-amber/20"
            initial={{ height: 0 }}
            animate={{ height: kcalHeight }}
            transition={{ delay: 0.4, type: 'spring', damping: 15, stiffness: 80 }}
          />
          <div 
            className="absolute left-0 right-0 border-t-2 border-dashed border-amber/20 z-10"
            style={{ bottom: kcalTargetPos }}
          />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-1 text-center">
        <div>
          <div className="text-[14px] font-black tracking-tight text-[var(--green)]">
            {roundNumber(stat.protein)}
          </div>
          <div className="text-[8px] font-black uppercase tracking-[0.1em] opacity-30 text-[var(--green)]">
            PRO
          </div>
        </div>
        <div>
          <div className="text-[14px] font-black tracking-tight text-[var(--amber)]">
            {roundNumber(stat.kcal)}
          </div>
          <div className="text-[8px] font-black uppercase tracking-[0.1em] opacity-30">
            KCAL
          </div>
        </div>
      </div>
    </div>
  );
}

function Sparkline({ points }: { readonly points: number[] }) {
  const width = 320;
  const height = 100; // Increased height
  const padding = 2; // Tighter padding
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const linePath = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - padding - ((point - min) / range) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const finalPoint = points.at(-1) ?? points[0];
  const finalX = width;
  const finalY =
    height - padding - ((finalPoint - min) / range) * (height - padding * 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible preserve-3d" preserveAspectRatio="none">
      <defs>
        <linearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#weight-area)" />
      <motion.path
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <motion.circle 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1 }}
        cx={finalX} cy={finalY} r="4" 
        className="fill-[var(--accent)] shadow-xl"
      />
    </svg>
  );
}


function getWeightDelta(weightTrend: WeightTrendPoint[]): number | null {
  if (weightTrend.length < 2) {
    return null;
  }

  return (weightTrend.at(-1)?.weight ?? 0) - weightTrend[0].weight;
}

function roundNumber(value: number): string {
  if (value === undefined || value === null) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
