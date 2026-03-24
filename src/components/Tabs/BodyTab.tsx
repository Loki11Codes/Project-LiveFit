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

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Log Measurements Card */}
        <motion.div
          className="card shadow-lg border-[var(--border)] transition-all"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[var(--surface2)] rounded-lg">
              <Ruler className="w-5 h-5" style={{ color: '#e6ac50' }} />
            </div>
            <div>
              <div className="card-label mb-0">Log Measurements</div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tracking-tight uppercase">
                Track your physical transformation
              </p>
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
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 opacity-80" style={{ color }} />
                  <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--text-muted)] font-bold">
                    {label}
                  </div>
                </div>
                <div className="relative group">
                  <input
                    className="measure-input w-full pr-8 transition-all focus:ring-1 focus:ring-[var(--accent)]/20"
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
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] font-bold opacity-50">
                    {unit}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.button
            className="save-btn mt-8 w-full group"
            onClick={handleSaveMeasurements}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Save className="w-4 h-4" style={{ color: '#e6ac50' }} />
            Save Measurements
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: '#e6ac50' }} />
          </motion.button>
        </motion.div>

        {/* Latest Stats Card */}
        <motion.div
          className="card shadow-lg border-[var(--border)] overflow-hidden relative"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-[var(--surface2)] rounded-xl">
              <History className="w-5 h-5 opacity-80" style={{ color: '#c0392b' }} />
            </div>
            <div>
              <div className="card-label mb-0">Latest Stats</div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tracking-tight uppercase font-bold">
                Your body transformation history
              </p>
            </div>
          </div>

          {latestMeasurement ? (
            <div className="space-y-1">
              {measurementFields.map(({ key, label, unit, icon: Icon, color }, index) => {
                const val = latestMeasurement[key as keyof BodyMeasurement];
                if (val === null || val === undefined) return null;
                return (
                  <motion.div
                    key={key}
                    className="flex items-center justify-between py-3 px-2 border-b border-[var(--border)]/30 last:border-0 group hover:bg-[var(--surface2)]/30 transition-all rounded-xl"
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    whileHover={{ y: -1, transition: { duration: 0.2 } }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-[var(--surface2)]/50 flex items-center justify-center transition-colors">
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <span className="text-[11px] uppercase tracking-widest font-black text-[var(--text-muted)]">
                        {label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[24px] font-extralight tracking-tighter text-[var(--text)]">
                        {val as number}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] font-black uppercase tracking-widest">
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
          className="card shadow-lg border-[var(--border)]"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[var(--surface2)] rounded-lg">
              <TableProperties className="w-5 h-5" style={{ color: '#6b7ea8' }} />
            </div>
            <div>
              <div className="card-label mb-0">Measurement History</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">
                {measurementHistory.length} records
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="history-table w-full border-collapse">
              <thead>
                <tr className="bg-[var(--surface2)]">
                  <th className="py-4 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase">Date</th>
                  <th className="py-4 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">Weight</th>
                  <th className="py-4 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">Waist</th>
                  <th className="py-4 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">Chest</th>
                  <th className="py-4 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">Arms</th>
                  <th className="py-4 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">Thighs</th>
                  <th className="py-4 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">Hips</th>
                  <th className="py-4 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">Calves</th>
                  <th className="py-4 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">Neck</th>
                  <th className="py-4 px-4 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center">BF%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {measurementHistory.map((m, index) => (
                  <motion.tr
                    key={m.id}
                    className="hover:bg-[var(--surface2)]/50 transition-colors"
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                  >
                    <td className="py-3 px-4 text-[12px] font-medium whitespace-nowrap">
                      {new Date(m.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-[16px] font-extralight tracking-tighter text-center">{m.weight ?? '—'}</td>
                    <td className="py-3 px-4 text-[14px] font-extralight text-center text-[var(--text-muted)]">{m.waist ?? '—'}</td>
                    <td className="py-3 px-4 text-[14px] font-extralight text-center text-[var(--text-muted)]">{m.chest ?? '—'}</td>
                    <td className="py-3 px-4 text-[14px] font-extralight text-center text-[var(--text-muted)]">{m.arms ?? '—'}</td>
                    <td className="py-3 px-4 text-[14px] font-extralight text-center text-[var(--text-muted)]">{m.thighs ?? '—'}</td>
                    <td className="py-3 px-4 text-[14px] font-extralight text-center text-[var(--text-muted)]">{m.hips ?? '—'}</td>
                    <td className="py-3 px-4 text-[14px] font-extralight text-center text-[var(--text-muted)]">{m.calves ?? '—'}</td>
                    <td className="py-3 px-4 text-[14px] font-extralight text-center text-[var(--text-muted)]">{m.neck ?? '—'}</td>
                    <td className="py-3 px-4 text-[14px] font-extralight text-center text-[var(--text-muted)]">{m.bodyFat ?? '—'}</td>
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
