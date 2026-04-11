"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  BarChart3, 
  MessageSquare, 
  ClipboardList, 
  User, 
  Target, 
  Scale,
  Loader2
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { requestJson } from "@/lib/client-api";

type OnboardingStep = "tutorial" | "profile";

type FormDataMap = {
  age: number | "";
  gender: string;
  height: number | "";
  activityLevel: string;
  primaryGoal: string;
  initialWeight: number | "";
  dietaryPreference: string;
};

interface ProfileStepProps {
  readonly formData: FormDataMap;
  readonly setFormData: (data: FormDataMap) => void;
}

export default function OnboardingPage() {
  const [phase, setPhase] = useState<OnboardingStep>("tutorial");

  if (phase === "tutorial") {
    return <TutorialPhase onComplete={() => setPhase("profile")} />;
  }

  return <ProfilePhase />;
}

// ============================================
// TUTORIAL PHASE COMPONENT
// ============================================
function TutorialPhase({ onComplete }: { readonly onComplete: () => void }) {
  const { update } = useSession();
  const router = useRouter();
  const [tutorialStep, setTutorialStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const tutorialSlides = [
    {
      title: "Real-time Metrics",
      description: "Track your calories, macros, and body measurements with beautiful, high-density charts.",
      icon: <BarChart3 size={48} className="text-[#185fa5]" />,
    },
    {
      title: "AI Fitness Coach",
      description: "Our intelligence engine analyzes your data to provide personalized workout and meal insights.",
      icon: <MessageSquare size={48} className="text-[#0f6e56]" />,
    },
    {
      title: "Simplified Logging",
      description: "Log your activities in seconds. Whether it's a quick workout or a detailed meal, we make it easy.",
      icon: <ClipboardList size={48} className="text-[#534ab7]" />,
    }
  ];

  const handleNextTutorial = () => {
    if (tutorialStep < tutorialSlides.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkipOnboarding = async () => {
    setLoading(true);
    try {
      await requestJson("/api/auth/onboard", {
        method: "POST",
        body: JSON.stringify({
          age: 25,
          gender: "male",
          height: 170,
          activityLevel: "Moderately Active",
          primaryGoal: "Maintenance",
          initialWeight: 70,
          dietaryPreference: "Balanced"
        }),
      });
      await update({ onboarded: true, hasSeenTutorial: true });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Skip failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Onboarding"
      title="Welcome to Caloriq"
      subtitle="Let's take a quick look at how we'll help you reach your goals."
      panelTitle="The Athlete's Platform"
      panelDescription="Caloriq is built for high-performance tracking and intelligent insights."
      panelPoints={[
        "Advanced data visualization",
        "Context-aware AI assistance",
        "Seamless activity logging"
      ]}
      illustration={<div className="flex justify-center p-8 opacity-20"><ShieldCheck size={120} /></div>}
    >
      <div className="min-h-[350px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key="tutorial"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8 py-4"
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="p-6 rounded-3xl bg-auth-surface2/50 backdrop-blur-sm border border-auth-border">
                {tutorialSlides[tutorialStep].icon}
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-auth-text">{tutorialSlides[tutorialStep].title}</h3>
                <p className="text-sm text-auth-text-muted leading-relaxed max-w-[280px]">
                  {tutorialSlides[tutorialStep].description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              {tutorialSlides.map((slide, i) => (
                <div 
                  key={slide.title} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === tutorialStep ? "w-6 bg-[#185fa5]" : "w-1.5 bg-auth-border"}`} 
                />
              ))}
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                disabled={loading}
                onClick={handleSkipOnboarding}
                className="h-11 flex-1 rounded-2xl border border-auth-border text-xs font-bold uppercase tracking-wider text-auth-text-muted hover:bg-auth-surface2 transition-colors disabled:opacity-50"
              >
                Skip All
              </button>
              <button
                disabled={loading}
                onClick={handleNextTutorial}
                className="h-11 flex-[2] rounded-2xl bg-[#185fa5] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#378add] transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {tutorialStep === tutorialSlides.length - 1 ? "Start Setup" : "Next"}
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </AuthShell>
  );
}

// ============================================
// PROFILE PHASE COMPONENT
// ============================================
function ProfilePhase() {
  const { update } = useSession();
  const router = useRouter();
  const [profileStep, setProfileStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormDataMap>({
    age: "",
    gender: "male",
    height: "",
    activityLevel: "Moderately Active",
    primaryGoal: "Maintenance",
    initialWeight: "",
    dietaryPreference: "Balanced"
  });

  const handleFinishOnboarding = async () => {
    if (!formData.age || !formData.height || !formData.initialWeight) {
      alert("Please enter values for Age, Height, and Weight.");
      return;
    }
    setLoading(true);
    try {
      await requestJson("/api/auth/onboard", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      // Synchronize the session locally to clear the onboarding gate
      await update({ onboarded: true, hasSeenTutorial: true });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Onboarding failed:", error);
      alert("Failed to save your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  let actionBtnClass = "bg-[#534ab7] hover:bg-[#6c63d6]";
  if (profileStep === 0) actionBtnClass = "bg-[#185fa5] hover:bg-[#378add]";
  else if (profileStep === 1) actionBtnClass = "bg-[#0f6e56] hover:bg-[#1a8a6d]";

  let actionBtnContent = <>Next <ChevronRight size={16} /></>;
  if (loading) {
    actionBtnContent = <><Loader2 size={18} className="animate-spin" /> Synchronizing...</>;
  } else if (profileStep === 2) {
    actionBtnContent = <><ShieldCheck size={18} /> Complete Setup</>;
  }

  const handleNextAction = profileStep === 2 ? handleFinishOnboarding : () => setProfileStep(profileStep + 1);

  return (
    <AuthShell
      badge="Onboarding"
      title="Complete Your Profile"
      subtitle="Help us personalize your fitness and nutrition targets."
      panelTitle="Intelligent Personalization"
      panelDescription="We use the Miffin-St Jeor equation to calculate your baseline metabolic targets."
      panelPoints={[
        "Personalized BMR & TDEE calculation",
        "Daily macro-nutrient targets",
        "Weekly progress analysis"
      ]}
      illustration={<div className="flex justify-center p-8 opacity-20"><ShieldCheck size={120} /></div>}
    >
      <div className="min-h-[350px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 py-2"
          >
            {profileStep === 0 && <BioDataStep formData={formData} setFormData={setFormData} />}
            {profileStep === 1 && <ObjectivesStep formData={formData} setFormData={setFormData} />}
            {profileStep === 2 && <BaselineStep formData={formData} setFormData={setFormData} />}

            <div className="flex items-center gap-3 pt-6">
              <button
                disabled={loading}
                onClick={() => setProfileStep(Math.max(0, profileStep - 1))}
                className={`h-11 flex-1 rounded-2xl border border-auth-border text-xs font-bold uppercase tracking-wider text-auth-text-muted hover:bg-auth-surface2 transition-colors flex items-center justify-center gap-2 ${
                  profileStep === 0 ? "opacity-0 pointer-events-none" : ""
                }`}
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <button
                disabled={loading}
                onClick={handleNextAction}
                className={`h-11 flex-[2] rounded-2xl text-xs font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 shadow-lg ${actionBtnClass}`}
              >
                {actionBtnContent}
              </button>
            </div>
            
            <div className="pt-4 flex justify-center">
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="text-[11px] font-bold text-auth-text-muted hover:text-auth-text transition-colors underline underline-offset-4"
              >
                Sign Out / Wrong Account?
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </AuthShell>
  );
}

// ============================================
// PROFILE SUB-COMPONENTS
// ============================================
function BioDataStep({ formData, setFormData }: ProfileStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[#185fa5] font-bold text-sm mb-4">
        <User size={18} />
        <span>Step 1: Bio-Data</span>
      </div>
      
      <div className="space-y-3">
        <div className="space-y-1.5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-auth-text-muted ml-1 mb-1.5">Gender</span>
          <div className="grid grid-cols-2 gap-2">
            {["male", "female"].map(g => (
              <button
                key={g}
                onClick={() => setFormData({ ...formData, gender: g })}
                className={`h-10 rounded-xl border-2 capitalize text-sm font-medium transition-all ${
                  formData.gender === g 
                    ? "border-[#185fa5] bg-[#185fa5]/5 text-[#185fa5]" 
                    : "border-auth-input-border bg-auth-input-bg text-auth-text-muted"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="ageInput" className="text-[11px] font-bold uppercase tracking-wider text-auth-text-muted ml-1">Age</label>
            <input
              id="ageInput"
              type="number"
              value={formData.age}
              placeholder="Ex: 25"
              onChange={(e) => setFormData({ ...formData, age: e.target.value ? Number(e.target.value) : "" })}
              className="h-10 w-full rounded-xl border-2 border-auth-input-border bg-auth-input-bg px-4 text-sm font-medium text-auth-input-text focus:border-[#185fa5] outline-none transition"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="heightInput" className="text-[11px] font-bold uppercase tracking-wider text-auth-text-muted ml-1">Height (cm)</label>
            <input
              id="heightInput"
              type="number"
              value={formData.height}
              placeholder="Ex: 175"
              onChange={(e) => setFormData({ ...formData, height: e.target.value ? Number(e.target.value) : "" })}
              className="h-10 w-full rounded-xl border-2 border-auth-input-border bg-auth-input-bg px-4 text-sm font-medium text-auth-input-text focus:border-[#185fa5] outline-none transition"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="activityLevelSelect" className="text-[11px] font-bold uppercase tracking-wider text-auth-text-muted ml-1">Activity Level</label>
          <select
            id="activityLevelSelect"
            value={formData.activityLevel}
            onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value })}
            className="h-10 w-full rounded-xl border-2 border-auth-input-border bg-auth-input-bg px-4 text-sm font-medium text-auth-input-text focus:border-[#185fa5] outline-none transition appearance-none"
          >
            <option>Sedentary</option>
            <option>Lightly Active</option>
            <option>Moderately Active</option>
            <option>Very Active</option>
            <option>Extra Active</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ObjectivesStep({ formData, setFormData }: ProfileStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[#0f6e56] font-bold text-sm mb-4">
        <Target size={18} />
        <span>Step 2: Objectives</span>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-auth-text-muted ml-1 mb-1.5">Primary Goal</span>
          <div className="grid grid-cols-1 gap-2">
            {["Weight Loss", "Maintenance", "Weight Gain"].map(goal => (
              <button
                key={goal}
                onClick={() => setFormData({ ...formData, primaryGoal: goal })}
                className={`h-10 rounded-xl border-2 text-sm font-medium transition-all text-left px-4 ${
                  formData.primaryGoal === goal 
                    ? "border-[#0f6e56] bg-[#0f6e56]/5 text-[#0f6e56]" 
                    : "border-auth-input-border bg-auth-input-bg text-auth-text-muted"
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="dietaryFocusSelect" className="text-[11px] font-bold uppercase tracking-wider text-auth-text-muted ml-1">Dietary Focus</label>
          <select
            id="dietaryFocusSelect"
            value={formData.dietaryPreference}
            onChange={(e) => setFormData({ ...formData, dietaryPreference: e.target.value })}
            className="h-10 w-full rounded-xl border-2 border-auth-input-border bg-auth-input-bg px-4 text-sm font-medium text-auth-input-text focus:border-[#0f6e56] outline-none transition appearance-none"
          >
            <option>Balanced</option>
            <option>High Protein</option>
            <option>Low Carb</option>
            <option>Keto</option>
            <option>Vegan</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function BaselineStep({ formData, setFormData }: ProfileStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[#534ab7] font-bold text-sm mb-4">
        <Scale size={18} />
        <span>Step 3: Baseline</span>
      </div>

      <div className="flex flex-col items-center justify-center space-y-6 py-6">
        <div className="space-y-2 text-center">
          <label htmlFor="weightInput" className="block text-sm font-bold text-auth-text">Enter Current Weight</label>
          <p className="text-[11px] text-auth-text-muted max-w-[240px] mx-auto">We&apos;ll use this as your starting reference point for metrics.</p>
        </div>
        
        <div className="relative flex items-center">
          <input
            id="weightInput"
            type="number"
            value={formData.initialWeight}
            placeholder="70"
            onChange={(e) => setFormData({ ...formData, initialWeight: e.target.value ? Number(e.target.value) : "" })}
            className="h-16 w-32 rounded-3xl border-4 border-[#534ab7] bg-auth-input-bg text-center text-2xl font-black text-auth-input-text outline-none shadow-xl"
          />
          <span className="absolute -right-10 font-bold text-auth-text-muted uppercase tracking-tighter">kg</span>
        </div>
      </div>
    </div>
  );
}
