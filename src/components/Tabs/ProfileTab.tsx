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
} from "lucide-react";
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
          className="card shadow-lg border-(--border) relative overflow-hidden group"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-(--surface2) rounded-lg">
                <User className="w-5 h-5" style={{ color: "#7b5ea7" }} />
              </div>
              <div>
                <div className="card-label mb-0">User Profile</div>
                <p className="text-[11px] text-(--text-muted) mt-0.5 tracking-tight uppercase font-medium">
                  Account Settings & Details
                </p>
              </div>
            </div>
            {session?.user && (
              <motion.div
                className="p-1 px-3 bg-(--green-bg) text-(--green) rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border border-(--green)/10"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", damping: 15 }}
              >
                <ShieldCheck className="w-3 h-3" />
                Verified
              </motion.div>
            )}
          </div>

          {session?.user ? (
            <div className="flex flex-col gap-10 py-2">
              <motion.div
                className="flex items-center gap-5 p-4 bg-(--surface2) rounded-2xl border border-(--border)/30"
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
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt="Profile"
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-2xl border-2 border-(--bg) shadow-md group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-(--bg) border border-(--border) flex items-center justify-center">
                      <User
                        className="w-8 h-8 opacity-40"
                        style={{ color: "#7b5ea7" }}
                      />
                    </div>
                  )}
                </motion.div>
                <div className="min-w-0">
                  <div className="text-[16px] font-semibold tracking-tight truncate">
                    {session.user.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-(--text-muted) mt-1 truncate">
                    <Mail className="w-3 h-3" style={{ color: "#6b7ea8" }} />
                    {session.user.email}
                  </div>
                </div>
              </motion.div>

              {/* Activity Stats Section */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-(--surface2) rounded-2xl border border-(--border)/30 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-(--text-muted) font-bold mb-1.5 opacity-60">
                    Days
                  </div>
                  <div className="text-[20px] font-extralight tracking-tighter text-(--text)">
                    {trackedDayCount}
                  </div>
                </div>
                <div className="p-4 bg-(--surface2) rounded-2xl border border-(--border)/30 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-(--text-muted) font-bold mb-1.5 opacity-60">
                    Avg Pro
                  </div>
                  <div className="text-[20px] font-extralight tracking-tighter text-(--text)">
                    {(analytics?.averages.protein ?? 0).toFixed(0)}g
                  </div>
                </div>
                <div className="p-4 bg-(--surface2) rounded-2xl border border-(--border)/30 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-(--text-muted) font-bold mb-1.5 opacity-60">
                    Avg Kcal
                  </div>
                  <div className="text-[20px] font-extralight tracking-tighter text-(--text)">
                    {(analytics?.averages.kcal ?? 0).toFixed(0)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-8">
                <motion.button
                  onClick={() => router.push("/settings")}
                  className="save-btn w-full py-4"
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  custom={1}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Settings
                    className="w-4.5 h-4.5"
                    style={{ color: "#7b5ea7" }}
                  />
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
                  <LogOut
                    className="w-4.5 h-4.5"
                    style={{ color: "#ffffff" }}
                  />
                  <span>Sign Out</span>
                </motion.button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={User}
              message="Join the community"
              description="Sign in to track your physical progress and save your nutritional targets over time."
              iconColor="#7b5ea7"
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
          className="card shadow-lg border-(--border) relative overflow-hidden"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-(--surface2) rounded-lg">
              <Target className="w-5 h-5" style={{ color: "#4db382" }} />
            </div>
            <div>
              <div className="card-label mb-0">Daily Targets</div>
              <p className="text-[11px] text-(--text-muted) mt-0.5 tracking-tight uppercase font-medium">
                Fine-tune your nutritional goals
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 relative z-10">
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.05em] uppercase text-(--text-muted) font-bold">
                Training Protein (g)
              </div>
              <div className="measure-input w-full flex items-center bg-transparent border-none px-0 text-[15px] font-semibold text-(--text)">
                {goals.proteinTraining || "--"}
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
          className="card shadow-lg border-(--border) relative overflow-hidden"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-(--surface2) rounded-lg">
              <Info className="w-5 h-5" style={{ color: "#6b7ea8" }} />
            </div>
            <div>
              <div className="card-label mb-0">Personal Info</div>
              <p className="text-[11px] text-(--text-muted) mt-0.5 tracking-tight uppercase font-medium">
                Your physical details
              </p>
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
          className="card shadow-lg border-(--border) relative overflow-hidden"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-(--surface2) rounded-lg">
              <Dumbbell className="w-5 h-5" style={{ color: "#c0392b" }} />
            </div>
            <div>
              <div className="card-label mb-0">Workout Split</div>
              <p className="text-[11px] text-(--text-muted) mt-0.5 tracking-tight uppercase font-medium">
                Your weekly routine
              </p>
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
    </div>
  );
}
