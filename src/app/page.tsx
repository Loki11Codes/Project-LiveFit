"use client";

import React, { startTransition, useEffect, useState, useCallback } from "react";
import type { BodyMeasurement } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Chat from "@/components/Chat";
import LogTab from "@/components/Tabs/LogTab";
import HistoryTab from "@/components/Tabs/HistoryTab";
import BodyTab from "@/components/Tabs/BodyTab";
import ProfileTab from "@/components/Tabs/ProfileTab";
import MealPlanningTab from "@/components/Tabs/MealPlanningTab";
import { RoutinesTab } from "@/components/RoutinesTab";
import { WorkoutSession } from "../components/WorkoutSession";
import { AchievementOverlay } from "@/components/Shared/AchievementOverlay";
import type { AchievementBadge } from "@/lib/achievements";
import {
  buildHistoryRows,
  buildDayTypeMap,
  getLatestSleepLog,
  getLocalDateKey,
  getProteinTarget,
  getTodayFoodLogs,
  getTrackedDayCount,
  parseTab,
  sumNutrition,
  toMeasurementForm,
  toMeasurementPayload,
} from "@/lib/dashboard";
import { getClientErrorMessage, requestJson } from "@/lib/client-api";
import toast from "react-hot-toast";
import {
  DEFAULT_GOALS,
  EMPTY_ANALYTICS,
  EMPTY_DAY_TYPES_BY_DAY,
  EMPTY_LOGS,
  EMPTY_MEASUREMENT_FORM,
  type AnalyticsResponse,
  type ActiveWorkoutSession,
  type DayTypeEntryRecord,
  type DashboardState,
  type DayType,
  type GoalsState,
  type LogsResponse,
  type MeasurementForm,
  type TabId,
  type AIInsight,
  type ParsedLogEnvelope,
} from "@/lib/types";

const INITIAL_DASHBOARD_STATE: DashboardState = {
  logs: EMPTY_LOGS,
  latestMeasurement: null,
  measurements: EMPTY_MEASUREMENT_FORM,
  goals: DEFAULT_GOALS,
  profile: null,
  analytics: EMPTY_ANALYTICS,
  dayType: "Rest",
  dayTypesByDay: EMPTY_DAY_TYPES_BY_DAY,
  activeWorkout: null,
  aiInsights: [],
};

export default function Home() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const initialTab = parseTab(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [dashboard, setDashboard] = useState<DashboardState>(
    INITIAL_DASHBOARD_STATE,
  );
  const [chatDraft, setChatDraft] = useState<string | null>(() => searchParams.get("msg"));
  const [chatInput, setChatInput] = useState("");
  const [newAchievements, setNewAchievements] = useState<AchievementBadge[]>([]);

  const handleStartWorkout = useCallback((routine: { name: string; exercises: unknown[] }) => {
    const workoutSession = {
      name: routine.name,
      startTime: Date.now(),
      exercises: (routine.exercises || []).map((e: unknown) => {
        const ex = e as Record<string, unknown>;
        return {
          id: crypto.randomUUID(),
          exerciseId: (ex.exerciseId as string) || (ex.id as string),
          name: ((ex.exercise as Record<string, unknown>)?.name as string) || (ex.name as string), 
          sets: ex.sets
            ? (ex.sets as unknown[]).map((s: unknown) => {
                const set = s as Record<string, unknown>;
                return {
                  id: (set.id as string) || crypto.randomUUID(),
                  weight: (typeof set.weight === "string" || typeof set.weight === "number") ? String(set.weight) : "",
                  reps: (typeof set.reps === "string" || typeof set.reps === "number") ? String(set.reps) : "",
                  isCompleted: false,
                };
              })
            : Array.from({ length: Number(ex.targetSets) || 3 }).map(() => ({
                id: crypto.randomUUID(),
                weight: "",
                reps: (ex.targetReps as string) || "",
                isCompleted: false,
              })),
        };
      }),
    };
    setDashboard((prev) => ({ ...prev, activeWorkout: workoutSession }));
    // Don't switch tab automatically, WorkoutSession will be an overlay
  }, [setDashboard]);

  const handleStartWorkoutById = useCallback(async (id: string, name?: string) => {
    try {
      const res = await fetch(`/api/routines?id=${id}`);
      if (res.ok) {
        const routine = await res.json();
        handleStartWorkout(routine);
        return;
      }
    } catch (err) {
      console.error("Failed to start routine by ID", err);
    }
    // Fallback
    handleStartWorkout({ name: name || "Routine", exercises: [] });
  }, [handleStartWorkout]);

  const fetchRawDashboardData = useCallback(async (): Promise<Omit<DashboardState, "activeWorkout" | "measurements">> => {
    const [
      logs,
      latestMeasurementResponse,
      goalsResponse,
      analyticsResponse,
      dayTypesResponse,
      profileResponse,
    ] = await Promise.all([
      requestJson<LogsResponse>("/api/logs"),
      requestJson<unknown>("/api/measurements"),
      requestJson<unknown>("/api/profile?type=goals"),
      requestJson<unknown>("/api/analytics"),
      requestJson<unknown>("/api/day-types"),
      requestJson<unknown>("/api/profile"),
    ]);

    const latestMeasurement = isBodyMeasurement(latestMeasurementResponse)
      ? latestMeasurementResponse
      : null;

    return {
      logs: logs || EMPTY_LOGS,
      latestMeasurement,
      goals: isGoalsState(goalsResponse) ? goalsResponse : DEFAULT_GOALS,
      analytics: isAnalyticsResponse(analyticsResponse)
        ? analyticsResponse
        : EMPTY_ANALYTICS,
      dayType: ((profileResponse as Record<string, unknown>)?.dayType as DayType) || "Rest",
      dayTypesByDay: isDayTypeEntryRecordArray(dayTypesResponse)
        ? buildDayTypeMap(dayTypesResponse)
        : EMPTY_DAY_TYPES_BY_DAY,
      profile: isUserProfile(profileResponse) ? profileResponse : null,
      aiInsights: [],
    };
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!session?.user?.id) {
      return;
    }

    try {
      const data = await fetchRawDashboardData();
      startTransition(() => {
        setDashboard((prev) => ({
          ...prev,
          ...data,
          measurements: toMeasurementForm(data.latestMeasurement),
        }));
      });
    } catch (error) {
      const message = getClientErrorMessage(error);
      console.error("Failed to refresh dashboard data:", message);
      toast.error(message);
    }
  }, [session?.user?.id, fetchRawDashboardData]);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    router.push(`/?tab=${tab}`, { scroll: false });
  }, [router]);

  const handleFinishWorkout = useCallback((session: ActiveWorkoutSession) => {
    const durationMinutes = Math.floor(
      (Date.now() - session.startTime) / 60000,
    );
    const completedExercises = session.exercises.filter((ex) =>
      ex.sets.some((s) => s.isCompleted),
    );

    if (completedExercises.length === 0) {
      setDashboard((prev) => ({ ...prev, activeWorkout: null }));
      return;
    }

    let totalVolume = 0;
    completedExercises.forEach((ex) => {
      ex.sets
        .filter((s) => s.isCompleted)
        .forEach((s) => {
          totalVolume += (Number.parseFloat(s.weight) || 0) * (Number.parseInt(s.reps, 10) || 0);
        });
    });

    const workoutPayload = {
      category: "workout",
      data: {
        focus: session.name,
        date: new Date().toISOString(),
        volume: totalVolume,
        exercises: completedExercises.map((ex, idx: number) => ({
          name: ex.name,
          order: idx,
          sets: ex.sets
            .filter((s) => s.isCompleted)
            .map((s, sIdx: number) => ({
              setNumber: sIdx + 1,
              weight: Number.parseFloat(s.weight) || 0,
              reps: Number.parseInt(s.reps, 10) || 0,
            })),
        })),
      },
    };

    // Save directly instead of waiting for AI to echo it
    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([workoutPayload]),
    })
      .then(res => res.json())
      .then((data) => {
        if (data.achievements && data.achievements.length > 0) {
          setNewAchievements(data.achievements);
        }
        refreshDashboard();
      })
      .catch((err) => {
        console.error("Failed to directly save workout log", err);
      });

    let summaryText = `I finished my "${session.name}" workout! It took me ${durationMinutes} minutes.\n\nSummary:\n`;
    completedExercises.forEach((ex) => {
      const sets = ex.sets.filter((s) => s.isCompleted);
      const setDetails = sets.map(s => `${s.weight}kg x ${s.reps}`).join(", ");
      summaryText += `- ${ex.name}: ${sets.length} sets completed (${setDetails})\n`;
    });

    setChatDraft(summaryText);
    setDashboard((prev) => ({ ...prev, activeWorkout: null }));
    handleTabChange("chat");
  }, [refreshDashboard, handleTabChange]);

  const handleDiscardWorkout = () => {
    if (confirm("Are you sure you want to discard your workout?")) {
      setDashboard((prev) => ({ ...prev, activeWorkout: null }));
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    if (!confirm("Delete this workout log? This can't be undone.")) return;
    // Optimistic remove from UI
    setDashboard((prev) => ({
      ...prev,
      logs: { ...prev.logs, workouts: prev.logs.workouts.filter((w) => w.id !== id) },
    }));
    try {
      await fetch("/api/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "workout", id }),
      });
    } catch (err) {
      console.error("Failed to delete workout", err);
      void refreshDashboard();
    }
  };

  const handleDeleteFood = async (id: string) => {
    if (!confirm("Delete this food entry?")) return;
    setDashboard((prev) => ({
      ...prev,
      logs: { ...prev.logs, food: prev.logs.food.filter((f) => f.id !== id) },
    }));
    try {
      await fetch("/api/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "food", id }),
      });
    } catch (err) {
      console.error("Failed to delete food", err);
      void refreshDashboard();
    }
  };

  const handleDeleteSleep = async (id: string) => {
    if (!confirm("Delete this sleep entry?")) return;
    setDashboard((prev) => ({
      ...prev,
      logs: { ...prev.logs, sleep: prev.logs.sleep.filter((s) => s.id !== id) },
    }));
    try {
      await fetch("/api/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "sleep", id }),
      });
    } catch (err) {
      console.error("Failed to delete sleep", err);
      void refreshDashboard();
    }
  };
  const { nutrition, latestSleep, trackedDayCount, hasLoggedWorkoutToday, history } = React.useMemo(() => {
    const food = getTodayFoodLogs(dashboard.logs.food);
    const nut = sumNutrition(food);
    const sleep = getLatestSleepLog(dashboard.logs.sleep);
    const count = getTrackedDayCount(dashboard.logs);
    const workedOut = (dashboard.logs.workouts || []).some(w => getLocalDateKey(w.time) === getLocalDateKey(new Date()));
    const rows = buildHistoryRows(dashboard.logs, dashboard.goals, dashboard.dayTypesByDay);
    
    return {
      nutrition: nut,
      latestSleep: sleep,
      trackedDayCount: count,
      hasLoggedWorkoutToday: workedOut,
      history: rows,
    };
  }, [dashboard.logs, dashboard.goals, dashboard.dayTypesByDay]);


  const updateMeasurements: React.Dispatch<
    React.SetStateAction<MeasurementForm>
  > = (value) => {
    setDashboard((current) => ({
      ...current,
      measurements:
        typeof value === "function" ? value(current.measurements) : value,
    }));
  };

  const handleDayTypeChange = (nextDayType: DayType) => {
    const dayKey = getLocalDateKey(new Date());
    const previousDayType = dashboard.dayType;

    const updateLocalState = (type: DayType) => {
      setDashboard((current) => ({
        ...current,
        dayType: type,
        dayTypesByDay: {
          ...current.dayTypesByDay,
          [dayKey]: type,
        },
      }));
    };

    startTransition(() => updateLocalState(nextDayType));

    void persistDayType(dayKey, nextDayType).catch((error) => {
      const message = getClientErrorMessage(error);
      console.error("Failed to persist day type:", message);
      toast.error(message);
      startTransition(() => updateLocalState(previousDayType));
    });
  };

  const handleLogParsed = useCallback(async (envelopes?: ParsedLogEnvelope[], hasData?: boolean) => {
    

    if (hasData && (!envelopes || envelopes.length === 0)) {
      console.warn("[PARSER] Data blocks were detected but failed to parse correctly.");
    }

    if (envelopes && envelopes.length > 0) {
      // 1. Identify and persist log data to backend
      const persistableCategories = new Set([
        "food", "workout", "sleep", "measurement", "profile", 
        "goals", "dayType", "delete", "knowledge", "meal_plan"
      ]);
      
      const logsToPersist = envelopes.filter(e => 
        e.category && 
        persistableCategories.has(e.category) && 
        !(e.category === "workout" && e.action === "start")
      );

      if (logsToPersist.length > 0) {
        void fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(logsToPersist),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.achievements?.length > 0) {
              setNewAchievements(data.achievements);
            }
            void refreshDashboard();
          })
          .catch((err) => {
            console.error("Failed to save AI logs:", err);
          });
      }

      // 2. Handle non-persistent UI updates
      const insights = envelopes
        .filter((e) => e.category === "insight" && e.data)
        .map((e) => ({
          ...e.data,
          id: crypto.randomUUID(),
        } as AIInsight));

      if (insights.length > 0) {
        setDashboard((prev) => ({
          ...prev,
          aiInsights: [...insights, ...prev.aiInsights].slice(0, 3),
        }));
      }

      const workoutAction = envelopes.find(e => e.category === 'workout' && e.action === 'start');
      if (workoutAction) {
        const name = (workoutAction.name as string) || (workoutAction.focus as string) || (workoutAction.data?.name as string) || "Fresh Workout";
        if (workoutAction.routineId) {
            void handleStartWorkoutById(workoutAction.routineId, name);
        } else {
           handleStartWorkout({ name, exercises: [] });
        }
      }
    }

    // Secondary refresh to ensure consistency with backend processing time
    setTimeout(() => {
      void refreshDashboard();
    }, 1000);
  }, [refreshDashboard, handleStartWorkoutById, handleStartWorkout]);

  useEffect(() => {
    const handleAiPrompt = (e: Event) => {
      const prompt = (e as CustomEvent<string>).detail;
      if (prompt) {
        setChatInput(prompt);
        setActiveTab("chat");
        // We'll let the Chat component handle the initial message if needed, 
        // or just set the input and switch tab.
      }
    };
    globalThis.addEventListener('ai-chat-prompt', handleAiPrompt);
    return () => globalThis.removeEventListener('ai-chat-prompt', handleAiPrompt);
  }, []);

  function handleUpdateWorkout(updated: ActiveWorkoutSession) {
    setDashboard((prev) => ({ ...prev, activeWorkout: updated }));
  }


  useEffect(() => {
    let cancelled = false;

    if (!session?.user?.id) {
      if (!cancelled) {
        startTransition(() => {
          setDashboard(INITIAL_DASHBOARD_STATE);
        });
      }
      return () => {
        cancelled = true;
      };
    }

    const applyData = (data: Omit<DashboardState, "activeWorkout" | "measurements">) => {
      if (cancelled) return;
      const updateFn = (prev: DashboardState) => ({
        ...prev,
        ...data,
      });
      startTransition(() => {
        setDashboard(updateFn);
      });
    };

    void fetchRawDashboardData()
      .then(applyData)
      .catch((error) => {
        const message = getClientErrorMessage(error);
        console.error("Failed to fetch dashboard data:", message);
        toast.error(`Unable to load dashboard data: ${message}`);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, fetchRawDashboardData]);

  // Sync internal tab state with URL changes (e.g. back button)
  useEffect(() => {
    const tabFromUrl = parseTab(searchParams.get("tab"));
    if (tabFromUrl !== activeTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    const saved = localStorage.getItem("active_workout");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDashboard(prev => ({ ...prev, activeWorkout: parsed }));
      } catch (e) {
        console.warn("Failed to load active workout from storage", e);
      }
    }
  }, []);

  useEffect(() => {
    if (dashboard.activeWorkout) {
      localStorage.setItem("active_workout", JSON.stringify(dashboard.activeWorkout));
    } else {
      localStorage.removeItem("active_workout");
    }
  }, [dashboard.activeWorkout]);


  const handleSaveMeasurements = async () => {
    try {
      await requestJson(
        "/api/measurements",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toMeasurementPayload(dashboard.measurements)),
        },
      );
      toast.success("Measurements saved.");
      await refreshDashboard();
    } catch (error) {
      const message = getClientErrorMessage(error);
      console.error("Failed to save measurements:", message);
      toast.error(message);
    }
  };

  const containerClassName = `flex flex-col items-center bg-[var(--bg)] w-full overflow-x-hidden ${activeTab === "chat" ? "h-screen overflow-hidden" : "min-h-screen"}`;
  const mainLayoutClassName = `flex-1 min-h-0 w-full main-layout transition-all duration-500 ${activeTab === "chat" ? "single-screen-layout" : "page-top-offset pb-32 md:pb-12"}`;

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#185fa5]"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <main className={containerClassName}>
      <Navbar activeTab={activeTab} setActiveTab={handleTabChange} />

      <div className={mainLayoutClassName}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10, scale: 0.995 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.995 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col flex-1 h-full min-h-0 relative"
          >
            {activeTab === "chat" && (
              <div className="chat-sidebar-layout">
                <Chat
                  onLogParsed={handleLogParsed}
                  isNewUser={
                    !dashboard.profile?.age || !dashboard.profile?.height
                  }
                  initialMessage={chatDraft}
                  onMessageSent={() => setChatDraft(null)}
                  input={chatInput}
                  setInput={setChatInput}
                  nudgeStatus={{
                    protein: nutrition.protein,
                    proteinTarget: getProteinTarget(
                      dashboard.goals,
                      dashboard.dayType,
                    ),
                    calories: nutrition.calories,
                    calorieTarget: dashboard.goals.kcalTarget,
                  }}
                  userContext={{
                    profile: dashboard.profile,
                    goals: dashboard.goals,
                    analytics: dashboard.analytics,
                    dayType: dashboard.dayType,
                    todaysStats: {
                      protein: nutrition.protein,
                      kcal: nutrition.calories,
                      water: nutrition.water,
                    },
                  }}
                />
                <div className="ui-pane h-full overflow-hidden flex flex-col">
                  <Sidebar
                    protein={nutrition.protein}
                    proteinTarget={getProteinTarget(
                      dashboard.goals,
                      dashboard.dayType,
                    )}
                    calories={nutrition.calories}
                    calorieTarget={dashboard.goals.kcalTarget}
                    carbs={nutrition.carbs}
                    carbsTarget={dashboard.goals.carbsTarget ?? 0}
                    fats={nutrition.fats}
                    fatsTarget={dashboard.goals.fatsTarget ?? 0}
                    fiber={nutrition.fiber}
                    water={nutrition.water}
                    waterTarget={dashboard.goals.waterTarget ?? 3}
                    weight={dashboard.latestMeasurement?.weight ?? "--"}
                    sleep={latestSleep?.hours ?? "--"}
                    sleepTarget={dashboard.goals.sleepTarget ?? 8}
                    dayType={dashboard.dayType}
                    setDayType={handleDayTypeChange}
                    hasWorkout={hasLoggedWorkoutToday}
                    analytics={dashboard.analytics}
                    logs={dashboard.logs}
                    activeWorkout={dashboard.activeWorkout}
                    onTabChange={handleTabChange}
                  />
                </div>
              </div>
            )}

            {activeTab === "log" && (
              <LogTab
                foodLog={dashboard.logs.food}
                protein={nutrition.protein}
                workouts={dashboard.logs.workouts}
                sleepLogs={dashboard.logs.sleep}
                onDeleteWorkout={handleDeleteWorkout}
                onDeleteFood={handleDeleteFood}
                onDeleteSleep={handleDeleteSleep}
              />
            )}

            {activeTab === "history" && (
              <HistoryTab
                history={history}
                analytics={dashboard.analytics}
                kcalTarget={dashboard.goals.kcalTarget}
                proteinTarget={getProteinTarget(
                  dashboard.goals,
                  dashboard.dayType,
                )}
              />
            )}

            {activeTab === "routines" && (
              <RoutinesTab onStart={handleStartWorkout} />
            )}

            {activeTab === "body" && (
              <BodyTab
                measurements={dashboard.measurements}
                setMeasurements={updateMeasurements}
                handleSaveMeasurements={handleSaveMeasurements}
                latestMeasurement={dashboard.latestMeasurement}
              />
            )}

            {activeTab === "profile" && (
              <ProfileTab
                session={session}
                goals={dashboard.goals}
                profile={dashboard.profile}
                analytics={dashboard.analytics}
                trackedDayCount={trackedDayCount}
              />
            )}

            {activeTab === "meals" && (
              <MealPlanningTab />
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {dashboard.activeWorkout && (
            <WorkoutSession
              key="active-workout-overlay"
              session={dashboard.activeWorkout}
              onFinish={handleFinishWorkout}
              onDiscard={handleDiscardWorkout}
              onUpdate={handleUpdateWorkout}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {newAchievements.length > 0 && (
            <AchievementOverlay 
              achievements={newAchievements} 
              onClose={() => {
                setNewAchievements([]);
              }} 
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}


function isUserProfile(value: unknown): value is DashboardState["profile"] {
  return (
    typeof value === "object" &&
    value !== null &&
    (!("error" in value) || Object.keys(value).length > 1)
  );
}

function isBodyMeasurement(value: unknown): value is BodyMeasurement {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "time" in value
  );
}

function isGoalsState(value: unknown): value is GoalsState {
  return (
    typeof value === "object" &&
    value !== null &&
    "proteinTarget" in value &&
    typeof value.proteinTarget === "number" &&
    "kcalTarget" in value &&
    typeof value.kcalTarget === "number"
  );
}

function isAnalyticsResponse(value: unknown): value is AnalyticsResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "nutritionStats" in value &&
    Array.isArray(value.nutritionStats) &&
    "averages" in value &&
    typeof value.averages === "object" &&
    value.averages !== null &&
    "kcal" in value.averages &&
    typeof value.averages.kcal === "number" &&
    "protein" in value.averages &&
    typeof value.averages.protein === "number" &&
    "weightTrend" in value &&
    Array.isArray(value.weightTrend) &&
    "meta" in value &&
    typeof value.meta === "object" &&
    value.meta !== null &&
    "period" in value.meta &&
    typeof value.meta.period === "string"
  );
}

function isDayTypeEntryRecordArray(
  value: unknown,
): value is DayTypeEntryRecord[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "dayKey" in entry &&
        typeof entry.dayKey === "string" &&
        "dayType" in entry &&
        (entry.dayType === "Rest" ||
          entry.dayType === "Training" ||
          entry.dayType === "Lite"),
    )
  );
}

async function persistDayType(dayKey: string, dayType: DayType) {
  await requestJson<DayTypeEntryRecord>("/api/day-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dayKey, dayType }),
  });
}
