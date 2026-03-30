"use client";

import React, { useSyncExternalStore, useState, useEffect } from "react";
import {
  Beef,
  Flame,
  Scale,
  Moon,
  Calendar,
  Target,
  Wheat,
  Droplets,
  Salad,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import type { DayType } from "@/lib/types";
import { GlassPane } from "./Shared/GlassPane";
import { GlassMetric } from "./Shared/GlassMetric";
import { GlassPopover } from "./Shared/GlassPopover";

interface SidebarProps {
  readonly protein: number;
  readonly proteinTarget: number;
  readonly calories: number;
  readonly calorieTarget: number;
  readonly carbs: number;
  readonly fats: number;
  readonly fiber: number;
  readonly weight: number | string;
  readonly sleep: number | string;
  readonly day: number;
  readonly dayType: DayType;
  readonly setDayType: (type: DayType) => void;
}

export default function Sidebar({
  protein,
  proteinTarget,
  calories,
  calorieTarget,
  carbs,
  fats,
  fiber,
  weight,
  sleep,
  day,
  dayType,
  setDayType,
}: SidebarProps) {
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

  const statsRows: Array<{
    icon: LucideIcon;
    label: string;
    value: string | number;
    unit: string;
    color: string;
  }> = [
    {
      icon: Scale,
      label: "Weight",
      value: weight,
      unit: "kg",
      color: "#a86b12",
    },
    { icon: Moon, label: "Sleep", value: sleep, unit: "hrs", color: "#6b7ea8" },
    {
      icon: Flame,
      label: "Calories",
      value: calories,
      unit: "kcal",
      color: "#e67e22",
    },
    {
      icon: Wheat,
      label: "Carbs",
      value: carbs.toFixed(1),
      unit: "g",
      color: "#e6ac50",
    },
    {
      icon: Droplets,
      label: "Fats",
      value: fats.toFixed(1),
      unit: "g",
      color: "#d4a23a",
    },
    {
      icon: Salad,
      label: "Fiber",
      value: fiber.toFixed(1),
      unit: "g",
      color: "#4db382",
    },
    { icon: Calendar, label: "Day", value: day, unit: "", color: "#7b5ea7" },
    {
      icon: Calendar,
      label: "Date",
      value: stableDateLabel,
      unit: "",
      color: "#7b5ea7",
    },
  ];

  return (
    <GlassPane noPadding className="sidebar-scroll-container">
      <div className="flex flex-col h-full !p-4 !gap-0">
        {/* ── DAILY PROGRESS ── */}
        <div className="flex flex-col gap-4 mb-6 flex-none">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-[rgba(0,0,0,0.04)] flex items-center justify-center">
              <Target
                className="w-3 h-3 text-[var(--accent)]"
                strokeWidth={2.5}
              />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
              Progress Today
            </span>
          </div>

          <GlassMetric
            icon={Beef}
            label="Protein"
            value={protein}
            target={`${proteinTarget}g`}
            percentage={proteinPct}
            status={proteinStatus as unknown}
            nudge={proteinPct < 50}
            iconColor="#8b4513"
            onClick={() => setActiveMetric("Protein")}
          />

          <GlassMetric
            icon={Flame}
            label="Calories"
            value={calories}
            target={calorieTarget}
            percentage={caloriePct}
            status={calorieStatus as unknown}
            nudge={caloriePct < 50}
            iconColor="#e67e22"
            onClick={() => setActiveMetric("Calories")}
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
            {/* Placeholder for real chart/log data */}
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

        {/* ── STATS SECTION ── */}
        <div className="flex-1 flex flex-col justify-center border-y border-[rgba(0,0,0,0.06)] py-2 my-2 min-h-0">
          <div className="overflow-hidden">
            {statsRows.map((row, index) => (
              <button
                key={row.label}
                type="button"
                className={`w-full flex justify-between items-center py-1.5 cursor-pointer hover:bg-[rgba(0,0,0,0.02)] px-1 rounded-md transition-all ${index < statsRows.length - 1 ? "border-b border-[rgba(0,0,0,0.02)]" : ""}`}
                onClick={() => setActiveMetric(row.label)}
                suppressHydrationWarning
              >
                <div className="flex items-center gap-2.5">
                  <row.icon
                    className="w-3.5 h-3.5"
                    style={{ color: row.color }}
                    strokeWidth={2}
                  />
                  <span className="text-[9px] font-bold uppercase opacity-50 tracking-wide text-left">
                    {row.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-[11px] font-black"
                    style={{ color: row.color }}
                  >
                    {row.value}
                  </span>
                  {row.unit && (
                    <span className="text-[9px] opacity-30 font-bold">
                      {row.unit}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── TRAINING MODE ── */}
        <div className="flex flex-col gap-3 mt-4 flex-none">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-[rgba(168,107,18,0.1)] flex items-center justify-center">
              <Zap className="w-3 h-3 text-[var(--amber)]" strokeWidth={2.5} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
              Training Mode
            </span>
          </div>
          <div className="sidebar-daytype-pills relative flex p-1 gap-1 bg-[rgba(0,0,0,0.04)] rounded-xl overflow-hidden">
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
                  className="w-4 h-4 relative z-20"
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

function getProteinRange(dayType: DayType): string {
  if (dayType === "Rest") {
    return "75-85g";
  }

  if (dayType === "Training") {
    return "100-120g";
  }

  return "60-75g";
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
