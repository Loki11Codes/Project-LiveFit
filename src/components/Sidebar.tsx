'use client';

import React from 'react';
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
} from 'lucide-react';

type DayType = 'Rest' | 'Training' | 'Lite';

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
  const proteinPct = Math.min((protein / proteinTarget) * 100, 100);
  const caloriePct = Math.min((calories / calorieTarget) * 100, 100);

  const dayTypes: { id: DayType; label: string; icon: any }[] = [
    { id: 'Rest', label: 'Rest', icon: Moon },
    { id: 'Training', label: 'Train', icon: Flame },
    { id: 'Lite', label: 'Lite', icon: Salad },
  ];

  const getProteinRange = () => {
    if (dayType === 'Rest') return '75–85g';
    if (dayType === 'Training') return '100–120g';
    return '60–75g';
  };

  const statsRows: { icon: any; label: string; value: string | number; unit: string; color: string }[] = [
    { icon: Scale, label: 'Weight', value: weight, unit: 'kg', color: '#a86b12' },
    { icon: Moon, label: 'Sleep', value: sleep, unit: 'hrs', color: '#6b7ea8' },
    { icon: Flame, label: 'Calories', value: calories, unit: 'kcal', color: '#c0392b' },
    { icon: Wheat, label: 'Carbs', value: carbs.toFixed(1), unit: 'g', color: '#e6ac50' },
    { icon: Droplets, label: 'Fats', value: fats.toFixed(1), unit: 'g', color: '#d4a23a' },
    { icon: Salad, label: 'Fiber', value: fiber.toFixed(1), unit: 'g', color: '#4db382' },
    { icon: Calendar, label: 'Day', value: day, unit: '', color: '#7b5ea7' },
    {
      icon: Calendar,
      label: 'Date',
      value: new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      unit: '',
      color: '#7b5ea7',
    },
  ];

  return (
    <div className="sidebar-scroll-container">
      {/* Protein Today */}
      <div className="sidebar-card">
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
        <div className="progress-bar mt-4">
          <div
            className={`progress-fill transition-all duration-700 ease-out ${proteinPct >= 100 ? 'hit' : proteinPct >= 70 ? 'near' : ''}`}
            style={{ width: `${proteinPct}%` }}
          />
        </div>
        <div className="sidebar-remaining">
          <Target className="w-3 h-3 opacity-50" />
          {Math.max(0, proteinTarget - protein)}g remaining
        </div>
      </div>

      {/* Calories Today */}
      <div className="sidebar-card">
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
        <div className="progress-bar mt-4">
          <div
            className={`progress-fill transition-all duration-700 ease-out ${caloriePct >= 100 ? 'hit' : caloriePct >= 80 ? 'near' : ''}`}
            style={{ width: `${caloriePct}%` }}
          />
        </div>
        <div className="sidebar-remaining">
          <Target className="w-3 h-3 opacity-50" />
          {Math.max(0, calorieTarget - calories)} kcal remaining
        </div>
      </div>

      {/* Nutrition & Measurements Chart */}
      <div className="sidebar-card">
        {statsRows.map((row, i) => {
          const Icon = row.icon;
          return (
            <div
              key={row.label}
              className={`sidebar-stat-row ${i === statsRows.length - 1 ? 'border-none' : ''}`}
            >
              <div className="sidebar-stat-left">
                <Icon className="sidebar-stat-icon" style={{ color: row.color }} />
                <span className="sidebar-stat-label">{row.label}</span>
              </div>
              <div className="sidebar-stat-right">
                <span className="sidebar-stat-value" style={{ color: row.color }}>
                  {row.value}
                </span>
                {row.unit && (
                  <span className="sidebar-stat-unit">{row.unit}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Type Selection */}
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
              className={`sidebar-daytype-btn ${dayType === id ? 'sidebar-daytype-active' : 'sidebar-daytype-inactive'}`}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: dayType === id ? 'var(--accent-inv)' : '#a86b12' }} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-remaining">
          <Target className="w-3 h-3 opacity-50" style={{ color: '#4db382' }} />
          Target: {getProteinRange()} protein
        </div>
      </div>
    </div>
  );
}
