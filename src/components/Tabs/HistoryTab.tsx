'use client';

import React from 'react';
import { Calendar, Layout, Moon, Beef, Target, CheckCircle2, Flame, Dumbbell } from 'lucide-react';

interface HistoryTabProps {
  readonly history: any[];
}

export default function HistoryTab({ history }: HistoryTabProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="card shadow-xl border-[var(--border)] animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--surface2)] rounded-lg">
              <Calendar className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <div className="card-label mb-0">Activity History</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">{history.length} Days Tracking</div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="history-table w-full border-collapse">
            <thead>
              <tr className="bg-[var(--surface2)]">
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase">Day</th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center flex items-center justify-center gap-1.5"><Layout className="w-3 h-3" /> Type</th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center"><span className="flex items-center justify-center gap-1.5"><Moon className="w-3 h-3" /> Sleep</span></th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center"><span className="flex items-center justify-center gap-1.5"><Beef className="w-3 h-3" /> Protein</span></th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center"><span className="flex items-center justify-center gap-1.5"><Target className="w-3 h-3" /> Target</span></th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center"><span className="flex items-center justify-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> Status</span></th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center"><span className="flex items-center justify-center gap-1.5"><Flame className="w-3 h-3" /> Calories</span></th>
                <th className="py-4 px-6 border-none font-bold text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-center"><span className="flex items-center justify-center gap-1.5"><Dumbbell className="w-3 h-3" /> Workout</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {history.length > 0 ? history.map(h => (
                <tr key={h.day} className="hover:bg-[var(--surface2)]/50 transition-colors">
                  <td className="py-4 px-6 text-[13px] font-medium">{h.day}</td>
                  <td className="py-4 px-6 text-[12px] text-center font-light uppercase tracking-tight">{h.type}</td>
                  <td className="py-4 px-6 text-[18px] font-extralight tracking-tighter text-center">{h.sleep}h</td>
                  <td className="py-4 px-6 text-[20px] font-extralight tracking-tighter text-center text-[var(--accent)]">{h.protein}g</td>
                  <td className="py-4 px-6 text-[14px] text-center text-[var(--text-muted)] opacity-60 tracking-tight">{h.target}g</td>
                  <td className="py-4 px-6 text-center">
                    <div className="flex justify-center">
                      <div className={`w-2 h-2 rounded-full ${h.status === 'completed' ? 'bg-[var(--green)] shadow-[0_0_8px_rgba(var(--green),0.4)]' : 'bg-[var(--amber)] opacity-40'}`} />
                    </div>
                  </td>
                  <td className="py-4 px-6 text-[18px] font-extralight tracking-tighter text-center">{h.kcal} <span className="text-[10px] text-[var(--text-muted)] opacity-50 uppercase tracking-widest">kcal</span></td>
                  <td className="py-4 px-6 text-[13px] text-center text-[var(--text-muted)] font-medium opacity-60">{h.workout}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[var(--text-muted)]">
                    <Calendar className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No history logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
