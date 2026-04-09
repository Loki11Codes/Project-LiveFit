"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { requestJson } from "@/lib/client-api";
import type { UserProfile, GoalsState } from "@/lib/types";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Target,
  Utensils,
  BellRing,
  Shield,
  LogOut,
  Smartphone,
  Save,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { calculateDailyTargets } from "@/lib/recommendations";
import { BRAND_COLORS, useTheme } from "@/components/Theme/ThemeProvider";

const SIDEBAR_TABS = [
  { id: "profile", label: "General & Profile", icon: User },
  { id: "fitness", label: "Fitness & Goals", icon: Target },
  { id: "nutrition", label: "Nutrition & Diet", icon: Utensils },
  { id: "notifications", label: "Notifications & Apps", icon: BellRing },
  { id: "privacy", label: "Privacy & Advanced", icon: Shield },
];

type ProfileFieldValue = string | number | boolean | null;
type GoalFieldValue = string | number | null;

export default function SettingsPage() {
  useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const [savedStatus, setSavedStatus] = useState(false);

  const [profileData, setProfileData] = useState<Partial<UserProfile>>({});
  const [goalsData, setGoalsData] = useState<Partial<GoalsState>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const [prof, go, measure] = await Promise.all([
          requestJson<UserProfile>("/api/profile"),
          requestJson<GoalsState>("/api/profile?type=goals"),
          requestJson<{ weight: number }[]>("/api/measurements"),
        ]);
        if (prof) setProfileData(prof);
        if (go) setGoalsData(go);
        if (measure && measure.length > 0) {
          setProfileData(prev => ({ ...prev, weight: measure[0].weight } as any));
        }
      } catch (e) {
        console.error("Failed to load settings data", e);
      }
    }
    loadData();
  }, []);

  const handleProfileChange = (field: string, value: ProfileFieldValue) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGoalChange = (field: keyof GoalsState, value: GoalFieldValue) => {
    setGoalsData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      // Save profile data
      const pubRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      if (!pubRes.ok) throw new Error("Failed to save profile");

      // Save goals data
      const goalsRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goalsData),
      });
      if (!goalsRes.ok) throw new Error("Failed to save goals");

      setSavedStatus(true);
      toast.success("Settings saved successfully!");
      setTimeout(() => setSavedStatus(false), 2500);

      // Refresh the page data if needed or inform router
    } catch (e) {
      console.error(e);
      toast.error("Failed to save settings");
    }
  };
  
  const handleRecalculateMacros = () => {
    const targets = calculateDailyTargets({
      gender: profileData.gender,
      age: profileData.age,
      height: profileData.height,
      weight: (profileData as any).weight,
      activityPreference: profileData.activityPreference,
      primaryGoal: profileData.primaryGoal,
      dietaryPreference: profileData.dietaryPreference
    });
    
    if (!targets) {
      toast.error("Complete your profile (age, weight, height, gender) to recalculate macros.");
      return;
    }
    
    setGoalsData(prev => ({
      ...prev,
      kcalTarget: targets.kcalTarget,
      proteinTarget: targets.proteinTarget,
      carbsTarget: targets.carbsTarget,
      fatsTarget: targets.fatsTarget
    }));
    toast.success("Macros recalculated based on your profile!");
  };

  return (
    <div className="relative min-h-screen bg-(--bg) text-(--text) overflow-hidden">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-size-[34px_34px] opacity-70" />
      <div className="pointer-events-none absolute -left-20 top-8 h-125 w-125 rounded-full bg-amber-300/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-14 -right-20 h-150 w-150 rounded-full bg-cyan-300/10 blur-[130px]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-340 flex-col px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                router.refresh();
                router.push("/");
              }}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-(--surface)/75 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] text-zinc-700 backdrop-blur-sm transition hover:border-black/20 hover:bg-(--surface) dark:bg-(--surface2)/80 dark:text-zinc-300  dark:hover:bg-(--surface2)"
            >
              <ArrowLeft size={16} />
              Dashboard
            </button>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Account Settings
            </h1>
          </div>
          <button
            onClick={handleSave}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-zinc-900 px-6 text-[13px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-(--surface2) dark:bg-(--surface) dark:text-(--text) dark:hover:bg-zinc-200"
          >
            {savedStatus ? (
              <CheckCircle2 size={16} className="text-green-500" />
            ) : (
              <Save size={16} />
            )}
            {savedStatus ? "Saved" : "Save Changes"}
          </button>
        </div>

        {/* Main Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Sidebar */}
          <div className="md:col-span-3 flex flex-col gap-2">
            {SIDEBAR_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-semibold transition-all ${
                    isActive
                      ? "bg-(--surface) text-(--text) shadow-sm border border-(--border)"
                      : "text-(--text-muted) hover:text-(--text) hover:bg-(--surface2)"
                  }`}
                >
                  <Icon
                    size={18}
                    className={isActive ? "text-amber-500" : "opacity-70"}
                  />
                  {tab.label}
                </button>
              );
            })}

            <div className="mt-6 pt-6 border-t border-black/5 ">
              <button className="flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-semibold text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-500/10">
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="md:col-span-9 rounded-4xl border border-(--border) bg-(--surface) p-6 shadow-sm backdrop-blur-xl   sm:p-10">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "profile" && (
                  <ProfilePanel
                    data={profileData}
                    onChange={handleProfileChange}
                  />
                )}
                {activeTab === "fitness" && (
                  <FitnessPanel
                    goals={goalsData}
                    profile={profileData}
                    onChangeGoal={handleGoalChange}
                    onChangeProfile={handleProfileChange}
                  />
                )}
                {activeTab === "nutrition" && (
                  <NutritionPanel
                    goals={goalsData}
                    profile={profileData}
                    onChangeGoal={handleGoalChange}
                    onChangeProfile={handleProfileChange}
                    onRecalculate={handleRecalculateMacros}
                  />
                )}
                {activeTab === "notifications" && (
                  <NotificationsPanel
                    data={profileData}
                    onChange={handleProfileChange}
                  />
                )}
                {activeTab === "privacy" && <PrivacyPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold tracking-tight text-(--text)">
        {title}
      </h2>
      <p className="mt-1 text-[14px] text-(--text-muted) ">{description}</p>
    </div>
  );
}

function FormField({
  label,
  placeholder,
  type = "text",
  value = "",
  onChange,
}: Readonly<{
  label: string;
  placeholder?: string;
  type?: string;
  value?: string | number;
  onChange?: (val: string) => void;
}>) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[12px] font-bold uppercase tracking-widest text-(--text-muted)  ml-1">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-12 w-full rounded-xl border border-(--border) bg-transparent px-4 text-[15px] font-medium outline-none transition focus:border-(--amber) focus:ring-4 focus:ring-(--amber-bg)   text-(--text)"
      />
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked = false,
  onChange,
}: Readonly<{
  label: string;
  description: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}>) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex flex-col">
        <span className="text-[15px] font-semibold text-(--text)">{label}</span>
        <span className="text-[13px] text-(--text-muted) ">{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer shadow-inner ${checked ? "bg-[var(--accent)]" : "bg-(--border)"}`}
      >
        <div
          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * PANEL COMPONENTS
 * -------------------------------------------------------------------------- */

function ProfilePanel({
  data,
  onChange,
}: Readonly<{
  data: Partial<UserProfile>;
  onChange: (f: string, v: ProfileFieldValue) => void;
}>) {
  const { accentColor: themeAccent } = useTheme();
  
  return (
    <div className="space-y-10">
      <SectionHeading
        title="General & Profile"
        description="Manage your personal details and app preferences."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Full Name"
          placeholder="Alex Carter"
          value={data.name || ""}
          onChange={(v) => onChange("name", v)}
        />
        <FormField
          label="Username"
          placeholder="@username"
          value={data.username || ""}
          onChange={(v) => onChange("username", v)}
        />
        <FormField
          label="Email (ReadOnly)"
          type="email"
          placeholder="you@example.com"
          value={data.email || ""}
          // Email updates should typically be handled separately with auth, but we'll disable it here or just not update it.
          onChange={() => {}}
        />
        <FormField
          label="Phone"
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={data.phone || ""}
          onChange={(v) => onChange("phone", v)}
        />
      </div>

      <hr className="border-black/5 " />

      <div>
        <h3 className="text-lg font-bold mb-4">Body Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            label="Age"
            type="number"
            placeholder="25"
            value={data.age || ""}
            onChange={(v) => onChange("age", Number.parseInt(v) || 0)}
          />
          <FormField
            label="Height (cm)"
            type="number"
            placeholder="180"
            value={data.height || ""}
            onChange={(v) => onChange("height", Number.parseInt(v) || 0)}
          />
          <FormField
            label="Gender"
            placeholder="Male / Female"
            value={data.gender || ""}
            onChange={(v) => onChange("gender", v)}
          />
        </div>
      </div>

      <hr className="border-black/5 " />

      <div>
        <h3 className="text-lg font-bold mb-4">App Preferences</h3>
        <div className="space-y-2">
          <ToggleField
            label="Haptic Feedback"
            description="Enable vibrations for app interactions."
            checked={data.hapticFeedback ?? true}
            onChange={(c) => onChange("hapticFeedback", c as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
          />
        </div>
      </div>

      <hr className="border-black/5 " />

      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-[var(--accent)] rounded-[10px] flex items-center justify-center shadow-lg overflow-hidden">
             <svg width="18" height="18" viewBox="0 0 30 30" fill="none">
              <polyline 
                points="2,15 8,15 10,8 13,22 16,10 19,18 21,15 28,15" 
                stroke="white" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"
              />
            </svg>
          </div>
          <div className="text-xl tracking-tighter text-[var(--text)] font-bold">
            Calor<span className="text-[var(--accent)]">iq</span>
          </div>
        </div>
        <h3 className="text-lg font-bold mb-4 ml-0.5">Theme</h3>
        <p className="text-[13px] text-[var(--text-muted)] mb-6 ml-0.5">Select your preferred accent color for the application.</p>
        <div className="ml-0.5">
          <AccentColorPicker 
            value={data.accentColor || themeAccent} 
            onChange={(hex) => onChange("accentColor", hex)} 
          />
        </div>
      </div>
    </div>
  );
}

function AccentColorPicker({ 
  value, 
  onChange 
}: Readonly<{ 
  value: string; 
  onChange: (hex: string) => void; 
}>) {
  const { setAccentColor } = useTheme();

  const handleSelect = (hex: string) => {
    onChange(hex);
    // Preview immediately
    setAccentColor(hex);
  };

  return (
    <div className="flex flex-wrap gap-4">
      {BRAND_COLORS.map((color) => {
        const isActive = value === color.hex;
        return (
          <button
            key={color.hex}
            onClick={() => handleSelect(color.hex)}
            className={`group relative flex flex-col items-center gap-3 transition-all ${isActive ? 'scale-105' : 'hover:scale-102'}`}
          >
            <div 
              className={`w-14 h-14 rounded-2xl shadow-lg transition-all duration-300 border-2 ${isActive ? 'border-[var(--text)] ring-4 ring-[var(--accent)]/10' : 'border-transparent group-hover:border-black/10'}`}
              style={{ backgroundColor: color.hex }}
            >
              {isActive && (
                <div className="flex items-center justify-center h-full">
                  <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md" />
                </div>
              )}
            </div>
            <div className="flex flex-col items-center">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)] opacity-40'}`}>
                {color.name}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function FitnessPanel({
  goals,
  profile,
  onChangeGoal,
  onChangeProfile,
}: Readonly<{
  goals: Partial<GoalsState>;
  profile: Partial<UserProfile>;
  onChangeGoal: (f: keyof GoalsState, v: GoalFieldValue) => void;
  onChangeProfile: (f: string, v: ProfileFieldValue) => void;
}>) {
  return (
    <div className="space-y-10">
      <SectionHeading
        title="Fitness & Goals"
        description="Configure your workout schedules and tracking targets."
      />

      <div className="grid grid-cols-1 gap-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="primary-goal"
            className="text-[12px] font-bold uppercase tracking-widest text-(--text-muted)  ml-1"
          >
            Primary Goal
          </label>
          <select
            id="primary-goal"
            value={profile.primaryGoal || ""}
            onChange={(e) => onChangeProfile("primaryGoal", e.target.value)}
            className="h-12 w-full rounded-xl border border-(--border) bg-transparent px-4 text-[15px] font-medium outline-none transition focus:border-(--amber)   text-(--text)"
          >
            <option value="">Select Primary Goal</option>
            <option value="Fat Loss">Fat Loss</option>
            <option value="Muscle Gain">Muscle Gain</option>
            <option value="Endurance">Endurance</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="activity-preference"
            className="text-[12px] font-bold uppercase tracking-widest text-(--text-muted)  ml-1"
          >
            Activity Preference
          </label>
          <select
            id="activity-preference"
            value={profile.activityPreference || ""}
            onChange={(e) =>
              onChangeProfile("activityPreference", e.target.value)
            }
            className="h-12 w-full rounded-xl border border-(--border) bg-transparent px-4 text-[15px] font-medium outline-none transition focus:border-(--amber)   text-(--text)"
          >
            <option value="">Select Activity</option>
            <option value="Gym / Weightlifting">Gym / Weightlifting</option>
            <option value="Home Workouts">Home Workouts</option>
            <option value="Yoga / Pilates">Yoga / Pilates</option>
            <option value="Running / Cardio">Running / Cardio</option>
          </select>
        </div>
      </div>

      <hr className="border-black/5 " />

      <div>
        <h3 className="text-lg font-bold mb-4">Daily Targets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Daily Calorie Goal"
            type="number"
            placeholder="2500"
            value={goals.kcalTarget ?? ""}
            onChange={(v) =>
              onChangeGoal("kcalTarget", Number.parseInt(v) || 0)
            }
          />
          <FormField
            label="Workout Duration (Mins)"
            type="number"
            placeholder="60"
            value={goals.workoutDuration ?? ""}
            onChange={(v) =>
              onChangeGoal("workoutDuration", Number.parseInt(v) || 0)
            }
          />
        </div>
      </div>
    </div>
  );
}

function NutritionPanel({
  goals,
  profile,
  onChangeGoal,
  onChangeProfile,
  onRecalculate,
}: Readonly<{
  goals: Partial<GoalsState>;
  profile: Partial<UserProfile>;
  onChangeGoal: (f: keyof GoalsState, v: GoalFieldValue) => void;
  onChangeProfile: (f: string, v: ProfileFieldValue) => void;
  onRecalculate: () => void;
}>) {
  return (
    <div className="space-y-10">
      <SectionHeading
        title="Nutrition & Diet"
        description="Setup your macros, diet restrictions, and water intake."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Calorie Target (kcal)"
          type="number"
          placeholder="2500"
          value={goals.kcalTarget ?? ""}
          onChange={(v) =>
            onChangeGoal("kcalTarget", Number.parseFloat(v) || null)
          }
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="recalculate-btn" className="text-[12px] font-bold uppercase tracking-widest text-(--text-muted) ml-1">
            Recalculate
          </label>
          <button
            id="recalculate-btn"
            onClick={onRecalculate}
            className="h-12 w-full rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 text-[13px] font-bold uppercase tracking-wider text-amber-600 transition hover:bg-amber-500/10 dark:text-amber-400"
          >
            Update from Profile
          </button>
        </div>
      </div>

      <hr className="border-black/5 " />

      <div>
        <h3 className="text-lg font-bold mb-4">Macronutrient Split</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            label="Protein (g)"
            type="number"
            placeholder="180"
            value={goals.proteinTarget ?? ""}
            onChange={(v) =>
              onChangeGoal("proteinTarget", Number.parseFloat(v) || null)
            }
          />
          <FormField
            label="Carbs (g)"
            type="number"
            placeholder="250"
            value={goals.carbsTarget ?? ""}
            onChange={(v) =>
              onChangeGoal("carbsTarget", Number.parseFloat(v) || null)
            }
          />
          <FormField
            label="Fats (g)"
            type="number"
            placeholder="70"
            value={goals.fatsTarget ?? ""}
            onChange={(v) =>
              onChangeGoal("fatsTarget", Number.parseFloat(v) || null)
            }
          />
        </div>
      </div>

      <hr className="border-black/5 " />

      <div>
        <h3 className="text-lg font-bold mb-4">Preferences</h3>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="dietary-preference"
            className="text-[12px] font-bold uppercase tracking-widest text-(--text-muted)  ml-1"
          >
            Dietary Preference
          </label>
          <select
            id="dietary-preference"
            value={profile.dietaryPreference || ""}
            onChange={(e) =>
              onChangeProfile("dietaryPreference", e.target.value)
            }
            className="h-12 w-full rounded-xl border border-(--border) bg-transparent px-4 text-[15px] font-medium outline-none transition focus:border-(--amber)   text-(--text)"
          >
            <option value="">None (Omnivore)</option>
            <option value="Vegetarian">Vegetarian</option>
            <option value="Vegan">Vegan</option>
            <option value="Keto">Keto</option>
            <option value="Paleo">Paleo</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function NotificationsPanel({
  data,
  onChange,
}: Readonly<{
  data: Partial<UserProfile>;
  onChange: (f: string, v: ProfileFieldValue) => void;
}>) {
  return (
    <div className="space-y-10">
      <SectionHeading
        title="Notifications & Integrations"
        description="Manage app alerts, wearables, and third-party syncing."
      />

      <div>
        <h3 className="text-lg font-bold mb-4">Push Notifications</h3>
        <div className="space-y-2">
          <ToggleField
            label="Workout Reminders"
            description="Get notified to workout based on schedule."
            checked={data.workoutReminders ?? true}
            onChange={(c) => onChange("workoutReminders", c)}
          />
          <ToggleField
            label="Meal Logging"
            description="Reminders to log your breakfast, lunch, and dinner."
            checked={data.mealLogging ?? false}
            onChange={(c) => onChange("mealLogging", c)}
          />
          <ToggleField
            label="Water Check-ins"
            description="Periodic reminders to drink water."
            checked={data.waterCheckIns ?? true}
            onChange={(c) => onChange("waterCheckIns", c)}
          />
        </div>
      </div>

      <hr className="border-black/5 " />

      <div>
        <h3 className="text-lg font-bold mb-4">Integrations</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-(--border) bg-transparent  ">
            <div className="flex items-center gap-3">
              <Smartphone className="text-(--text-muted)" />
              <div>
                <div className="font-bold text-(--text)">
                  Apple Health / Google Fit
                </div>
                <div className="text-[13px] text-(--text-muted)">
                  Sync steps and active energy automatically.
                </div>
              </div>
            </div>
            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-(--surface2) dark:bg-(--surface) dark:text-(--text) dark:hover:bg-zinc-200">
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacyPanel() {
  return (
    <div className="space-y-10">
      <SectionHeading
        title="Privacy & Advanced"
        description="Ensure your account security and control your data."
      />

      <div>
        <h3 className="text-lg font-bold text-rose-500 mb-4">Danger Zone</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-900/10">
            <div>
              <div className="font-bold text-rose-700 dark:text-rose-400">
                Export User Data
              </div>
              <div className="text-[13px] text-rose-600/80 dark:text-rose-400/80">
                Download all your metrics, logs, and profile info as a CSV.
              </div>
            </div>
            <button className="rounded-lg border border-rose-200 bg-(--surface) px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:border-rose-800  dark:hover:bg-rose-900/30">
              Export Data
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-900/10">
            <div>
              <div className="font-bold text-rose-700 dark:text-rose-400">
                Delete Account
              </div>
              <div className="text-[13px] text-rose-600/80 dark:text-rose-400/80">
                Permanently delete your account and all associated data.
              </div>
            </div>
            <button className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
