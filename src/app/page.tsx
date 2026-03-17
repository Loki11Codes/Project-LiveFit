'use client';

import React, { startTransition, useEffect, useState } from 'react';
import type { BodyMeasurement } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Chat from '@/components/Chat';
import LogTab from '@/components/Tabs/LogTab';
import HistoryTab from '@/components/Tabs/HistoryTab';
import BodyTab from '@/components/Tabs/BodyTab';
import ProfileTab from '@/components/Tabs/ProfileTab';
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
} from '@/lib/dashboard';
import { getClientErrorMessage, requestJson } from '@/lib/client-api';
import {
  DEFAULT_GOALS,
  EMPTY_ANALYTICS,
  EMPTY_DAY_TYPES_BY_DAY,
  EMPTY_LOGS,
  EMPTY_MEASUREMENT_FORM,
  type AnalyticsResponse,
  type AppTheme,
  type DayTypeEntryRecord,
  type DashboardState,
  type DayType,
  type GoalsState,
  type InlineNotice,
  type LogsResponse,
  type MeasurementForm,
  type TabId,
} from '@/lib/types';

const INITIAL_DASHBOARD_STATE: DashboardState = {
  logs: EMPTY_LOGS,
  latestMeasurement: null,
  measurements: EMPTY_MEASUREMENT_FORM,
  goals: DEFAULT_GOALS,
  profile: null,
  analytics: EMPTY_ANALYTICS,
  dayType: 'Rest',
  dayTypesByDay: EMPTY_DAY_TYPES_BY_DAY,
};

export default function Home() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = parseTab(searchParams.get('tab'));
  const [theme, setTheme] = useState<AppTheme>('light');
  const [dashboard, setDashboard] = useState<DashboardState>(INITIAL_DASHBOARD_STATE);
  const [notice, setNotice] = useState<InlineNotice | null>(null);

  const todaysFood = getTodayFoodLogs(dashboard.logs.food);
  const nutrition = sumNutrition(todaysFood);
  const latestSleep = getLatestSleepLog(dashboard.logs.sleep);
  const trackedDayCount = getTrackedDayCount(dashboard.logs);
  const history = buildHistoryRows(
    dashboard.logs,
    dashboard.goals,
    dashboard.dayTypesByDay
  );

  const handleTabChange = (tab: TabId) => {
    router.push(`/?tab=${tab}`, { scroll: false });
  };

  const updateMeasurements: React.Dispatch<React.SetStateAction<MeasurementForm>> = (
    value
  ) => {
    setDashboard((current) => ({
      ...current,
      measurements:
        typeof value === 'function' ? value(current.measurements) : value,
    }));
  };

  const updateGoals: React.Dispatch<React.SetStateAction<GoalsState>> = (value) => {
    setDashboard((current) => ({
      ...current,
      goals: typeof value === 'function' ? value(current.goals) : value,
    }));
  };

  const updateProfile: React.Dispatch<React.SetStateAction<DashboardState['profile']>> = (
    value
  ) => {
    setDashboard((current) => ({
      ...current,
      profile: typeof value === 'function' ? value(current.profile) : value,
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
      console.error('Failed to persist day type:', message);
      setNotice({ tone: 'error', message });
      startTransition(() => updateLocalState(previousDayType));
    });
  };

  useEffect(() => {
    let cancelled = false;

    if (!session?.user?.id) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          startTransition(() => {
            setDashboard(INITIAL_DASHBOARD_STATE);
          });
        }
      });

      return () => {
        cancelled = true;
      };
    }

    void fetchDashboardData()
      .then((nextState) => {
        if (cancelled) {
          return;
        }

        setNotice(null);
        startTransition(() => {
          setDashboard(nextState);
        });
      })
      .catch((error) => {
        const message = getClientErrorMessage(error);
        console.error('Failed to fetch dashboard data:', message);
        setNotice({
          tone: 'error',
          message: `Unable to load dashboard data: ${message}`,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!notice || notice.tone === 'error') {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setNotice(null);
    }, 4000);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [notice]);

  const refreshDashboard = async () => {
    if (!session?.user?.id) {
      return;
    }

    try {
      const nextState = await fetchDashboardData();
      setNotice(null);
      startTransition(() => {
        setDashboard(nextState);
      });
    } catch (error) {
      const message = getClientErrorMessage(error);
      console.error('Failed to refresh dashboard:', message);
      setNotice({
        tone: 'error',
        message: `Unable to refresh dashboard: ${message}`,
      });
    }
  };

  const handleSaveMeasurements = async () => {
    try {
      const latestMeasurement = await requestJson<BodyMeasurement>('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toMeasurementPayload(dashboard.measurements)),
      });
      setNotice({
        tone: 'success',
        message: 'Measurements saved.',
      });
      startTransition(() => {
        setDashboard((current) => ({
          ...current,
          latestMeasurement,
          measurements: toMeasurementForm(latestMeasurement),
        }));
      });
    } catch (error) {
      const message = getClientErrorMessage(error);
      console.error('Failed to save measurements:', message);
      setNotice({
        tone: 'error',
        message,
      });
    }
  };

  const handleSaveGoals = async () => {
    try {
      const goals = await requestJson<GoalsState>('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dashboard.goals),
      });
      setNotice({
        tone: 'success',
        message: 'Daily goals updated.',
      });
      startTransition(() => {
        setDashboard((current) => ({
          ...current,
          goals,
        }));
      });
    } catch (error) {
      const message = getClientErrorMessage(error);
      console.error('Failed to save goals:', message);
      setNotice({
        tone: 'error',
        message,
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      const profile = await requestJson<DashboardState['profile']>('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dashboard.profile),
      });
      setNotice({
        tone: 'success',
        message: 'Profile details updated.',
      });
      startTransition(() => {
        setDashboard((current) => ({
          ...current,
          profile,
        }));
      });
    } catch (error) {
      const message = getClientErrorMessage(error);
      console.error('Failed to save profile:', message);
      setNotice({
        tone: 'error',
        message,
      });
    }
  };

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const tabVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  return (
    <main className={`flex flex-col items-center bg-[var(--bg)] w-full overflow-x-hidden ${activeTab === 'chat' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <AnimatePresence>
        {notice && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="main-status-wrap shrink-0"
          >
            <div
              className={`notice-banner notice-banner-${notice.tone}`}
              role="status"
              aria-live="polite"
            >
              {notice.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`flex-1 min-h-0 w-full main-layout transition-all duration-500 ${
          activeTab === 'chat' ? 'single-screen-layout' : 'page-top-offset pb-32 md:pb-12'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex flex-col flex-1 h-full min-h-0 relative"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10, scale: 0.995 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.995 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="flex flex-col flex-1 h-full min-h-0"
              >
                {activeTab === 'chat' && (
                  <div className="chat-sidebar-layout">
                    <Chat 
                      onLogParsed={refreshDashboard} 
                      isNewUser={!dashboard.profile || !dashboard.profile.age || !dashboard.profile.height}
                    />
                    <Sidebar
                      protein={nutrition.protein}
                      proteinTarget={getProteinTarget(dashboard.goals, dashboard.dayType)}
                      calories={nutrition.calories}
                      calorieTarget={dashboard.goals.kcalTarget}
                      carbs={nutrition.carbs}
                      fats={nutrition.fats}
                      fiber={nutrition.fiber}
                      weight={dashboard.latestMeasurement?.weight ?? '--'}
                      sleep={latestSleep?.hours ?? '--'}
                      day={trackedDayCount || 1}
                      dayType={dashboard.dayType}
                      setDayType={handleDayTypeChange}
                    />
                  </div>
                )}

                {activeTab === 'log' && (
                  <LogTab
                    foodLog={dashboard.logs.food}
                    protein={nutrition.protein}
                    workouts={dashboard.logs.workouts}
                    sleepLogs={dashboard.logs.sleep}
                  />
                )}

                {activeTab === 'history' && (
                  <HistoryTab history={history} analytics={dashboard.analytics} />
                )}

                {activeTab === 'body' && (
                  <BodyTab
                    measurements={dashboard.measurements}
                    setMeasurements={updateMeasurements}
                    handleSaveMeasurements={handleSaveMeasurements}
                    latestMeasurement={dashboard.latestMeasurement}
                  />
                )}

                {activeTab === 'profile' && (
                  <ProfileTab
                    session={session}
                    goals={dashboard.goals}
                    setGoals={updateGoals}
                    handleSaveGoals={handleSaveGoals}
                    profile={dashboard.profile}
                    setProfile={updateProfile}
                    handleSaveProfile={handleSaveProfile}
                    analytics={dashboard.analytics}
                    trackedDayCount={trackedDayCount}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

async function fetchDashboardData(): Promise<DashboardState> {
  const [
    logs,
    latestMeasurementResponse,
    goalsResponse,
    analyticsResponse,
    dayTypesResponse,
    profileResponse,
  ] = await Promise.all([
    requestJson<LogsResponse>('/api/logs'),
    requestJson<unknown>('/api/measurements'),
    requestJson<unknown>('/api/profile?type=goals'), // We'll use the profile route for goals now
    requestJson<unknown>('/api/analytics'),
    requestJson<unknown>('/api/day-types'),
    requestJson<unknown>('/api/profile'),
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
    measurements: toMeasurementForm(latestMeasurement),
    goals,
    profile,
    analytics,
    dayType: getCurrentDayType(dayTypesByDay),
    dayTypesByDay,
  };
}

function isUserProfile(value: unknown): value is DashboardState['profile'] {
  return (
    typeof value === 'object' &&
    value !== null &&
    (!('error' in value) || Object.keys(value).length > 1)
  );
}

function isBodyMeasurement(value: unknown): value is BodyMeasurement {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'time' in value
  );
}

function isGoalsState(value: unknown): value is GoalsState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'proteinTarget' in value &&
    typeof value.proteinTarget === 'number' &&
    'kcalTarget' in value &&
    typeof value.kcalTarget === 'number'
  );
}

function isAnalyticsResponse(value: unknown): value is AnalyticsResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'nutritionStats' in value &&
    Array.isArray(value.nutritionStats) &&
    'averages' in value &&
    typeof value.averages === 'object' &&
    value.averages !== null &&
    'kcal' in value.averages &&
    typeof value.averages.kcal === 'number' &&
    'protein' in value.averages &&
    typeof value.averages.protein === 'number' &&
    'weightTrend' in value &&
    Array.isArray(value.weightTrend) &&
    'meta' in value &&
    typeof value.meta === 'object' &&
    value.meta !== null &&
    'period' in value.meta &&
    typeof value.meta.period === 'string'
  );
}

function isDayTypeEntryRecordArray(value: unknown): value is DayTypeEntryRecord[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        'dayKey' in entry &&
        typeof entry.dayKey === 'string' &&
        'dayType' in entry &&
        (entry.dayType === 'Rest' ||
          entry.dayType === 'Training' ||
          entry.dayType === 'Lite')
    )
  );
}

async function persistDayType(dayKey: string, dayType: DayType) {
  await requestJson<DayTypeEntryRecord>('/api/day-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dayKey, dayType }),
  });
}
