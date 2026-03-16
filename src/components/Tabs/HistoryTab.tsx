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
} from 'lucide-react';
import type { AnalyticsResponse, HistoryRow, NutritionStat, WeightTrendPoint } from '@/lib/types';

interface HistoryTabProps {
  readonly history: HistoryRow[];
  readonly analytics: AnalyticsResponse | null;
}

export default function HistoryTab({ history, analytics }: HistoryTabProps) {
  const nutritionStats = analytics?.nutritionStats ?? [];
  const weightTrend = analytics?.weightTrend ?? [];
  const weightDelta = getWeightDelta(weightTrend);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <AnalyticsMetricCard
          icon={Beef}
          label="7-Day Avg Protein"
          value={`${roundNumber(analytics?.averages.protein ?? 0)}g`}
          subtitle={`${analytics?.meta.logCount ?? 0} nutrition entries`}
          tone="var(--green)"
        />
        <AnalyticsMetricCard
          icon={Flame}
          label="7-Day Avg Calories"
          value={`${roundNumber(analytics?.averages.kcal ?? 0)}`}
          subtitle={`${analytics?.meta.period ?? '7d'} average`}
          tone="var(--amber)"
          suffix="kcal"
        />
        <WeightTrendCard weightTrend={weightTrend} delta={weightDelta} />
      </div>

      <div className="card shadow-xl border-[var(--border)]">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--surface2)] rounded-lg">
              <TrendingUp className="w-5 h-5 text-[var(--text-muted)]" />
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
            {nutritionStats.map((stat) => (
              <NutritionDayCard key={stat.day} stat={stat} nutritionStats={nutritionStats} />
            ))}
          </div>
        ) : (
          <EmptyAnalyticsState
            icon={TrendingUp}
            message="No nutrition data yet. Log meals to populate the 7-day trend."
          />
        )}
      </div>

      <div className="card shadow-xl border-[var(--border)] animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--surface2)] rounded-lg">
              <Calendar className="w-5 h-5 text-[var(--text-muted)]" />
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
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase">
                  Day
                </th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center flex items-center justify-center gap-1.5">
                  <Layout className="w-3 h-3" /> Type
                </th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <Moon className="w-3 h-3" /> Sleep
                  </span>
                </th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <Beef className="w-3 h-3" /> Protein
                  </span>
                </th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <Target className="w-3 h-3" /> Target
                  </span>
                </th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Status
                  </span>
                </th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <Flame className="w-3 h-3" /> Calories
                  </span>
                </th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">
                  <span className="flex items-center justify-center gap-1.5">
                    <Dumbbell className="w-3 h-3" /> Workout
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {history.length > 0 ? (
                history.map((entry) => (
                  <tr key={entry.day} className="hover:bg-[var(--surface2)]/50 transition-colors">
                    <td className="py-4 px-6 text-[13px] font-medium">{entry.day}</td>
                    <td className="py-4 px-6 text-[12px] text-center font-light uppercase tracking-tight">
                      {entry.type}
                    </td>
                    <td className="py-4 px-6 text-[18px] font-extralight tracking-tighter text-center">
                      {entry.sleep === '--' ? '--' : `${entry.sleep}h`}
                    </td>
                    <td className="py-4 px-6 text-[20px] font-extralight tracking-tighter text-center text-[var(--accent)]">
                      {entry.protein}g
                    </td>
                    <td className="py-4 px-6 text-[14px] text-center text-[var(--text-muted)] opacity-60 tracking-tight">
                      {entry.target}g
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            entry.status === 'completed'
                              ? 'bg-[var(--green)] shadow-[0_0_8px_rgba(var(--green),0.4)]'
                              : 'bg-[var(--amber)] opacity-40'
                          }`}
                        />
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[18px] font-extralight tracking-tighter text-center">
                      {entry.kcal}{' '}
                      <span className="text-[10px] text-[var(--text-muted)] opacity-50 uppercase tracking-widest">
                        kcal
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[13px] text-center text-[var(--text-muted)] font-medium opacity-60">
                      {entry.workout}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[var(--text-muted)]">
                    <Calendar className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No history logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
    <div className="card shadow-xl border-[var(--border)]">
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
        <div className="text-[40px] font-extralight tracking-[-0.06em]" style={{ color: tone }}>
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
    <div className="card shadow-xl border-[var(--border)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[var(--surface2)] rounded-lg">
          <Scale className="w-5 h-5 text-[var(--text-muted)]" />
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
            <div className="text-[40px] font-extralight tracking-[-0.06em] text-[var(--text)]">
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
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-4">
        {stat.day}
      </div>
      <div className="h-[132px] flex items-end justify-center gap-3">
        <div className="flex h-full w-full max-w-[42px] flex-col justify-end">
          <div
            className="rounded-t-[14px] bg-[var(--accent)] transition-all duration-500"
            style={{ height: proteinHeight }}
          />
        </div>
        <div className="flex h-full w-full max-w-[42px] flex-col justify-end">
          <div
            className="rounded-t-[14px] bg-[var(--amber)] transition-all duration-500"
            style={{ height: kcalHeight }}
          />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-[18px] font-light tracking-[-0.04em] text-[var(--text)]">
            {roundNumber(stat.protein)}
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            protein
          </div>
        </div>
        <div>
          <div className="text-[18px] font-light tracking-[-0.04em] text-[var(--text)]">
            {roundNumber(stat.kcal)}
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            kcal
          </div>
        </div>
      </div>
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const width = 320;
  const height = 88;
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
      <Icon className="w-8 h-8 mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
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
