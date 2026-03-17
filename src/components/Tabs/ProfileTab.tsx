'use client';

import React from 'react';
import Image from 'next/image';
import type { Session } from 'next-auth';
import { 
  User, 
  Target, 
  LogOut, 
  Save, 
  ShieldCheck, 
  Mail, 
  Settings, 
  Info, 
  Dumbbell, 
  LogIn
} from 'lucide-react';
import { signIn, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import type { GoalsState, DashboardState, UserProfile } from '@/lib/types';

interface ProfileTabProps {
  readonly session: Session | null;
  readonly goals: GoalsState;
  readonly setGoals: React.Dispatch<React.SetStateAction<GoalsState>>;
  readonly handleSaveGoals: () => void;
  readonly profile: DashboardState['profile'];
  readonly setProfile: React.Dispatch<React.SetStateAction<DashboardState['profile']>>;
  readonly handleSaveProfile: () => void;
  readonly analytics: DashboardState['analytics'];
  readonly trackedDayCount: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.12, type: 'spring' as const, damping: 20, stiffness: 100 },
  }),
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.15 + index * 0.06, type: 'spring' as const, damping: 20, stiffness: 120 },
  }),
};

const floatAnimation = {
  y: [0, -6, 0],
  transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
};

export default function ProfileTab({ 
  session, 
  goals, 
  setGoals, 
  handleSaveGoals,
  profile,
  setProfile,
  handleSaveProfile,
  analytics,
  trackedDayCount
}: ProfileTabProps) {
  const p = profile as UserProfile || {} as UserProfile;
  const updateProfileField = (field: keyof UserProfile, value: string | number | null) => {
    setProfile(curr => ({
      ...curr,
      [field]: value
    }));
  };

  const updateGoalField = (field: keyof GoalsState, value: number | null) => {
    setGoals(curr => ({
      ...curr,
      [field]: value
    }));
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Card */}
        <motion.div
          className="card shadow-lg border-[var(--border)] relative overflow-hidden group"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--surface2)] rounded-lg">
                <User className="w-5 h-5" style={{ color: '#7b5ea7' }} />
              </div>
              <div>
                <div className="card-label mb-0">User Profile</div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tracking-tight uppercase font-medium">Account Settings & Details</p>
              </div>
            </div>
            {session?.user && (
              <motion.div
                className="p-1 px-3 bg-[var(--green-bg)] text-[var(--green)] rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border border-[var(--green)]/10"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', damping: 15 }}
              >
                <ShieldCheck className="w-3 h-3" />
                Verified
              </motion.div>
            )}
          </div>

          {session?.user ? (
            <div className="flex flex-col gap-10 py-2">
              <motion.div
                className="flex items-center gap-5 p-4 bg-[var(--surface2)] rounded-2xl border border-[var(--border)]/30"
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                custom={0}
              >
                <motion.div
                  className="relative"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                >
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
                      <User className="w-8 h-8 opacity-40" style={{ color: '#7b5ea7' }} />
                    </div>
                  )}
                </motion.div>
                <div className="min-w-0">
                  <div className="text-[16px] font-semibold tracking-tight truncate">{session.user.name}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mt-1 truncate">
                    <Mail className="w-3 h-3" style={{ color: '#6b7ea8' }} />
                    {session.user.email}
                  </div>
                </div>
              </motion.div>

              {/* Activity Stats Section */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[var(--surface2)] rounded-2xl border border-[var(--border)]/30 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1.5 opacity-60">Days</div>
                  <div className="text-[20px] font-extralight tracking-tighter text-[var(--text)]">{trackedDayCount}</div>
                </div>
                <div className="p-4 bg-[var(--surface2)] rounded-2xl border border-[var(--border)]/30 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1.5 opacity-60">Avg Pro</div>
                  <div className="text-[20px] font-extralight tracking-tighter text-[var(--text)]">{analytics?.averages.protein.toFixed(0) || 0}g</div>
                </div>
                <div className="p-4 bg-[var(--surface2)] rounded-2xl border border-[var(--border)]/30 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1.5 opacity-60">Avg Kcal</div>
                  <div className="text-[20px] font-extralight tracking-tighter text-[var(--text)]">{analytics?.averages.kcal.toFixed(0) || 0}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-8">
                <motion.button 
                  className="save-btn w-full py-4"
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  custom={1}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Settings className="w-4.5 h-4.5" style={{ color: '#7b5ea7' }} />
                  <span>Settings</span>
                </motion.button>

                <motion.button 
                  onClick={() => signOut()} 
                  className="danger-btn w-full py-4"
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  custom={2}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <LogOut className="w-4.5 h-4.5" style={{ color: '#ffffff' }} />
                  <span>Sign Out</span>
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="empty text-center py-16 px-5 border border-dashed border-[var(--border)] rounded-2xl">
              <motion.div animate={floatAnimation}>
                <div className="w-16 h-16 bg-[var(--surface2)] rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <User className="w-8 h-8 opacity-40" style={{ color: '#7b5ea7' }} />
                </div>
              </motion.div>
              <div className="text-[var(--text-muted)] text-[12px] mb-6 max-w-[200px] mx-auto leading-relaxed">Join the community to track your physical progress over time.</div>
              <button onClick={() => signIn()} className="save-btn w-full">
                <LogIn className="w-4 h-4 mr-1" />
                Sign In
              </button>
            </div>
          )}
          
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[var(--bg)] opacity-[0.5] blur-[80px] rounded-full pointer-events-none" />
        </motion.div>

        <motion.div
          className="card shadow-lg border-[var(--border)] relative overflow-hidden"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[var(--surface2)] rounded-lg">
              <Target className="w-5 h-5" style={{ color: '#4db382' }} />
            </div>
            <div>
              <div className="card-label mb-0">Daily Targets</div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tracking-tight uppercase font-medium">Fine-tune your nutritional goals</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 relative z-10">
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-[var(--text-muted)] font-bold">Training Protein (g)</div>
              <input 
                className="measure-input w-full" 
                type="number" 
                value={goals.proteinTraining || ''} 
                onChange={(e) => updateGoalField('proteinTraining', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-[var(--text-muted)] font-bold">Rest Protein (g)</div>
              <input 
                className="measure-input w-full" 
                type="number" 
                value={goals.proteinRest || ''} 
                onChange={(e) => updateGoalField('proteinRest', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-[var(--text-muted)] font-bold">Lite Protein (g)</div>
              <input 
                className="measure-input w-full" 
                type="number" 
                value={goals.proteinLite || ''} 
                onChange={(e) => updateGoalField('proteinLite', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-[var(--text-muted)] font-bold">Water (L)</div>
              <input 
                className="measure-input w-full" 
                type="number" 
                step="0.1"
                value={goals.waterTarget || ''} 
                onChange={(e) => updateGoalField('waterTarget', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-[var(--text-muted)] font-bold">Sleep Target (hrs)</div>
              <input 
                className="measure-input w-full" 
                type="number" 
                step="0.5"
                value={goals.sleepTarget || ''} 
                onChange={(e) => updateGoalField('sleepTarget', e.target.value ? Number(e.target.value) : null)}
              />
            </div>

            <motion.button 
              className="save-btn sm:col-span-2 mt-2" 
              onClick={handleSaveGoals}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Save className="w-4 h-4" style={{ color: '#4db382' }} />
              Update Targets
            </motion.button>
          </div>
        </motion.div>

        {/* Personal Info Card */}
        <motion.div
          className="card shadow-lg border-[var(--border)] relative overflow-hidden"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[var(--surface2)] rounded-lg">
              <Info className="w-5 h-5" style={{ color: '#6b7ea8' }} />
            </div>
            <div>
              <div className="card-label mb-0">Personal Info</div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tracking-tight uppercase font-medium">Your physical details</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2 relative z-10">
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-[var(--text-muted)] font-bold">Age</div>
              <input 
                className="measure-input w-full" 
                type="number" 
                value={p.age || ''} 
                onChange={(e) => updateProfileField('age', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-[var(--text-muted)] font-bold">Gender</div>
              <select 
                className="measure-input w-full" 
                value={p.gender || ''}
                onChange={(e) => updateProfileField('gender', e.target.value)}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-[var(--text-muted)] font-bold">Height (cm)</div>
              <input 
                className="measure-input w-full" 
                type="number" 
                value={p.height || ''} 
                onChange={(e) => updateProfileField('height', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-[var(--text-muted)] font-bold">Start Day</div>
              <input 
                className="measure-input w-full" 
                type="number" 
                value={p.startDay || ''} 
                onChange={(e) => updateProfileField('startDay', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <div className="text-[10px] tracking-[0.05em] uppercase text-[var(--text-muted)] font-bold">Primary Goal</div>
              <select 
                className="measure-input w-full" 
                value={p.primaryGoal || ''}
                onChange={(e) => updateProfileField('primaryGoal', e.target.value)}
              >
                <option value="">Select a Goal</option>
                <option value="Weight Loss">Weight Loss</option>
                <option value="Muscle Gain">Muscle Gain</option>
                <option value="Endurance">Endurance</option>
                <option value="Flexibility">Flexibility</option>
                <option value="General Fitness">General Fitness</option>
              </select>
            </div>
            <motion.button 
              className="save-btn col-span-2 mt-2" 
              onClick={handleSaveProfile}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Save className="w-4 h-4" style={{ color: '#7b5ea7' }} />
              Save Profile
            </motion.button>
          </div>
        </motion.div>

        {/* Workout Split Card */}
        <motion.div
          className="card shadow-lg border-[var(--border)] relative overflow-hidden"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[var(--surface2)] rounded-lg">
              <Dumbbell className="w-5 h-5" style={{ color: '#c0392b' }} />
            </div>
            <div>
              <div className="card-label mb-0">Workout Split</div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tracking-tight uppercase font-medium">Your weekly routine</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2 relative z-10">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div key={num} className="flex flex-col gap-1.5">
                <div className="text-[10px] tracking-[0.05em] uppercase text-[var(--text-muted)] font-bold">Day {num}</div>
                <input 
                  className="measure-input w-full" 
                  type="text" 
                  value={(p as any)[`day${num}` as keyof UserProfile] || ''} 
                  onChange={(e) => updateProfileField(`day${num}` as keyof UserProfile, e.target.value)}
                />
              </div>
            ))}
            <motion.button 
              className="save-btn col-span-2 mt-2" 
              onClick={handleSaveProfile}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Save className="w-4 h-4" style={{ color: '#c0392b' }} />
              Save Split
            </motion.button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
