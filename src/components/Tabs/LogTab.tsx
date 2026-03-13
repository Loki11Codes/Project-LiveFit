'use client';

import React from 'react';
import { Utensils, Dumbbell, Moon, Clock, Flame, Wheat, Droplets, Leaf } from 'lucide-react';

interface LogTabProps {
  readonly foodLog: any[];
  readonly protein: number;
}

export default function LogTab({ foodLog, protein }: LogTabProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Food Log Card */}
        <div className="card md:col-span-2 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-[var(--text-muted)]" />
              <div className="card-label mb-0">Food Log</div>
            </div>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-extralight tracking-tighter text-[var(--text)]">{protein}g</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Protein</span>
            </span>
          </div>
          <div id="food-list" className="space-y-1">
            {foodLog.length > 0 ? (
              foodLog.map((f) => (
                <div key={f.id} className="log-row">
                  <div className="flex-1">
                    <div className="log-row-name flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] opacity-40" />
                      {f.name}
                    </div>
                    <div className="log-row-meta flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(f.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {f.kcal ?? '?'} kcal</span>
                      <span className="flex items-center gap-1 text-[var(--amber)]"><Wheat className="w-3 h-3" /> {f.carbs ?? '?'}g</span>
                      <span className="flex items-center gap-1 text-[var(--red)]"><Droplets className="w-3 h-3" /> {f.fats ?? '?'}g</span>
                      <span className="flex items-center gap-1 text-[var(--green)]"><Leaf className="w-3 h-3" /> {f.fiber ?? '?'}g</span>
                    </div>
                  </div>
                  <div className="log-row-val whitespace-nowrap text-[22px] font-extralight tracking-tighter text-[var(--text)]">
                    {f.protein}g
                  </div>
                </div>
              ))
            ) : (
              <div className="empty text-center py-12 px-5 text-[var(--text-muted)] text-[12px] tracking-[0.04em] border border-dashed border-[var(--border)] rounded-lg">
                <Utensils className="w-8 h-8 mx-auto mb-3 opacity-20" />
                No food logged yet — use the Chat tab.
              </div>
            )}
          </div>
        </div>

        {/* Training Card */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Dumbbell className="w-5 h-5 text-[var(--text-muted)]" />
            <div className="card-label mb-0">Workout</div>
          </div>
          <div className="empty text-center py-12 px-5 text-[var(--text-muted)] text-[12px] border border-dashed border-[var(--border)] rounded-lg">
            <Dumbbell className="w-8 h-8 mx-auto mb-3 opacity-20" />
            Nothing logged yet.
          </div>
        </div>

        {/* Sleep Card */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Moon className="w-5 h-5 text-[var(--text-muted)]" />
            <div className="card-label mb-0">Sleep</div>
          </div>
          <div className="log-row border-none hover:bg-transparent">
            <div>
              <div className="log-row-name flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                Duration
              </div>
              <div className="log-row-meta">Last night</div>
            </div>
            <div className="log-row-val text-[18px]">7.5 <span className="text-[12px]">hrs</span></div>
          </div>
          <div className="mt-4 p-3 bg-[var(--surface2)] rounded-lg text-[11px] text-[var(--text-muted)] leading-relaxed">
            Consistent sleep is key to recovery and hormone balance.
          </div>
        </div>
      </div>
    </div>
  );
}
