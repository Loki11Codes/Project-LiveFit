"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  UtensilsCrossed, 
  Beef, 
  Wheat, 
  Droplets,
  Zap,
  Clock,
  Activity,
  ShoppingCart
} from "lucide-react";
import { requestJson } from "@/lib/client-api";

interface MealPlanEntry {
  id: string;
  dayIndex: number;
  mealType: string;
  title: string;
  kcal?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  notes?: string;
}

interface MealPlan {
  id: string;
  name?: string;
  weekStarting: string;
  entries: MealPlanEntry[];
}

export default function MealPlanningTab() {
  const [activePlan, setActivePlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); // Mon=0, Sun=6

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    setIsLoading(true);
    try {
      const data = await requestJson<MealPlan>("/api/meal-plans");
      if (data) setActivePlan(data);
    } catch (err) {
      console.error("Failed to fetch plan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = activePlan?.entries.filter(e => e.dayIndex === selectedDay) || [];

  let tabContent;
  if (isLoading) {
    tabContent = (
      <div className="h-full flex items-center justify-center">
        <Activity className="w-8 h-8 text-[var(--accent)] animate-pulse" />
      </div>
    );
  } else if (activePlan) {
    tabContent = (
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <AnimatePresence mode="popLayout">
          {filteredEntries.length > 0 ? (
            filteredEntries.map((meal, mIdx) => (
              <motion.div
                key={meal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: mIdx * 0.05 }}
                className="glass-premium rounded-[var(--radius-lg)] p-5 border border-black/5 flex flex-col gap-4 relative overflow-hidden group"
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-black/5 flex items-center justify-center">
                      <UtensilsCrossed className="w-5 h-5 opacity-40" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-[var(--accent)] tracking-widest leading-none mb-1">{meal.mealType}</span>
                      <h3 className="text-xl font-black tracking-tight">{meal.title}</h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-xl font-black italic">{meal.kcal || "--"}</span>
                      <span className="text-[8px] font-black uppercase opacity-30">Kcal Total</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 relative z-10">
                  <MacroItem icon={Beef} color="text-[var(--green)]" label="Protein" value={meal.protein} unit="g" />
                  <MacroItem icon={Wheat} color="text-[var(--amber)]" label="Carbs" value={meal.carbs} unit="g" />
                  <MacroItem icon={Droplets} color="text-[#d4a23a]" label="Fats" value={meal.fats} unit="g" />
                </div>

                {meal.notes && (
                  <div className="pt-3 border-t border-black/5">
                    <p className="text-xs font-medium opacity-60 leading-relaxed italic">&quot;{meal.notes}&quot;</p>
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-black/5 flex items-center justify-center">
                <Clock className="w-10 h-10 opacity-10" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-2 opacity-40">No meals planned for {days[selectedDay]}</h3>
                <p className="text-sm font-medium opacity-30">Tap &quot;Generate with AI&quot; to build a schedule.</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  } else {
    tabContent = (
      <div className="h-full flex flex-col items-center justify-center text-center px-10 gap-6">
        <div className="w-24 h-24 rounded-3xl bg-[var(--accent)]/5 border-2 border-dashed border-[var(--accent)]/20 flex items-center justify-center animate-pulse">
          <Zap className="w-10 h-10 text-[var(--accent)]" />
        </div>
        <div className="max-w-md">
          <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-4">You don&apos;t have a meal plan yet</h3>
          <p className="text-[var(--foreground-muted)] font-medium leading-relaxed mb-8">
            Your AI coach can generate a structured weekly schedule mapped exactly to your macros and dietary preferences.
          </p>
          <button 
            className="px-8 py-4 bg-[var(--accent)] text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-[var(--accent)]/40 hover:scale-105 active:scale-95 transition-all"
            onClick={() => globalThis.dispatchEvent(new CustomEvent('ai-chat-prompt', { detail: 'Please generate a structured weekly meal plan for me based on my current goals.' }))}
          >
            Create Strategy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] text-[var(--text)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-[var(--border)]">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black tracking-tight italic uppercase">Weekly Meal Plan</h2>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">
              {activePlan ? `Week of ${new Date(activePlan.weekStarting).toLocaleDateString()}` : "No active plan"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-2 px-4 py-2.5 bg-black/5 hover:bg-black/10 text-[var(--foreground)] rounded-[var(--radius-md)] border border-black/5 transition-all text-[10px] font-black uppercase tracking-widest"
            onClick={() => {
              if (!activePlan) return;
              const date = new Date(activePlan.weekStarting).toLocaleDateString();
              globalThis.dispatchEvent(new CustomEvent('ai-chat-prompt', { 
                detail: `I have a meal plan for the week of ${date}. Please generate a consolidated, categorized shopping list for all these meals, organized by supermarket aisle.` 
              }));
            }}
            disabled={!activePlan}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Shopping List</span>
          </button>

          <button 
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-[var(--radius-md)] shadow-lg shadow-[var(--accent)]/30 hover:scale-105 active:scale-95 transition-all text-sm font-black uppercase tracking-widest"
            onClick={() => globalThis.dispatchEvent(new CustomEvent('ai-chat-prompt', { detail: 'Please generate a structured weekly meal plan for me based on my current goals.' }))}
          >
            <Zap className="w-4 h-4 fill-white" />
            Generate with AI
          </button>
        </div>
      </div>

      {/* Day Selector */}
      <div className="px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-[var(--border)] bg-black/[0.02]">
        {days.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDay(idx)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              selectedDay === idx 
                ? "bg-[var(--accent)] text-white shadow-md" 
                : "bg-black/5 text-[var(--foreground-muted)] hover:bg-black/10"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 content-scroll">
        {tabContent}
      </div>
    </div>
  );
}

interface MacroItemProps {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value?: number;
  unit: string;
}

function MacroItem({ icon: Icon, color, label, value, unit }: Readonly<MacroItemProps>) {
  return (
    <div className="bg-black/5 rounded-2xl p-3 flex flex-col gap-1 border border-transparent hover:border-black/5 transition-all">
      <div className="flex items-center gap-1.5 opacity-40">
        <Icon className={`w-3 h-3 ${color}`} />
        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-sm font-black">{Math.round(value ?? 0)}</span>
        <span className="text-[8px] font-bold opacity-30">{unit}</span>
      </div>
    </div>
  );
}
