'use client';

import React from 'react';
import { Ruler, History, Weight, User, Activity, ArrowRight, Save, Calendar } from 'lucide-react';

interface BodyTabProps {
  readonly measurements: any;
  readonly setMeasurements: (m: any) => void;
  readonly handleSaveMeasurements: () => void;
  readonly latestMeasurement: any;
}

export default function BodyTab({ 
  measurements, 
  setMeasurements, 
  handleSaveMeasurements, 
  latestMeasurement 
}: BodyTabProps) {
  const measurementFields = [
    { key: 'weight', label: 'Weight', unit: 'kg', icon: Weight },
    { key: 'waist', label: 'Waist', unit: 'cm', icon: Ruler },
    { key: 'chest', label: 'Chest', unit: 'cm', icon: User },
    { key: 'arms', label: 'Arms', unit: 'cm', icon: Activity },
    { key: 'thighs', label: 'Thighs', unit: 'cm', icon: Activity },
    { key: 'hips', label: 'Hips', unit: 'cm', icon: Activity },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Card */}
        <div className="card shadow-lg border-[var(--border)] transition-all">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[var(--surface2)] rounded-lg">
              <Ruler className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <div className="card-label mb-0">Log Measurements</div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tracking-tight uppercase">Track your physical transformation</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {measurementFields.map(({ key, label, unit, icon: Icon }) => (
              <div key={key} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 text-[var(--text-muted)] opacity-50" />
                  <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--text-muted)] font-bold">{label}</div>
                </div>
                <div className="relative group">
                  <input 
                    className="measure-input w-full pr-8 transition-all focus:ring-1 focus:ring-[var(--accent)]/20" 
                    type="number" 
                    step="0.1" 
                    placeholder="0.0"
                    value={measurements[key]} 
                    onChange={(e) => setMeasurements({ ...measurements, [key]: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] font-bold opacity-50">{unit}</span>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            className="save-btn mt-8 w-full flex items-center justify-center gap-2 group" 
            onClick={handleSaveMeasurements}
          >
            <Save className="w-4 h-4" />
            Save Measurements
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Display Card */}
        <div className="card shadow-lg border-[var(--border)] overflow-hidden relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-[var(--surface2)] rounded-xl">
              <History className="w-5 h-5 text-[var(--text-muted)] opacity-50" />
            </div>
            <div>
              <div className="card-label mb-0">Latest Stats</div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tracking-tight uppercase font-bold">Your body transformation history</p>
            </div>
          </div>

          {latestMeasurement ? (
            <div className="space-y-1">
              {[
                { key: 'weight', label: 'Weight', unit: 'kg', icon: Weight },
                { key: 'waist', label: 'Waist', unit: 'cm', icon: Ruler },
                { key: 'chest', label: 'Chest', unit: 'cm', icon: User },
                { key: 'arms', label: 'Arms', unit: 'cm', icon: Activity },
              ].map(({ key, label, unit, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between py-4 px-2 border-b border-[var(--border)]/30 last:border-0 group hover:bg-[var(--surface2)]/30 transition-all rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[var(--surface2)]/50 flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-inv)] transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] uppercase tracking-widest font-black text-[var(--text-muted)]">{label}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[28px] font-extralight tracking-tighter text-[var(--text)]">{latestMeasurement[key] || '—'}</span>
                    <span className="text-[11px] text-[var(--text-muted)] font-black uppercase tracking-widest">{unit}</span>
                  </div>
                </div>
              ))}
              
              <div className="mt-8 flex items-center gap-2.5 text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.1em] bg-[var(--surface2)]/30 p-4 rounded-xl border border-[var(--border)]/20">
                <Calendar className="w-3.5 h-3.5 opacity-40" />
                Updated: {new Date(latestMeasurement.time).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            </div>
          ) : (
            <div className="empty text-center py-20 px-5 bg-[var(--surface2)]/10 rounded-2xl border border-dashed border-[var(--border)]">
              <Ruler className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <div className="text-[13px] font-bold text-[var(--text-muted)] mb-1">No data recorded</div>
              <p className="text-[11px] text-[var(--text-muted)] opacity-60">Log your first measurements to see trends.</p>
            </div>
          )}
          
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent)] opacity-[0.01] blur-[80px] rounded-full pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
