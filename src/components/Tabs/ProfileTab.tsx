"use client";

import React from "react";
import Image from "next/image";
import type { Session } from "next-auth";
import {
  User,
  Target,
  LogOut,
  ShieldCheck,
  Mail,
  Settings,
  Info,
  Dumbbell,
  LogIn,
  Trophy,
} from "lucide-react";
import { AchievementCard } from "@/components/Shared/AchievementCard";
import type { AchievementTier } from "@/lib/achievements";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cardVariants, rowVariants } from "@/lib/animations";
import EmptyState from "@/components/Shared/EmptyState";
import type { GoalsState, DashboardState, UserProfile } from "@/lib/types";

interface ProfileTabProps {
  readonly session: Session | null;
  readonly goals: GoalsState;
  readonly profile: DashboardState["profile"];
  readonly analytics: DashboardState["analytics"];
  readonly trackedDayCount: number;
}

export default function ProfileTab({
  session,
  goals,
  profile,
  analytics,
  trackedDayCount,
}: ProfileTabProps) {
  const router = useRouter();
  const p = profile ?? ({} as UserProfile);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Card */}
        <motion.div
          className="glass-premium p-6 rounded-[var(--radius-lg)] relative overflow-hidden group hover-glow"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl group-hover:bg-[var(--iq-blue)]/5 transition-colors">
                <User className="w-5 h-5 text-[var(--iq-blue)]" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Identity</div>
                <h2 className="text-sm font-black tracking-tight uppercase">User Profile</h2>
              </div>
            </div>
            {session?.user && (
              <motion.div
                className="px-3 py-1 bg-[var(--nutri-green)]/10 text-[var(--nutri-green)] rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-[var(--nutri-green)]/20 shadow-lg shadow-[var(--nutri-green)]/5"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", damping: 15 }}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Elite
              </motion.div>
            )}
          </div>

          {session?.user ? (
            <div className="flex flex-col gap-10 py-2">
              <motion.div
                className="flex items-center gap-6 p-5 bg-black/[0.02] dark:bg-white/[0.02] rounded-[var(--radius-lg)] border border-black/5 dark:border-white/5 relative z-10"
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                custom={0}
              >
                <motion.div
                  className="relative"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", damping: 15 }}
                >
                  <div className="absolute inset-0 bg-[var(--iq-blue)]/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt="Profile"
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-2xl border-2 border-white/10 shadow-2xl relative z-10 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-black/[0.05] dark:bg-white/[0.05] border border-white/5 flex items-center justify-center relative z-10">
                      <User
                        className="w-8 h-8 opacity-40 text-[var(--iq-blue)]"
                      />
                    </div>
                  )}
                </motion.div>
                <div className="min-w-0">
                  <div className="text-[20px] font-black tracking-tighter leading-none mb-2">
                    {session.user.name}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider opacity-40 truncate">
                    <Mail className="w-3.5 h-3.5" />
                    {session.user.email}
                  </div>
                </div>
              </motion.div>

              {/* Activity Stats Section */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-black/[0.03] dark:bg-white/[0.03] rounded-[var(--radius-md)] border border-black/5 dark:border-white/5 text-center transition-all hover:bg-black/[0.05] dark:hover:bg-white/[0.05]">
                  <div className="text-[9px] uppercase tracking-[0.2em] font-black opacity-30 mb-2">
                    Active Days
                  </div>
                  <div className="text-[24px] font-black tracking-tighter leading-none">
                    {trackedDayCount}
                  </div>
                </div>
                <div className="p-4 bg-black/[0.03] dark:bg-white/[0.03] rounded-[var(--radius-md)] border border-black/5 dark:border-white/5 text-center transition-all hover:bg-black/[0.05] dark:hover:bg-white/[0.05]">
                  <div className="text-[9px] uppercase tracking-[0.2em] font-black opacity-30 mb-2">
                    Avg Pro (g)
                  </div>
                  <div className="text-[24px] font-black tracking-tighter leading-none text-[var(--iq-blue)]">
                    {(analytics?.averages.protein ?? 0).toFixed(0)}
                  </div>
                </div>
                <div className="p-4 bg-black/[0.03] dark:bg-white/[0.03] rounded-[var(--radius-md)] border border-black/5 dark:border-white/5 text-center transition-all hover:bg-black/[0.05] dark:hover:bg-white/[0.05]">
                  <div className="text-[9px] uppercase tracking-[0.2em] font-black opacity-30 mb-2">
                    Avg Kcal
                  </div>
                  <div className="text-[24px] font-black tracking-tighter leading-none text-[var(--nutri-green)]">
                    {(analytics?.averages.kcal ?? 0).toFixed(0)}
                  </div>
                </div>
              </div>

                <div className="flex flex-col gap-3 mt-8">
                  <motion.button
                    onClick={() => router.push("/settings")}
                    className="w-full py-4 glass-premium rounded-[var(--radius-md)] flex items-center justify-center gap-3 transition-all hover:bg-white/10 group/btn"
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    custom={1}
                    whileHover={{ scale: 1.01, translateY: -2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="p-2 bg-black/[0.05] dark:bg-white/[0.05] rounded-[var(--radius-sm)] group-hover/btn:bg-[var(--iq-blue)]/20 transition-colors">
                      <Settings
                        className="w-4 h-4 text-[var(--iq-blue)]"
                      />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest opacity-60">App Settings</span>
                  </motion.button>
  
                  <motion.button
                    onClick={() => signOut()}
                    className="w-full py-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-[var(--radius-md)] flex items-center justify-center gap-3 transition-all group/logout"
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    custom={2}
                    whileHover={{ scale: 1.01, translateY: -2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="p-1 px-3 bg-red-500/10 text-red-500 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 group-hover/logout:bg-red-500/20 transition-colors">
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </div>
                  </motion.button>
                </div>
            </div>
          ) : (
            <EmptyState
              icon={User}
              message="Join the community"
              description="Sign in to track your physical progress and save your nutritional targets over time."
              iconColor="var(--iq-blue)"
              action={
                <button onClick={() => signIn()} className="save-btn w-full">
                  <LogIn className="w-4 h-4 mr-1" />
                  Sign In
                </button>
              }
            />
          )}

          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-(--bg) opacity-[0.5] blur-[80px] rounded-full pointer-events-none" />
        </motion.div>

        <motion.div
          className="glass-premium p-6 rounded-[var(--radius-lg)] relative overflow-hidden hover-glow"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl">
              <Target className="w-5 h-5 text-[var(--nutri-green)]" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Optimization</div>
              <h3 className="text-sm font-black tracking-tight uppercase">Daily Targets</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 relative z-10">
            <div className="flex flex-col gap-1.5">
              <div className="text-[9px] font-black uppercase tracking-widest opacity-30">
                Training Protein
              </div>
              <div className="text-[16px] font-black tracking-tighter text-[var(--iq-blue)]">
                {goals.proteinTraining || "--"}<span className="text-[10px] ml-0.5 opacity-40 uppercase tracking-widest">g</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-(--text-muted) font-bold">
                Rest Protein (g)
              </div>
              <div className="measure-input w-full flex items-center bg-transparent border-none px-0 text-[15px] font-semibold text-(--text)">
                {goals.proteinRest || "--"}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-(--text-muted) font-bold">
                Lite Protein (g)
              </div>
              <div className="measure-input w-full flex items-center bg-transparent border-none px-0 text-[15px] font-semibold text-(--text)">
                {goals.proteinLite || "--"}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-(--text-muted) font-bold">
                Water (L)
              </div>
              <div className="measure-input w-full flex items-center bg-transparent border-none px-0 text-[15px] font-semibold text-(--text)">
                {goals.waterTarget || "--"}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-(--text-muted) font-bold">
                Sleep Target (hrs)
              </div>
              <div className="measure-input w-full flex items-center bg-transparent border-none px-0 text-[15px] font-semibold text-(--text)">
                {goals.sleepTarget || "--"}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Personal Info Card */}
        <motion.div
          className="glass-premium p-6 rounded-[var(--radius-lg)] relative overflow-hidden hover-glow"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl">
              <Info className="w-5 h-5 text-[var(--iq-blue-light)]" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Physiology</div>
              <h3 className="text-sm font-black tracking-tight uppercase">Personal Info</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2 relative z-10">
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-(--text-muted) font-bold">
                Age
              </div>
              <div className="measure-input w-full flex items-center bg-transparent border-none px-0 text-[15px] font-semibold text-(--text)">
                {p.age || "--"}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-(--text-muted) font-bold">
                Gender
              </div>
              <div className="measure-input w-full flex items-center bg-transparent border-none px-0 text-[15px] font-semibold text-(--text) capitalize">
                {p.gender || "--"}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-(--text-muted) font-bold">
                Height (cm)
              </div>
              <div className="measure-input w-full flex items-center bg-transparent border-none px-0 text-[15px] font-semibold text-(--text)">
                {p.height || "--"}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-(--text-muted) font-bold">
                Start Day
              </div>
              <div className="measure-input w-full flex items-center bg-transparent border-none px-0 text-[15px] font-semibold text-(--text)">
                {p.startDay || "--"}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <div className="text-[10px] tracking-[0.05em] uppercase text-(--text-muted) font-bold">
                Primary Goal
              </div>
              <div className="measure-input w-full flex items-center bg-transparent border-none px-0 text-[15px] font-semibold text-(--text) capitalize">
                {p.primaryGoal || "--"}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Workout Split Card */}
        <motion.div
          className="glass-premium p-6 rounded-[var(--radius-lg)] relative overflow-hidden hover-glow"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl">
              <Dumbbell className="w-5 h-5 text-[var(--energy-coral)]" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Strategy</div>
              <h3 className="text-sm font-black tracking-tight uppercase">Workout Split</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2 relative z-10">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div key={num} className="flex flex-col gap-1.5">
                <div className="text-[10px] tracking-[0.05em] uppercase text-(--text-muted) font-bold">
                  Day {num}
                </div>
                <div className="measure-input w-full flex items-center bg-transparent border-none px-0 text-[15px] font-semibold text-(--text)">
                  {p[`day${num as 1 | 2 | 3 | 4 | 5 | 6}`] || "--"}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Trophy Case */}
      <motion.div
        className="glass-premium p-6 rounded-[var(--radius-lg)] relative overflow-hidden group hover-glow"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={4}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl group-hover:bg-yellow-500/10 transition-colors">
              <Trophy className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Trophy Case</div>
              <h2 className="text-sm font-black tracking-tight uppercase">Achievements</h2>
            </div>
          </div>
          <div className="text-[10px] font-black uppercase text-[var(--nutri-green)] tracking-widest">
            {p.achievements?.length || 0} Unlocked
          </div>
        </div>

        {p.achievements && p.achievements.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {p.achievements.map((item) => (
              <AchievementCard
                key={item.id}
                title={item.title}
                description={item.description}
                tier={item.tier as AchievementTier}
                icon={(item as Record<string, unknown>).icon as string}
                unlockedAt={new Date(item.unlockedAt)}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center text-center gap-4 bg-black/5 rounded-[var(--radius-md)] border border-dashed border-black/10">
            <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center">
               <Trophy className="w-6 h-6 opacity-10" />
            </div>
            <div className="max-w-[200px]">
               <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">No Trophies Yet</h4>
               <p className="text-[9px] font-medium opacity-30">Smash some PRs in the gym to unlock your first holographic badge.</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
