'use client';

import React, { useSyncExternalStore, useState, useEffect } from 'react';
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
  CheckCircle2,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { DayType } from '@/lib/types';

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
  useEffect(() => {
    // Standard hydration pattern, moved to next tick to avoid synchronous effect warning
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const currentDateLabel = useSyncExternalStore(
    subscribeToDateLabel,
    getCurrentDateLabel,
    getServerDateLabel
  );

  // Stable display for hydration pass
  const stableDateLabel = isMounted ? currentDateLabel : getServerDateLabel();
  const proteinPct = Math.min((protein / proteinTarget) * 100, 100);
  const caloriePct = Math.min((calories / calorieTarget) * 100, 100);

  const dayTypes: Array<{ id: DayType; label: string; icon: LucideIcon }> = [
    { id: 'Rest', label: 'Rest', icon: Moon },
    { id: 'Training', label: 'Train', icon: Flame },
    { id: 'Lite', label: 'Lite', icon: Salad },
  ];

  let proteinStatus = '';
  if (proteinPct >= 100) {
    proteinStatus = 'hit';
  } else if (proteinPct >= 70) {
    proteinStatus = 'near';
  }

  let calorieStatus = '';
  if (caloriePct >= 100) {
    calorieStatus = 'hit';
  } else if (caloriePct >= 80) {
    calorieStatus = 'near';
  }

  const statsRows: Array<{
    icon: LucideIcon;
    label: string;
    value: string | number;
    unit: string;
    color: string;
  }> = [
    { icon: Scale, label: 'Weight', value: weight, unit: 'kg', color: '#a86b12' },
    { icon: Moon, label: 'Sleep', value: sleep, unit: 'hrs', color: '#6b7ea8' },
    { icon: Flame, label: 'Calories', value: calories, unit: 'kcal', color: '#e67e22' },
    { icon: Wheat, label: 'Carbs', value: carbs.toFixed(1), unit: 'g', color: '#e6ac50' },
    { icon: Droplets, label: 'Fats', value: fats.toFixed(1), unit: 'g', color: '#d4a23a' },
    { icon: Salad, label: 'Fiber', value: fiber.toFixed(1), unit: 'g', color: '#4db382' },
    { icon: Calendar, label: 'Day', value: day, unit: '', color: '#7b5ea7' },
    {
      icon: Calendar,
      label: 'Date',
      value: stableDateLabel,
      unit: '',
      color: '#7b5ea7',
    },
  ];

  return (
    <div className="sidebar-scroll-container">
      <div className={`sidebar-card ${protein >= proteinTarget ? 'protein-hit' : ''}`}>
        <div className="sidebar-card-header">
          <Beef className="sidebar-card-icon" style={{ color: '#8b4513' }} />
          <span className="sidebar-card-title">Protein Today</span>
        </div>
        <div className="sidebar-big-value">
          <span className="sidebar-big-number">{protein}</span>
          <span className="sidebar-big-unit">
            g of {proteinTarget}g
          </span>
        </div>
        <div className="progress-bar mt-4 rounded-[inherit] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${proteinPct}%` }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className={`progress-fill h-full rounded-[inherit] ${proteinStatus}`}
          />
        </div>
        {protein >= proteinTarget ? (
          <div className="sidebar-remaining text-[#4db382]">
            <CheckCircle2 className="w-3 h-3" />
            Goal reached! Excellent work.
          </div>
        ) : (
          <div className="sidebar-remaining">
            <Target className="w-3 h-3" style={{ color: '#4db382' }} />
            {Math.max(0, proteinTarget - protein)}g remaining
          </div>
        )}
      </div>

      <div className={`sidebar-card ${calories > calorieTarget ? 'calorie-danger' : ''}`}>
        <div className="sidebar-card-header">
          <Flame className="sidebar-card-icon" style={{ color: '#e67e22' }} />
          <span className="sidebar-card-title">Calories Today</span>
        </div>
        <div className="sidebar-big-value">
          <span className="sidebar-big-number">{calories}</span>
          <span className="sidebar-big-unit">
            kcal of {calorieTarget}
          </span>
        </div>
        <div className="progress-bar mt-4 rounded-[inherit] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${caloriePct}%` }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className={`progress-fill h-full rounded-[inherit] ${calorieStatus}`}
          />
        </div>
        {calories > calorieTarget ? (
          <div className="sidebar-remaining text-[#c0392b] font-bold">
            <AlertTriangle className="w-3 h-3 animate-pulse" />
            Warning: Calories overshot
          </div>
        ) : (
          <div className="sidebar-remaining text-[#4db382]">
            <CheckCircle2 className="w-3 h-3" />
            Great! Within calorie limit
          </div>
        )}
        <div className="sidebar-remaining !mt-1">
          <Target className="w-3 h-3" style={{ color: '#4db382' }} />
          {Math.max(0, calorieTarget - calories)} kcal remaining
        </div>
      </div>

      <div className="sidebar-card">
        {statsRows.map((row, index) => {
          const Icon = row.icon;
          return (
            <div
              key={row.label}
              className={`sidebar-stat-row ${
                index === statsRows.length - 1 ? 'border-none' : ''
              }`}
            >
              <div className="sidebar-stat-left">
                <Icon className="sidebar-stat-icon" style={{ color: row.color }} />
                <span className="sidebar-stat-label">{row.label}</span>
              </div>
              <div className="sidebar-stat-right">
                <span className="sidebar-stat-value" style={{ color: row.color }}>
                  {row.value}
                </span>
                {row.unit && <span className="sidebar-stat-unit">{row.unit}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sidebar-card">
        <div className="sidebar-card-header">
          <Zap className="sidebar-card-icon" style={{ color: '#e6ac50' }} />
          <span className="sidebar-card-title">Day Type</span>
        </div>
        <div className="sidebar-daytype-pills">
          {dayTypes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setDayType(id)}
              className={`sidebar-daytype-btn ${
                dayType === id
                  ? 'sidebar-daytype-active'
                  : 'sidebar-daytype-inactive'
              }`}
              suppressHydrationWarning
            >
              <Icon
                className="w-3.5 h-3.5"
                style={{
                  color: dayType === id ? 'var(--accent-inv)' : '#a86b12',
                }}
              />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-remaining">
          <Target className="w-3 h-3" style={{ color: '#4db382' }} />
          Target: {getProteinRange(dayType)} protein
        </div>
      </div>
    </div>
  );
}

function getProteinRange(dayType: DayType): string {
  if (dayType === 'Rest') {
    return '75-85g';
  }

  if (dayType === 'Training') {
    return '100-120g';
  }

  return '60-75g';
}

function subscribeToDateLabel(): () => void {
  return () => undefined;
}

function getCurrentDateLabel(): string {
  return formatDateLabel(new Date());
}

function getServerDateLabel(): string {
  return '--';
}

function formatDateLabel(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}
