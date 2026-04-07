'use client';

import React, { useEffect, useState } from 'react';
import type { BodyMeasurement } from '@prisma/client';
import {
  Ruler,
  History,
  Weight,
  User,
  Activity,
  ArrowRight,
  Save,
  Calendar,
  type LucideIcon,
  TableProperties,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cardVariants, rowVariants } from '@/lib/animations';
import EmptyState from '@/components/Shared/EmptyState';
import type { MeasurementForm, MeasurementFormField } from '@/lib/types';

interface BodyTabProps {
  readonly measurements: MeasurementForm;
  readonly setMeasurements: React.Dispatch<React.SetStateAction<MeasurementForm>>;
  readonly handleSaveMeasurements: () => void;
  readonly latestMeasurement: BodyMeasurement | null;
}

const measurementFields: Array<{
  key: MeasurementFormField;
  label: string;
  unit: string;
  icon: LucideIcon;
  color: string;
}> = [
  { key: 'weight', label: 'Weight', unit: 'kg', icon: Weight, color: '#a86b12' },
  { key: 'waist', label: 'Waist', unit: 'cm', icon: Ruler, color: '#e6ac50' },
  { key: 'chest', label: 'Chest', unit: 'cm', icon: User, color: '#7b5ea7' },
  { key: 'arms', label: 'Arms', unit: 'cm', icon: Activity, color: '#e67e22' },
  { key: 'thighs', label: 'Thighs', unit: 'cm', icon: Activity, color: '#e67e22' },
  { key: 'hips', label: 'Hips', unit: 'cm', icon: Activity, color: '#e67e22' },
  { key: 'calves', label: 'Calves', unit: 'cm', icon: Activity, color: '#e67e22' },
  { key: 'neck', label: 'Neck', unit: 'cm', icon: Activity, color: '#e67e22' },
  { key: 'bodyFat', label: 'Body Fat', unit: '%', icon: Activity, color: '#e67e22' },
];


export default function BodyTab({
  measurements,
  setMeasurements,
  handleSaveMeasurements,
  latestMeasurement,
}: BodyTabProps) {
  const [measurementHistory, setMeasurementHistory] = useState<BodyMeasurement[]>([]);

  useEffect(() => {
    fetch('/api/measurements?all=true')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMeasurementHistory(data);
        }
      })
      .catch(() => {});
  }, [latestMeasurement]);

  const getTrend = (key: string, currentVal: number | null) => {
    if (currentVal === null || measurementHistory.length < 2) return null;
    const prevVal = measurementHistory.at(1)?.[key as keyof BodyMeasurement] as number | null;
    if (prevVal === null || prevVal === undefined) return null;
    const diff = currentVal - prevVal;
    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    if (diff > 0) direction = 'up';
    else if (diff < 0) direction = 'down';

    return {
      diff: Number(diff.toFixed(1)),
      direction
    };
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Log Measurements Card */}
        <motion.div
          className="glass-premium hover-glow p-6 rounded-[32px] overflow-hidden"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-[var(--accent)]/10 rounded-xl">
              <Ruler className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Entry Mode</div>
              <h2 className="text-sm font-black tracking-tight uppercase">Log Measurements</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {measurementFields.map(({ key, label, unit, icon: Icon, color }, index) => (
              <motion.div
                key={key}
                className="flex flex-col gap-2"
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                custom={index}
              >
                <div className="flex items-center gap-1.5 opacity-60 ml-0.5">
                  <Icon className="w-3 h-3" style={{ color }} />
                  <div className="text-[10px] tracking-[0.15em] uppercase font-black">
                    {label}
                  </div>
                </div>
                <div className="relative group">
                  <input
                    className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-[14px] px-4 py-3 text-sm font-black outline-none focus:border-[var(--accent)]/30 focus:bg-white/50 dark:focus:bg-black/50 transition-all placeholder:opacity-20"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    data-testid={`input-${key}`}
                    value={measurements[key]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMeasurements((current) => ({
                        ...current,
                        [key]: val,
                      }));
                    }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] font-black uppercase opacity-30">
                    {unit}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.button
            className="mt-8 w-full p-4 bg-[var(--accent)] text-white rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            onClick={handleSaveMeasurements}
          >
            <Save className="w-4 h-4" />
            Save Measurements
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>

        {/* Latest Stats Card */}
        <motion.div
          className="glass-premium p-6 rounded-[32px] overflow-hidden relative"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl">
              <History className="w-5 h-5 text-[#c0392b]" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Your Progress</div>
              <h2 className="text-sm font-black tracking-tight uppercase">Latest Stats</h2>
            </div>
          </div>

          {latestMeasurement ? (
            <div className="space-y-1">
              {measurementFields.map(({ key, label, unit, icon: Icon, color }, index) => {
                const val = latestMeasurement[key as keyof BodyMeasurement] as number | null;
                if (val === null || val === undefined) return null;
                const trend = getTrend(key, val);
                
                const trendColors: Record<'up' | 'down' | 'neutral', string> = {
                  up: 'text-[var(--trend-up)] bg-[var(--trend-up)]/10',
                  down: 'text-[var(--trend-down)] bg-[var(--trend-down)]/10',
                  neutral: 'text-[var(--trend-neutral)] bg-[var(--trend-neutral)]/10'
                };
                
                return (
                  <motion.div
                    key={key}
                    className="flex items-center justify-between py-3.5 px-4 glass-premium rounded-2xl mb-1.5 transition-all group hover:bg-white/5 active:scale-[0.99]"
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center">
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase text-[var(--text-muted)] tracking-widest opacity-60">
                          {label}
                        </span>
                        {trend && (
                          <div className={`trend-badge mt-0.5 ${trendColors[trend.direction]}`}>
                            {trend.direction === 'up' && <TrendingUp className="w-2.5 h-2.5" />}
                            {trend.direction === 'down' && <TrendingDown className="w-2.5 h-2.5" />}
                            {trend.direction === 'neutral' && <Minus className="w-2.5 h-2.5" />}
                            {trend.diff > 0 ? `+${trend.diff}` : trend.diff} {unit}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black tracking-tight text-[var(--accent)]">
                        {val}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest opacity-40">
                        {unit}
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              <motion.div
                className="mt-6 flex items-center gap-2.5 text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.1em] bg-[var(--surface2)]/30 p-3 rounded-xl border border-[var(--border)]/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Calendar className="w-3.5 h-3.5 opacity-80" style={{ color: '#7b5ea7' }} />
                Updated:{' '}
                {new Date(latestMeasurement.time).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </motion.div>
            </div>
          ) : (
            <EmptyState
              icon={Ruler}
              message="No data recorded"
              description="Log your first measurements via the Chat or directly here to see trends."
              iconColor="#e6ac50"
            />
          )}

          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent)] opacity-[0.01] blur-[80px] rounded-full pointer-events-none" />
        </motion.div>
      </div>

      {/* Measurement History Table */}
      {measurementHistory.length > 0 && (
        <motion.div
          className="glass-premium p-6 rounded-[32px] overflow-hidden"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-[var(--accent)]/10 rounded-xl">
              <TableProperties className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Historical Data</div>
              <h2 className="text-sm font-black tracking-tight uppercase">Measurement History</h2>
            </div>
          </div>

          <div className="text-[11px] text-[var(--text-muted)] mt-[-24px] mb-6 uppercase tracking-wider font-black opacity-40">
            {measurementHistory.length} records
          </div>

          <div className="overflow-x-auto rounded-[24px] border border-black/5 dark:border-white/5">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/[0.03] dark:bg-white/[0.03]">
                  <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--text-muted)] uppercase text-left">Date</th>
                  <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--accent)] uppercase text-center">Weight</th>
                  <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--text-muted)] uppercase text-center">Waist</th>
                  <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--text-muted)] uppercase text-center">Chest</th>
                  <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--text-muted)] uppercase text-center">Arms</th>
                  <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--text-muted)] uppercase text-center">Thighs</th>
                  <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--text-muted)] uppercase text-center">Hips</th>
                  <th className="py-4 px-4 font-black text-[9px] tracking-[0.2em] text-[var(--text-muted)] uppercase text-center">BF%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {measurementHistory.map((m, index) => (
                  <motion.tr
                    key={m.id}
                    className="hover:bg-white/50 dark:hover:bg-black/50 transition-colors"
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                  >
                    <td className="py-4 px-4 text-[11px] font-black uppercase opacity-60 whitespace-nowrap">
                      {new Date(m.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-4 text-[16px] font-black tracking-tight text-center text-[var(--accent)]">{m.weight ?? '—'}</td>
                    <td className="py-4 px-4 text-[13px] font-black text-center opacity-40">{m.waist ?? '—'}</td>
                    <td className="py-4 px-4 text-[13px] font-black text-center opacity-40">{m.chest ?? '—'}</td>
                    <td className="py-4 px-4 text-[13px] font-black text-center opacity-40">{m.arms ?? '—'}</td>
                    <td className="py-4 px-4 text-[13px] font-black text-center opacity-40">{m.thighs ?? '—'}</td>
                    <td className="py-4 px-4 text-[13px] font-black text-center opacity-40">{m.hips ?? '—'}</td>
                    <td className="py-4 px-4 text-[13px] font-black text-center text-[var(--trend-up)]">{m.bodyFat ?? '—'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
