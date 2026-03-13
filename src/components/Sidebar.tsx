'use client';

import React from 'react';

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

  const isHit = proteinPct >= 100;
  const isNear = proteinPct >= 70;
  const proteinFillClass = `progress-fill ${isHit ? 'hit' : isNear ? 'near' : ''}`;

  const isKcalHit = caloriePct >= 100;
  const isKcalNear = caloriePct >= 80;
  const calorieFillClass = `progress-fill ${isKcalHit ? 'hit' : isKcalNear ? 'near' : ''}`;

  const dayTypes: DayType[] = ['Rest', 'Training', 'Lite'];

  return (
    <div className="w-[264px] flex flex-col gap-4">
      <div className="card">
        <div className="card-label">🫘 Protein Today</div>
        <div>
          <span className="text-[52px] font-extralight leading-none tracking-[-0.03em] text-[var(--text)]">
            {protein}
          </span>
          <span className="text-[13px] text-[var(--text-muted)] font-light ml-1 align-middle">
            g of {proteinTarget}g
          </span>
        </div>
        <div className="progress-bar">
          <div
            className={proteinFillClass}
            style={{ width: `${proteinPct}%` }}
          />
        </div>
        <div className="text-[11px] text-[var(--text-muted)] tracking-[0.04em]">
          🎯 {Math.max(0, proteinTarget - protein)}g remaining
        </div>
      </div>

      <div className="card">
        <div className="card-label">🔥 Calories Today</div>
        <div>
          <span className="text-[52px] font-extralight leading-none tracking-[-0.03em] text-[var(--text)]">
            {calories}
          </span>
          <span className="text-[13px] text-[var(--text-muted)] font-light ml-1 align-middle">
            kcal of {calorieTarget}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className={calorieFillClass}
            style={{ width: `${caloriePct}%` }}
          />
        </div>
        <div className="text-[11px] text-[var(--text-muted)] tracking-[0.04em]">
          🎯 {Math.max(0, calorieTarget - calories)} kcal remaining
        </div>
      </div>

      <div className="card">
        <StatRow label="⚖️ Weight" value={weight} unit="kg" />
        <StatRow label="😴 Sleep" value={sleep} unit="hrs" />
        <StatRow label="🔥 Calories" value={calories} unit="kcal" />
        <StatRow label="📆 Day" value={day} />
        <div className="stat-row">
          <span className="stat-name">🗓️ Date</span>
          <span className="text-[12px] text-[var(--text)]">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-label">🏷️ Day Type</div>
        <div className="flex gap-1.5">
          {dayTypes.map((type) => (
            <button
              key={type}
              onClick={() => setDayType(type)}
              className={`flex-1 p-[8px_4px] border border-[var(--border)] rounded-[5px] bg-transparent text-[11px] font-normal tracking-[0.06em] uppercase cursor-pointer transition-all duration-150 ${
                dayType === type
                  ? 'bg-[var(--accent)] text-[var(--accent-inv)] border-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {type === 'Rest' ? '🛌 Rest' : type === 'Training' ? '💪 Train' : '🌿 Lite'}
            </button>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-[var(--text-muted)] tracking-[0.04em]">
          Target: {proteinTarget}g protein
        </div>
      </div>
    </div>
  );
}

interface StatRowProps {
  readonly label: string;
  readonly value: string | number;
  readonly unit?: string;
}

function StatRow({ label, value, unit }: StatRowProps) {
  return (
    <div className="stat-row">
      <span className="stat-name">{label}</span>
      <span>
        <span className="stat-val">{value}</span>
        {unit && <span className="stat-unit">{unit}</span>}
      </span>
    </div>
  );
}
