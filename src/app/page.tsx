"use client";

import React, { startTransition, useEffect, useState } from "react";
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
import { RoutinesTab } from "@/components/RoutinesTab";
import { WorkoutSession } from "../components/WorkoutSession";
import {
  buildHistoryRows,
  buildDayTypeMap,
  getCurrentDayType,
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
  type AppTheme,
  type ActiveWorkoutSession,
  type DayTypeEntryRecord,
  type DashboardState,
  type DayType,
  type GoalsState,
  type LogsResponse,
  type MeasurementForm,
  type TabId,
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
};

export default function Home() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = parseTab(searchParams.get("tab"));
  const [theme, setTheme] = useState<AppTheme>("light");
  const [dashboard, setDashboard] = useState<DashboardState>(
    INITIAL_DASHBOARD_STATE,
  );
  const [chatDraft, setChatDraft] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");

  const todaysFood = getTodayFoodLogs(dashboard.logs.food);
  // ...
  const handleStartWorkout = (routine: any) => {
    const workoutSession = {
      name: routine.name,
      startTime: Date.now(),
      exercises: (routine.exercises || []).map((e: any) => ({
        id: crypto.randomUUID(),
        exerciseId: e.exerciseId || e.id,
        name: e.exercise?.name || e.name, 
        sets: e.sets
          ? e.sets.map((s: any) => ({ ...s, isCompleted: false }))
          : Array.from({ length: Number(e.targetSets) || 3 }).map((_, i) => ({
              id: crypto.randomUUID(),
              weight: "",
              reps: e.targetReps || "",
              isCompleted: false,
            })),
      })),
    };
    setDashboard((prev) => ({ ...prev, activeWorkout: workoutSession }));
    // Don't switch tab automatically, WorkoutSession will be an overlay
  };

  const handleFinishWorkout = (session: ActiveWorkoutSession) => {
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
      .then(() => refreshDashboard())
      .catch((err) => console.error("Failed to directly save workout log", err));

    let summaryText = `I finished my "${session.name}" workout! It took me ${durationMinutes} minutes.\n\nSummary:\n`;
    completedExercises.forEach((ex) => {
      const sets = ex.sets.filter((s) => s.isCompleted);
      summaryText += `- ${ex.name}: ${sets.length} sets completed\n`;
    });

    setChatDraft(summaryText);
    setDashboard((prev) => ({ ...prev, activeWorkout: null }));
    handleTabChange("chat");
  };

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
  const nutrition = sumNutrition(todaysFood);
  const latestSleep = getLatestSleepLog(dashboard.logs.sleep);
  const trackedDayCount = getTrackedDayCount(dashboard.logs);
  const history = buildHistoryRows(
    dashboard.logs,
    dashboard.goals,
    dashboard.dayTypesByDay,
  );

  const handleTabChange = (tab: TabId) => {
    router.push(`/?tab=${tab}`, { scroll: false });
  };

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

  async function handleLogParsed(envelopes?: any[], hasData?: boolean) {
    console.log("[DEBUG] Chat envelopes received:", envelopes);
    
    if (hasData && (!envelopes || envelopes.length === 0)) {
      console.warn("[PARSER] Data blocks were detected but failed to parse correctly.");
    }

    // Small delay to ensure server transaction is committed before we fetch
    setTimeout(() => {
      void refreshDashboard();
    }, 200);
    
    if (envelopes && envelopes.length > 0) {
      const workoutAction = envelopes.find(e => e.category === 'workout' && e.action === 'start');
      if (workoutAction) {
        console.log("[DEBUG] Workout start intent detected:", workoutAction);
        const name = workoutAction.name || workoutAction.focus || workoutAction.data?.name || "Fresh Workout";
        if (workoutAction.routineId) {
           void handleStartWorkoutById(workoutAction.routineId, name);
        } else {
           handleStartWorkout({ name, exercises: [] });
        }
      }
    }
  }

  function handleUpdateWorkout(updated: ActiveWorkoutSession) {
    setDashboard((prev) => ({ ...prev, activeWorkout: updated }));
  }

  async function handleStartWorkoutById(id: string, name?: string) {
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
  }, [session?.user?.id]);

  useEffect(() => {
    const saved = localStorage.getItem("active_workout");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  async function refreshDashboard() {
    if (!session?.user?.id) {
      return;
    }

    try {
      const data = await fetchRawDashboardData();
      startTransition(() => {
        setDashboard(prev => ({
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
  };

  const handleSaveMeasurements = async () => {
    try {
      const latestMeasurement = await requestJson<BodyMeasurement>(
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

  const toggleTheme = (event?: React.MouseEvent) => {
    const nextTheme = theme === "light" ? "dark" : "light";

    if (!document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? window.innerHeight / 2;

    document.documentElement.style.setProperty("--transition-x", `${x}px`);
    document.documentElement.style.setProperty("--transition-y", `${y}px`);
    document.documentElement.classList.add("theme-transitioning");

    const transition = document.startViewTransition(() => {
      startTransition(() => setTheme(nextTheme));
    });

    transition.finished.finally(() => {
      document.documentElement.classList.remove("theme-transitioning");
    });
  };

  return (
    <main
      className={`flex flex-col items-center bg-(--bg) w-full overflow-x-hidden ${activeTab === "chat" ? "h-screen overflow-hidden" : "min-h-screen"}`}
    >
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div
        className={`flex-1 min-h-0 w-full main-layout transition-all duration-500 ${
          activeTab === "chat"
            ? "single-screen-layout"
            : "page-top-offset pb-32 md:pb-12"
        }`}
      >
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
                    fats={nutrition.fats}
                    fiber={nutrition.fiber}
                    weight={dashboard.latestMeasurement?.weight ?? "--"}
                    sleep={latestSleep?.hours ?? "--"}
                    day={trackedDayCount || 1}
                    dayType={dashboard.dayType}
                    setDayType={handleDayTypeChange}
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
              />
            )}

            {activeTab === "history" && (
              <HistoryTab history={history} analytics={dashboard.analytics} />
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
      </div>
    </main>
  );
}

async function fetchRawDashboardData(): Promise<Omit<DashboardState, "activeWorkout" | "measurements">> {
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
    requestJson<unknown>("/api/profile?type=goals"), // We'll use the profile route for goals now
    requestJson<unknown>("/api/analytics"),
    requestJson<unknown>("/api/day-types"),
    requestJson<unknown>("/api/profile"),
  ]);

  const latestMeasurement = isBodyMeasurement(latestMeasurementResponse)
    ? latestMeasurementResponse
    : null;
  const goals = isGoalsState(goalsResponse) ? goalsResponse : DEFAULT_GOALS;
  const analytics = isAnalyticsResponse(analyticsResponse)
    ? analyticsResponse
    : EMPTY_ANALYTICS;
  const dayTypeEntries = isDayTypeEntryRecordArray(dayTypesResponse)
    ? dayTypesResponse
    : [];
  const dayTypesByDay = buildDayTypeMap(dayTypeEntries);
  const profile = isUserProfile(profileResponse) ? profileResponse : null;

  return {
    logs,
    latestMeasurement,
    goals,
    profile,
    analytics,
    dayType: getCurrentDayType(dayTypesByDay),
    dayTypesByDay,
  };
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
