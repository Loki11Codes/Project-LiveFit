'use client';

import React from 'react';
import { 
  Beef, 
  Flame, 
  Scale, 
  Moon, 
  Calendar, 
  Layout, 
  Info,
  Target
} from 'lucide-react';

type DayType = 'Rest' | 'Training' | 'Lite';

interface SidebarProps {
  readonly protein: number;
  readonly proteinTarget: number;
  readonly calories: number;
  readonly calorieTarget: number;
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
  weight,
  sleep,
  day,
  dayType,
  setDayType,
}: SidebarProps) {
  const proteinPct = Math.min((protein / proteinTarget) * 100, 100);
  const caloriePct = Math.min((calories / calorieTarget) * 100, 100);

  const getProteinFillClass = () => {
    if (proteinPct >= 100) return 'progress-fill hit';
    if (proteinPct >= 70) return 'progress-fill near';
    return 'progress-fill';
  };

  const getCalorieFillClass = () => {
    if (caloriePct >= 100) return 'progress-fill hit';
    if (caloriePct >= 80) return 'progress-fill near';
    return 'progress-fill';
  };

  const dayTypes: {id: DayType, label: string, icon: any}[] = [
    { id: 'Rest', label: 'Rest', icon: Moon },
    { id: 'Training', label: 'Train', icon: Flame },
    { id: 'Lite', label: 'Lite', icon: Info }
  ];

  return (
    <div className="w-full lg:w-[280px] flex flex-col gap-5">
      <div className="card shadow-lg border-[var(--border)] overflow-hidden relative group">
        <div className="flex items-center gap-2 mb-4">
          <Beef className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <div className="card-label mb-0">Protein Today</div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[52px] font-extralight leading-none tracking-[-0.05em] text-[var(--text)]">
            {protein}
          </span>
          <span className="text-[14px] text-[var(--text-muted)] font-medium">
            g <span className="opacity-40">/</span> {proteinTarget}g
          </span>
        </div>
        <div className="progress-bar mt-6 bg-[var(--surface2)]/50">
          <div
            className={`${getProteinFillClass()} transition-all duration-700 ease-out`}
            style={{ width: `${proteinPct}%` }}
          />
        </div>
        <div className="text-[11px] text-[var(--text-muted)] tracking-wide mt-3 font-medium flex items-center gap-1">
          <Target className="w-3 h-3 opacity-50" />
          {Math.max(0, proteinTarget - protein)}g remaining
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
          <Beef className="w-16 h-16" />
        </div>
      </div>

      <div className="card shadow-lg border-[var(--border)] overflow-hidden relative group">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <div className="card-label mb-0">Calories Today</div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[52px] font-extralight leading-none tracking-[-0.05em] text-[var(--text)]">
            {calories}
          </span>
          <span className="text-[14px] text-[var(--text-muted)] font-medium">
            kcal <span className="opacity-40">/</span> {calorieTarget}
          </span>
        </div>
        <div className="progress-bar mt-6 bg-[var(--surface2)]/50">
          <div
            className={`${getCalorieFillClass()} transition-all duration-700 ease-out`}
            style={{ width: `${caloriePct}%` }}
          />
        </div>
        <div className="text-[11px] text-[var(--text-muted)] tracking-wide mt-3 font-medium flex items-center gap-1">
          <Target className="w-3 h-3 opacity-50" />
          {Math.max(0, calorieTarget - calories)} kcal remaining
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
          <Flame className="w-16 h-16" />
        </div>
      </div>

      <div className="card shadow-md border-[var(--border)] overflow-hidden">
        <div className="space-y-0">
          <StatRow icon={Scale} label="Weight" value={weight} unit="kg" />
          <StatRow icon={Moon} label="Sleep" value={sleep} unit="hrs" />
          <StatRow icon={Calendar} label="Day" value={day} />
          <div className="stat-row border-none py-3.5 px-1">
             <div className="flex items-center gap-2.5">
               <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-40" />
               <span className="stat-name">Current Date</span>
             </div>
             <span className="text-[11px] font-bold tracking-tight text-[var(--text)] opacity-80">
               {new Date().toLocaleDateString('en-US', {
                 weekday: 'short',
                 day: 'numeric',
                 month: 'short'
               })}
             </span>
          </div>
        </div>
      </div>

      <div className="card shadow-md border-[var(--border)] relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4 relative z-10">
          <Layout className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-50" />
          <div className="card-label mb-0">Selection</div>
        </div>
        <div className="flex gap-1 p-1 bg-[var(--surface2)]/50 rounded-2xl relative z-10 border border-[var(--border)]/30">
          {dayTypes.map(({id, label, icon: Icon}) => (
            <button
              key={id}
              onClick={() => setDayType(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-400 cursor-pointer border-none ${
                dayType === id
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${dayType === id ? 'scale-110 opacity-100' : 'opacity-40'}`} />
              <span className="text-[10px] font-bold tracking-widest uppercase">{label}</span>
            </button>
          ))}
        </div>
        <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent)] opacity-[0.02] blur-[40px] rounded-full pointer-events-none" />
      </div>
    </div>
  );
}

interface StatRowProps {
  readonly icon: any;
  readonly label: string;
  readonly value: string | number;
  readonly unit?: string;
}

function StatRow({ icon: Icon, label, value, unit }: StatRowProps) {
  return (
    <div className="stat-row py-3">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <span className="stat-name">{label}</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="stat-val font-medium">{value}</span>
        {unit && <span className="stat-unit text-[10px] uppercase font-bold opacity-60 ml-1">{unit}</span>}
      </div>
    </div>
  );
}
