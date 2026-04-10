"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
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

type OnboardingStep = 'tutorial' | 'profile';

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [phase, setPhase] = useState<OnboardingStep>('tutorial');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [profileStep, setProfileStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Profile Form State
  const [formData, setFormData] = useState({
    age: 25,
    gender: "male",
    height: 175,
    activityLevel: "Moderate",
    primaryGoal: "Maintenance",
    initialWeight: 75,
    dietaryPreference: "Balanced"
  });

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
      setPhase('profile');
    }
  };

  const handleSkipTutorial = () => {
    setPhase('profile');
  };

  const handleFinishOnboarding = async () => {
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

  return (
    <AuthShell
      badge="Onboarding"
      title={phase === 'tutorial' ? "Welcome to Caloriq" : "Complete Your Profile"}
      subtitle={phase === 'tutorial' ? "Let's take a quick look at how we'll help you reach your goals." : "Help us personalize your fitness and nutrition targets."}
      panelTitle={phase === 'tutorial' ? "The Athlete's Platform" : "Intelligent Personalization"}
      panelDescription={phase === 'tutorial' ? "Caloriq is built for high-performance tracking and intelligent insights." : "We use the Miffin-St Jeor equation to calculate your baseline metabolic targets."}
      panelPoints={phase === 'tutorial' ? [
        "Advanced data visualization",
        "Context-aware AI assistance",
        "Seamless activity logging"
      ] : [
        "Personalized BMR & TDEE calculation",
        "Daily macro-nutrient targets",
        "Weekly progress analysis"
      ]}
      illustration={<div className="flex justify-center p-8 opacity-20"><ShieldCheck size={120} /></div>}
    >
      <div className="min-h-[350px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {phase === 'tutorial' ? (
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
                {tutorialSlides.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === tutorialStep ? 'w-6 bg-[#185fa5]' : 'w-1.5 bg-auth-border'}`} 
                  />
                ))}
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleSkipTutorial}
                  className="h-11 flex-1 rounded-2xl border border-auth-border text-xs font-bold uppercase tracking-wider text-auth-text-muted hover:bg-auth-surface2 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleNextTutorial}
                  className="h-11 flex-[2] rounded-2xl bg-[#185fa5] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#378add] transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  {tutorialStep === tutorialSlides.length - 1 ? "Start Setup" : "Next"}
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 py-2"
            >
              {profileStep === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#185fa5] font-bold text-sm mb-4">
                    <User size={18} />
                    <span>Step 1: Bio-Data</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-auth-text-muted ml-1">Gender</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['male', 'female'].map(g => (
                          <button
                            key={g}
                            onClick={() => setFormData({ ...formData, gender: g })}
                            className={`h-10 rounded-xl border-2 capitalize text-sm font-medium transition-all ${
                              formData.gender === g 
                                ? 'border-[#185fa5] bg-[#185fa5]/5 text-[#185fa5]' 
                                : 'border-auth-input-border bg-auth-input-bg text-auth-text-muted'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-auth-text-muted ml-1">Age</label>
                        <input
                          type="number"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                          className="h-10 w-full rounded-xl border-2 border-auth-input-border bg-auth-input-bg px-4 text-sm font-medium text-auth-input-text focus:border-[#185fa5] outline-none transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-auth-text-muted ml-1">Height (cm)</label>
                        <input
                          type="number"
                          value={formData.height}
                          onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                          className="h-10 w-full rounded-xl border-2 border-auth-input-border bg-auth-input-bg px-4 text-sm font-medium text-auth-input-text focus:border-[#185fa5] outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-auth-text-muted ml-1">Activity Level</label>
                      <select
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
              )}

              {profileStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#0f6e56] font-bold text-sm mb-4">
                    <Target size={18} />
                    <span>Step 2: Objectives</span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-auth-text-muted ml-1">Primary Goal</label>
                      <div className="grid grid-cols-1 gap-2">
                        {['Weight Loss', 'Maintenance', 'Weight Gain'].map(goal => (
                          <button
                            key={goal}
                            onClick={() => setFormData({ ...formData, primaryGoal: goal })}
                            className={`h-10 rounded-xl border-2 text-sm font-medium transition-all text-left px-4 ${
                              formData.primaryGoal === goal 
                                ? 'border-[#0f6e56] bg-[#0f6e56]/5 text-[#0f6e56]' 
                                : 'border-auth-input-border bg-auth-input-bg text-auth-text-muted'
                            }`}
                          >
                            {goal}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-auth-text-muted ml-1">Dietary Focus</label>
                      <select
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
              )}

              {profileStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#534ab7] font-bold text-sm mb-4">
                    <Scale size={18} />
                    <span>Step 3: Baseline</span>
                  </div>

                  <div className="flex flex-col items-center justify-center space-y-6 py-6">
                    <div className="space-y-2 text-center">
                      <h4 className="text-sm font-bold text-auth-text">Enter Current Weight</h4>
                      <p className="text-[11px] text-auth-text-muted max-w-[240px]">We'll use this as your starting reference point for metrics.</p>
                    </div>
                    
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        value={formData.initialWeight}
                        onChange={(e) => setFormData({ ...formData, initialWeight: Number(e.target.value) })}
                        className="h-16 w-32 rounded-3xl border-4 border-[#534ab7] bg-auth-input-bg text-center text-2xl font-black text-auth-input-text outline-none shadow-xl"
                      />
                      <span className="absolute -right-10 font-bold text-auth-text-muted uppercase tracking-tighter">kg</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-6">
                <button
                  disabled={loading}
                  onClick={() => setProfileStep(Math.max(0, profileStep - 1))}
                  className={`h-11 flex-1 rounded-2xl border border-auth-border text-xs font-bold uppercase tracking-wider text-auth-text-muted hover:bg-auth-surface2 transition-colors flex items-center justify-center gap-2 ${
                    profileStep === 0 ? 'opacity-0 pointer-events-none' : ''
                  }`}
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button
                  disabled={loading}
                  onClick={profileStep === 2 ? handleFinishOnboarding : () => setProfileStep(profileStep + 1)}
                  className={`h-11 flex-[2] rounded-2xl text-xs font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 shadow-lg ${
                    profileStep === 0 ? 'bg-[#185fa5] hover:bg-[#378add]' :
                    profileStep === 1 ? 'bg-[#0f6e56] hover:bg-[#1a8a6d]' :
                    'bg-[#534ab7] hover:bg-[#6c63d6]'
                  }`}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : (profileStep === 2 ? <ShieldCheck size={18} /> : null)}
                  {loading ? "Synchronizing..." : (profileStep === 2 ? "Complete Setup" : "Next")}
                  {!loading && profileStep < 2 && <ChevronRight size={16} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthShell>
  );
}
