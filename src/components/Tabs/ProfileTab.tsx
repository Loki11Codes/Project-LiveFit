'use client';

import React from 'react';
import Image from 'next/image';
import type { Session } from 'next-auth';
import { User, Target, LogOut, Beef, Flame, Save, ShieldCheck, Mail, Settings } from 'lucide-react';
import { signIn, signOut } from 'next-auth/react';
import type { GoalsState } from '@/lib/types';

interface ProfileTabProps {
  readonly session: Session | null;
  readonly goals: GoalsState;
  readonly setGoals: React.Dispatch<React.SetStateAction<GoalsState>>;
  readonly handleSaveGoals: () => void;
}

export default function ProfileTab({ 
  session, 
  goals, 
  setGoals, 
  handleSaveGoals 
}: ProfileTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Card */}
        <div className="card shadow-lg border-[var(--border)] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--surface2)] rounded-lg">
                <User className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
              <div>
                <div className="card-label mb-0">User Profile</div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tracking-tight uppercase font-medium">Account Settings & Details</p>
              </div>
            </div>
            {session?.user && (
              <div className="p-1 px-3 bg-[var(--green-bg)] text-[var(--green)] rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border border-[var(--green)]/10">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </div>
            )}
          </div>

          {session?.user ? (
            <div className="space-y-8 py-2">
               <div className="flex items-center gap-5 p-4 bg-[var(--surface2)] rounded-2xl border border-[var(--border)]/30">
                <div className="relative">
                  {session.user.image ? (
                    <Image 
                      src={session.user.image} 
                      alt="Profile" 
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-2xl border-2 border-[var(--bg)] shadow-md group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center">
                      <User className="w-8 h-8 text-[var(--text-muted)] opacity-30" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 p-1.5 bg-[var(--accent)] text-[var(--accent-inv)] rounded-lg shadow-lg">
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[18px] font-semibold tracking-tight truncate">{session.user.name}</div>
                  <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] mt-1 truncate">
                    <Mail className="w-3 h-3" />
                    {session.user.email}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => signOut()} 
                className="w-full py-3.5 flex items-center justify-center gap-2 text-[11px] uppercase font-bold tracking-widest text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="empty text-center py-16 px-5 border border-dashed border-[var(--border)] rounded-2xl">
              <div className="w-16 h-16 bg-[var(--surface2)] rounded-3xl flex items-center justify-center mx-auto mb-6">
                <User className="w-8 h-8 text-[var(--text-muted)] opacity-30" />
              </div>
              <div className="text-[var(--text-muted)] text-[12px] mb-6 max-w-[200px] mx-auto leading-relaxed">Join the community to track your physical progress over time.</div>
              <button onClick={() => signIn()} className="save-btn w-full">Sign In</button>
            </div>
          )}
          
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[var(--bg)] opacity-[0.5] blur-[80px] rounded-full pointer-events-none" />
        </div>

        {/* Goals Card */}
        <div className="card shadow-lg border-[var(--border)] relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[var(--surface2)] rounded-lg">
              <Target className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <div className="card-label mb-0">Daily Targets</div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tracking-tight uppercase font-medium">Fine-tune your nutritional goals</p>
            </div>
          </div>

          <div className="flex flex-col gap-6 mt-2 relative z-10">
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center px-1">
                <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--text-muted)] font-black flex items-center gap-2">
                  <Beef className="w-3.5 h-3.5" />
                  Protein Target
                </div>
                <span className="text-[14px] font-bold text-[var(--accent)]">{goals.proteinTarget}g</span>
              </div>
              <div className="relative">
                <input 
                  className="measure-input w-full shadow-inner bg-[var(--surface2)] rounded-xl border border-[var(--border)]" 
                  type="number" 
                  value={goals.proteinTarget} 
                  onChange={(e) => setGoals({ ...goals, proteinTarget: Number.parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center px-1">
                <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--text-muted)] font-black flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5" />
                  Calorie Target
                </div>
                <span className="text-[14px] font-bold">{goals.kcalTarget} kcal</span>
              </div>
              <div className="relative">
                <input 
                  className="measure-input w-full shadow-inner bg-[var(--surface2)] rounded-xl border border-[var(--border)]" 
                  type="number" 
                  value={goals.kcalTarget} 
                  onChange={(e) => setGoals({ ...goals, kcalTarget: Number.parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <button 
              className="save-btn mt-4 py-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-[var(--accent)]/10 hover:-translate-y-0.5 transition-all active:translate-y-0" 
              onClick={handleSaveGoals}
            >
              <Save className="w-4 h-4" />
              Update Daily Goals
            </button>
          </div>
          
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)] opacity-[0.02] blur-[100px] rounded-full pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
