"use client";

import React, { useSyncExternalStore, useState, useEffect } from "react";
import {
  Beef,
  Flame,
  Scale,
  Moon,
  Target,
  Wheat,
  Droplets,
  Salad,
  Zap,
  Clock,
  Plus,
  CheckCircle,
  UtensilsCrossed,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { getSmartSuggestion } from "@/lib/meal-suggestions";
import { motion, AnimatePresence } from "framer-motion";
import type { AIInsight, DayType, TabId, AnalyticsResponse, LogsResponse, NutritionStat, FoodLog, WorkoutLogWithRelations, ActiveWorkoutSession } from "@/lib/types";
import { GlassPane } from "./Shared/GlassPane";
import { GlassMetric } from "./Shared/GlassMetric";
import { GlassPopover } from "./Shared/GlassPopover";
import { AIInsightCard } from "./Dashboard/AIInsightCard";

export interface SidebarProps {
  readonly protein: number;
  readonly proteinTarget: number;
  readonly calories: number;
  readonly calorieTarget: number;
  readonly carbs: number;
  readonly carbsTarget: number;
  readonly fats: number;
  readonly fatsTarget: number;
  readonly fiber: number;
  readonly weight: number | string;
  readonly sleep: number | string;
  readonly sleepTarget: number;
  readonly water: number;
  readonly waterTarget: number;
  readonly dayType: DayType;
  readonly setDayType: (type: DayType) => void;
  readonly hasWorkout: boolean;
  readonly analytics: AnalyticsResponse | null;
  readonly logs: LogsResponse;
  readonly activeWorkout?: import("@/lib/types").ActiveWorkoutSession | null;
  readonly aiInsights?: AIInsight[];
  readonly onTabChange?: (tab: TabId) => void;
}

function MacroBar({
  p,
  c,
  f,
}: Readonly<{ p: number; c: number; f: number }>) {
  const pCal = p * 4;
  const cCal = c * 4;
  const fCal = f * 9;
  const total = pCal + cCal + fCal || 1;

  const pPct = (pCal / total) * 100;
  const cPct = (cCal / total) * 100;
  const fPct = (fCal / total) * 100;

  return (
    <div className="flex flex-col gap-2 py-2 bg-[var(--surface2)] rounded-2xl px-4 border border-[var(--border)] h-full">
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
        <span className="opacity-40 tracking-tighter">Balance</span>
        <span>{Math.round(total)} Kcal</span>
      </div>
      <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-[var(--surface2)]">
        <div style={{ width: `${pPct}%` }} className="h-full bg-[var(--green)]" />
        <div style={{ width: `${cPct}%` }} className="h-full bg-[var(--amber)]" />
        <div style={{ width: `${fPct}%` }} className="h-full bg-[#d4a23a] opacity-50" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
            <span className="text-[9px] font-black opacity-30">P {Math.round(pPct)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--amber)]" />
            <span className="text-[9px] font-black opacity-30">C {Math.round(cPct)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#d4a23a] opacity-50" />
            <span className="text-[9px] font-black opacity-30">F {Math.round(fPct)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}


function WeeklyConsistency({ stats }: Readonly<{ stats: NutritionStat[] }>) {
  const last7 = (stats || []).slice(-7);
  const max = Math.max(...last7.map((s) => s.protein || 0), 100);

  return (
    <div className="flex flex-col gap-1.5 py-2.5 bg-[var(--surface2)] rounded-2xl px-4 border border-[var(--border)] h-full">
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
        <span className="opacity-40 tracking-tighter">7-Day Consistency</span>
        <span className="text-[var(--green)]">Protein</span>
      </div>
      <div className="flex items-end justify-between h-10 gap-1.5 px-1">
        {Array.from({ length: 7 }).map((_, i) => {
          const dayData = last7[i];
          const height = dayData ? (dayData.protein / max) * 100 : 5;
          return (
            <div
              key={dayData?.day || `bar-${i}`}
              className="flex-1 bg-[var(--surface2)] rounded-t-sm relative group"
              style={{ height: "100%" }}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                className="absolute bottom-0 left-0 right-0 bg-[var(--green)] opacity-60 rounded-t-sm group-hover:opacity-100 transition-opacity"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentActivity({ logs }: Readonly<{ logs: LogsResponse }>) {
  const activities: Array<{
    id: string;
    type: string;
    label: string;
    time: Date;
    icon: LucideIcon;
  }> = [];
  
  if (logs?.food) {
    logs.food?.slice(-2).forEach((f: FoodLog) => activities.push({ 
      id: f.id, 
      type: "food", 
      label: f.name, 
      time: new Date(f.time),
      icon: Beef 
    }));
  }
  if (logs?.workouts) {
    logs.workouts?.slice(-1).forEach((w: WorkoutLogWithRelations) => activities.push({ 
      id: w.id, 
      type: "workout", 
      label: w.focus, 
      time: new Date(w.time),
      icon: Flame 
    }));
  }
  if (logs?.water && logs.water.length > 0) {
     activities.push({ 
       id: "water-latest", 
       type: "water", 
       label: "Hydration logged", 
        time: new Date(), 
        icon: Droplets 
      });
   }

  const sorted = activities.toSorted((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 3);

  if (sorted.length === 0) {
    return <div className="h-40 flex items-center justify-center opacity-40 italic text-xs">No activity yet</div>;
  }

  return (
    <div className="flex flex-col gap-2 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase opacity-30 tracking-widest">
          Recent Activity
        </span>
        <div className="h-[1px] flex-1 bg-[var(--border)]" />
      </div>
      <div className="flex flex-col gap-2">
        {sorted.map((act) => (
          <div key={act.id} className="flex items-center gap-2.5 px-1">
            <div className="w-6 h-6 rounded-lg bg-[var(--surface2)] flex items-center justify-center">
              <act.icon className="w-3 h-3 opacity-40" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black truncate">{act.label}</span>
              <span className="text-[7px] opacity-30 font-bold uppercase">
                {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProactiveCoach({
  protein,
  proteinTarget,
  calories,
  calorieTarget,
  hasWorkout,
  dayType,
}: Readonly<{
  protein: number;
  proteinTarget: number;
  calories: number;
  calorieTarget: number;
  hasWorkout: boolean;
  dayType: DayType;
}>) {
  const [logged, setLogged] = useState(false);
  const suggestion = getSmartSuggestion(protein, proteinTarget, calories, calorieTarget);
  
  if (logged) {
    return (
      <div className="glass-premium p-2.5 rounded-2xl border border-[var(--green)]/10 mb-3 animate-dashboard-in flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-[var(--green)]" />
        <span className="text-[10px] font-bold text-[var(--green)]/60 uppercase">Suggestion Logged</span>
      </div>
    );
  }

  let tip = "You're doing great! Keep up the consistency.";
  let icon = Target;

  if (protein < 50) {
    tip = "Protein is low. A quick Greek yogurt or shake would help you hit your target.";
    icon = Beef;
  } else if (!hasWorkout && dayType === "Training") {
    tip = "Training day! Don't forget to log your session when you're done.";
    icon = Flame;
  } else if (calories > 2500) {
    tip = "Calories are climbing. Focus on high-volume, low-kcal veggies for your next meal.";
    icon = Salad;
  }

  return (
    <div className="flex flex-col gap-2.5 mb-3 animate-dashboard-in stagger-4 flex-shrink-0">
      <div className="glass-premium rounded-2xl p-3.5 flex flex-col gap-2.5 relative overflow-hidden group/insight">
        {/* Decorative Glow */}
        <div 
          className="absolute -top-4 -right-4 w-16 h-16 blur-2xl opacity-20 transition-opacity group-hover/insight:opacity-40 bg-[var(--accent)] pointer-events-none"
        />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
              {React.createElement(icon, { className: "w-4 h-4 text-[var(--accent)]" })}
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text)] opacity-40">
              Coach Tip
            </span>
          </div>
        </div>

        <div className="space-y-1 relative z-10 text-[var(--text)]">
          <p className="text-[12px] leading-relaxed opacity-80 font-medium">
            {tip}
          </p>
        </div>
      </div>

      {suggestion && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-premium p-2.5 rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent)]/[0.03] to-transparent relative overflow-hidden"
        >
          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                  <suggestion.icon className="w-3 h-3 text-[var(--accent)]" />
                </div>
                <span className="text-[9px] font-black uppercase text-[var(--accent)] tracking-tighter">
                  {suggestion.benefit}
                </span>
              </div>
              <button 
                onClick={() => setLogged(true)}
                className="flex items-center gap-1 py-1 px-2.5 bg-[var(--accent)] text-white rounded-lg shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-2.5 h-2.5 stroke-[4]" />
                <span className="text-[9px] font-black uppercase">Log</span>
              </button>
            </div>
            
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-black">{suggestion.name}</span>
              <div className="flex items-center gap-2 text-[9px] font-bold opacity-30">
                <span>{suggestion.protein}g Protein</span>
                <span className="w-1 h-1 rounded-full bg-current" />
                <span>{suggestion.calories} kcal</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function WaterRing({ percentage }: Readonly<{ percentage: number }>) {
  const radius = 7;
  const circum = 2 * Math.PI * radius;
  const offset = circum - (percentage / 100) * circum;

  return (
    <div className="relative w-4 h-4 mr-1">
      <svg className="w-full h-full -rotate-90">
        <circle cx="8" cy="8" r={radius} fill="none" stroke="currentColor" strokeWidth="2" className="opacity-10" />
        <circle 
          cx="8" cy="8" r={radius} fill="none" stroke="currentColor" strokeWidth="2" 
          strokeDasharray={circum} strokeDashoffset={offset} strokeLinecap="round"
          className="text-[var(--accent)]"
        />
      </svg>
    </div>
  );
}

function WorkoutLiveAssistant({ session }: Readonly<{ session: ActiveWorkoutSession }>) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - session.startTime) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [session.startTime]);

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = session.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.isCompleted).length, 0);
  const currentEx = session.exercises.find(ex => ex.sets.some(s => !s.isCompleted)) || session.exercises.at(-1);

  return (
    <div className="glass-premium p-3.5 rounded-2xl border border-[var(--accent)]/30 mb-4 animate-dashboard-in stagger-2 relative overflow-hidden group workout-pulse-active">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
        <Flame className="w-12 h-12 text-[var(--accent)] rotate-12" />
      </div>
      
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-[var(--accent)]">Live Session</span>
        </div>
        <div className="text-sm font-black tabular-nums flex items-center gap-1.5 py-1 px-2.5 bg-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/10">
          <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
          {format(elapsed)}
        </div>
      </div>

      <div className="flex flex-col gap-1 mb-4 relative z-10">
        <h4 className="text-xs font-black truncate">{session.name || "Active Workout"}</h4>
        <p className="text-[10px] font-bold opacity-40 truncate">
          Next: {currentEx?.name || "Finishing up..."}
        </p>
      </div>

      <div className="flex flex-col gap-2 relative z-10">
        <div className="flex items-center justify-between text-[9px] font-black uppercase opacity-40">
          <span>Progress</span>
          <span>{completedSets} / {totalSets} Sets</span>
        </div>
        <div className="h-1.5 w-full bg-[var(--surface2)] rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(completedSets / totalSets) * 100}%` }}
            className="h-full bg-[var(--red)]"
          />
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({
  protein,
  proteinTarget,
  calories,
  calorieTarget,
  carbs,
  carbsTarget,
  fats,
  fatsTarget,
  fiber,
  weight,
  sleep,
  sleepTarget,
  water,
  waterTarget,
  dayType,
  setDayType,
  hasWorkout,
  analytics,
  logs,
  activeWorkout,
  aiInsights,
  onTabChange,
}: Readonly<SidebarProps>) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  useEffect(() => {
    // Standard hydration pattern
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const currentDateLabel = useSyncExternalStore(
    subscribeToDateLabel,
    getCurrentDateLabel,
    getServerDateLabel,
  );

  // Stable display for hydration pass
  const stableDateLabel = isMounted ? currentDateLabel : getServerDateLabel();
  const proteinPct = Math.min((protein / proteinTarget) * 100, 100);
  const caloriePct = Math.min((calories / calorieTarget) * 100, 100);

  // TREND CALCULATION
  const weightTrend = analytics?.weightTrend || [];
  const weightDelta = weightTrend.length >= 2 
    ? Number(weight) - (weightTrend.at(-2)?.weight || 0)
    : 0;

  const sleepLogs = logs?.sleep || [];
  const sleepLogsLatest = sleepLogs.at(-2);
  const sleepDelta = sleepLogs.length >= 2
    ? Number(sleep) - Number(sleepLogsLatest?.hours || 0)
    : 0;

  const dayTypes: Array<{ id: DayType; label: string; icon: LucideIcon }> = [
    { id: "Rest", label: "Rest", icon: Moon },
    { id: "Training", label: "Train", icon: Flame },
    { id: "Lite", label: "Lite", icon: Salad },
  ];

  let proteinStatus = "";
  if (proteinPct >= 100) {
    proteinStatus = "hit";
  } else if (proteinPct >= 70) {
    proteinStatus = "near";
  }

  let calorieStatus = "";
  if (caloriePct >= 100) {
    calorieStatus = "hit";
  } else if (caloriePct >= 80) {
    calorieStatus = "near";
  }

  const isWaterHit = water >= waterTarget;

  const statsRows: Array<{
    icon: LucideIcon;
    label: string;
    value: string | number;
    delta?: number;
    unit: string;
    color: string;
    hit: boolean;
  }> = [
    {
      icon: Scale,
      label: "Weight",
      value: weight === "--" ? 0 : weight,
      delta: weightDelta,
      unit: "kg",
      color: "#a86b12",
      hit: false,
    },
    {
      icon: Moon,
      label: "Sleep",
      value: sleep === "--" ? 0 : sleep,
      delta: sleepDelta,
      unit: " hrs",
      color: "#6b7ea8",
      hit: Number(sleep) >= sleepTarget,
    },
    {
      icon: Droplets,
      label: "Water",
      value: (water ?? 0).toFixed(1),
      unit: "L",
      color: "#3b82f6",
      hit: isWaterHit,
    },
    {
      icon: Salad,
      label: "Fiber",
      value: (fiber ?? 0).toFixed(1),
      unit: "g",
      color: "#4db382",
      hit: false,
    },
    {
      icon: Wheat,
      label: "Carbs",
      value: (carbs ?? 0).toFixed(1),
      unit: "g",
      color: "#e6ac50",
      hit: carbs >= (carbsTarget || 0),
    },
    {
      icon: Droplets,
      label: "Fats",
      value: (fats ?? 0).toFixed(1),
      unit: "g",
      color: "#d4a23a",
      hit: fats >= (fatsTarget || 0),
    },
  ];

  return (
    <GlassPane noPadding className="sidebar-scroll-container">
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex flex-col flex-1 !p-4 !pb-0 !gap-0 overflow-y-auto no-scrollbar relative">
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-2 flex-none animate-dashboard-in stagger-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-[var(--surface2)] flex items-center justify-center">
              <Target className="w-3 h-3 text-[var(--accent)]" strokeWidth={3} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-30">
              {stableDateLabel}
            </span>
          </div>
          <Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 animate-pulse opacity-40" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-2 flex-none animate-dashboard-in stagger-1">

          <GlassMetric
            icon={Beef}
            label="Protein"
            value={protein}
            target={`${proteinTarget}g`}
            percentage={proteinPct}
            status={proteinStatus as "hit" | "near" | ""}
            nudge={proteinPct < 50}
            iconColor="var(--green)"
            onClick={() => setActiveMetric("Protein")}
          />

          <GlassMetric
            icon={Flame}
            label="Calories"
            value={calories}
            target={calorieTarget}
            percentage={caloriePct}
            status={calorieStatus as "hit" | "near" | ""}
            nudge={caloriePct < 50}
            iconColor="var(--amber)"
            onClick={() => setActiveMetric("Calories")}
            data-testid="metric-calories"
          />
        </div>

        {/* ── METRIC POPOVER ── */}
        <GlassPopover
          isOpen={!!activeMetric}
          onClose={() => setActiveMetric(null)}
          title={activeMetric ? `${activeMetric} Trend` : ""}
        >
          <div className="flex flex-col gap-4 text-[var(--text)]">
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-60">Past 7 Days</span>
              <span className="text-xs font-bold text-[var(--accent)]">
                +12% vs last week
              </span>
            </div>
            <div className="h-32 bg-[rgba(0,0,0,0.02)] rounded-2xl flex items-center justify-center border border-[var(--border)] border-dashed">
              <span className="text-[10px] opacity-40 uppercase tracking-widest">
                Trend Chart Visualization
              </span>
            </div>
            <p className="text-[10px] opacity-60 leading-relaxed italic">
              &quot;You&apos;ve been consistently hitting your targets. Keep
              this momentum for another 3 days for a new streak!&quot;
            </p>
          </div>
        </GlassPopover>

        <div className="grid grid-cols-2 gap-3 animate-dashboard-in stagger-2 mb-0.5">
          <MacroBar p={protein} c={carbs} f={fats} />
          {analytics?.nutritionStats && (
            <WeeklyConsistency stats={analytics.nutritionStats} />
          )}
        </div>

        {/* ── STATS SECTION (LIVE ASSISTANT OR GRID) ── */}
        <div className="border-y border-[var(--border)] py-1.5 my-0.5">
          {activeWorkout ? (
            <WorkoutLiveAssistant session={activeWorkout} />
          ) : (
            <div className="grid grid-cols-3 gap-x-2 gap-y-2">
              {statsRows.map((row) => (
                <button
                  key={row.label}
                  type="button"
                  className={`flex flex-col gap-1 p-2 rounded-[var(--radius-md)] border transition-all hover:bg-[var(--surface2)] ${
                    row.hit
                      ? "bg-[var(--nutri-green)]/10 border-[var(--nutri-green)]/20"
                      : "bg-[var(--surface2)] border-transparent"
                  }`}
                  onClick={() => setActiveMetric(row.label)}
                  suppressHydrationWarning
                >
                  <div className="flex items-center gap-1 min-w-0">
                    {row.label === "Water" ? (
                      <WaterRing percentage={Math.min((water / waterTarget) * 100, 100)} />
                    ) : (
                      <row.icon
                        className="w-2 h-2 flex-shrink-0"
                        style={{ color: row.color }}
                        strokeWidth={3}
                      />
                    )}
                    <span className="text-[7.5px] font-black uppercase opacity-20 tracking-tighter truncate">
                      {row.label}
                    </span>
                    {row.delta !== undefined && row.delta !== 0 && (
                      <span className={`metric-delta ${row.delta > 0 ? 'pos' : 'neg'}`}>
                        {row.delta > 0 ? '+' : ''}{row.delta.toFixed(1)}
                      </span>
                    )}
                    {row.hit && (
                      <Zap className="w-1.5 h-1.5 text-[var(--nutri-green)] fill-[var(--nutri-green)] ml-auto flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-0.5 min-w-0">
                    <span
                      className="text-[10px] font-black truncate"
                      style={{ color: row.color }}
                    >
                      {row.value}
                    </span>
                    {row.unit && (
                      <span className="text-[7px] opacity-30 font-bold truncate">
                        {row.unit}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── GOAL INDICATOR (WORKOUT) ── */}
        {hasWorkout && (
          <div className="flex items-center gap-2 px-3 py-1 bg-[var(--energy-coral)]/10 border border-[var(--energy-coral)]/20 rounded-[var(--radius-md)] my-0.5 mb-1.5">
            <Zap className="w-2.5 h-2.5 text-[var(--energy-coral)] fill-[var(--energy-coral)]" />
            <span className="text-[8.5px] font-black uppercase text-[var(--energy-coral)] opacity-60">
              Workout Logged
            </span>
          </div>
        )}

        {/* ── RECENT ACTIVITY FEED ── */}
        <RecentActivity logs={logs} />

        {/* ── AI STRATEGY ── */}
        <div className="flex flex-col gap-2 py-3 border-t border-[var(--border)] mt-2">
          <div className="flex items-center justify-between">
             <span className="text-[10px] font-black uppercase opacity-30 tracking-widest">AI Strategy</span>
             <Zap className="w-3 h-3 text-[var(--accent)] animate-pulse" />
          </div>
          <button 
            onClick={() => onTabChange?.("meals")}
            className="w-full flex items-center justify-between p-3 bg-gradient-to-br from-[var(--accent)]/10 to-transparent border border-[var(--accent)]/20 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shadow-inner">
                <UtensilsCrossed className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black italic">Weekly Meal Plan</span>
                <span className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">AI Optimized Schedule</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-20" />
          </button>
        </div>

        {/* ── AI COCHING / INSIGHTS ── */}
        <div className="flex flex-col gap-1.5 py-2 border-t border-[var(--border)] mt-0.5">
          {aiInsights && aiInsights.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {aiInsights.map((insight) => (
                <AIInsightCard 
                  key={insight.id} 
                  insight={insight} 
                  onAction={onTabChange}
                />
              ))}
            </AnimatePresence>
          ) : (
            <ProactiveCoach 
              protein={protein} 
              proteinTarget={proteinTarget}
              calories={calories} 
              calorieTarget={calorieTarget}
              hasWorkout={hasWorkout} 
              dayType={dayType} 
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-3 pt-2 flex-none border-t border-black/5 animate-dashboard-in stagger-5 relative z-20">
        <div className="sidebar-daytype-pills relative flex p-1 gap-1 bg-[var(--surface2)] rounded-xl overflow-hidden">
            {dayTypes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setDayType(id)}
                aria-pressed={dayType === id}
                className="sidebar-daytype-btn relative flex-1 py-1.5 rounded-lg transition-all z-10 flex items-center justify-center gap-1.5"
                suppressHydrationWarning
              >
                {dayType === id && (
                  <motion.div
                    layoutId="sidebarActiveTab"
                    className="absolute inset-0 bg-[var(--accent)] shadow-md rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon
                  className="w-3.5 h-3.5 relative z-20"
                  strokeWidth={2}
                  style={{
                    color:
                      id === dayType ? "var(--accent-inv)" : "var(--amber)",
                  }}
                />
                <span
                  className={`text-[9px] font-black relative z-20 ${id === dayType ? "text-[var(--accent-inv)]" : "text-[var(--text)] opacity-60"}`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </GlassPane>
  );
}



function subscribeToDateLabel(): () => void {
  return () => undefined;
}

function getCurrentDateLabel(): string {
  return formatDateLabel(new Date());
}

function getServerDateLabel(): string {
  return "--";
}

function formatDateLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}


