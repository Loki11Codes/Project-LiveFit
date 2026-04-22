import type { BodyMeasurement, SleepLog } from '@prisma/client';
import {
  EMPTY_MEASUREMENT_FORM,
  type DayType,
  type DayTypeEntryRecord,
  type DayTypeMap,
  type GoalsState,
  type HistoryRow,
  type LogsResponse,
  type MeasurementForm,
  type MeasurementPayload,
  type TabId,
  type FoodLog,
} from '@/lib/types';

type DailySummary = {
  dayKey: string;
  date: Date;
  protein: number;
  kcal: number;
  carbs: number;
  fats: number;
  fiber: number;
  water: number;
  sleep: number | null;
  workoutFocuses: Set<string>;
  exerciseCount: number;
  totalVolume: number;
};

const VALID_TABS = new Set<TabId>(['chat', 'log', 'routines', 'history', 'body', 'profile']);

export function parseTab(value: string | null): TabId {
  if (value && VALID_TABS.has(value as TabId)) {
    return value as TabId;
  }

  return 'chat';
}

export function toMeasurementForm(
  measurement: Partial<BodyMeasurement> | null | undefined
): MeasurementForm {
  if (!measurement) {
    return EMPTY_MEASUREMENT_FORM;
  }

  return {
    weight: toInputValue(measurement.weight),
    waist: toInputValue(measurement.waist),
    chest: toInputValue(measurement.chest),
    arms: toInputValue(measurement.arms),
    thighs: toInputValue(measurement.thighs),
    hips: toInputValue(measurement.hips),
    calves: toInputValue(measurement.calves),
    neck: toInputValue(measurement.neck),
    bodyFat: toInputValue(measurement.bodyFat),
  };
}

export function toMeasurementPayload(form: MeasurementForm): MeasurementPayload {
  return {
    weight: toNullableNumber(form.weight),
    waist: toNullableNumber(form.waist),
    chest: toNullableNumber(form.chest),
    arms: toNullableNumber(form.arms),
    thighs: toNullableNumber(form.thighs),
    hips: toNullableNumber(form.hips),
    calves: toNullableNumber(form.calves),
    neck: toNullableNumber(form.neck),
    bodyFat: toNullableNumber(form.bodyFat),
  };
}

export function getTodayFoodLogs(foodLogs: FoodLog[]): FoodLog[] {
  // Use local midnight (local browser date) as the anchor
  const now = new Date();
  const dateStr = getLocalDateKey(now);
  
  return foodLogs.filter((log) => {
    const logStr = getLocalDateKey(log.time);
    return logStr === dateStr;
  });
}

export function sumNutrition(foodLogs: FoodLog[]) {
  return foodLogs.reduce(
    (totals, log) => ({
      protein: totals.protein + log.protein,
      calories: totals.calories + log.kcal,
      carbs: totals.carbs + (log.carbs ?? 0),
      fats: totals.fats + (log.fats ?? 0),
      fiber: totals.fiber + (log.fiber ?? 0),
      water: totals.water + (log.water ?? 0),
    }),
    {
      protein: 0,
      calories: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
      water: 0,
    }
  );
}

export function getLatestSleepLog(sleepLogs: SleepLog[]): SleepLog | null {
  return sleepLogs[0] ?? null;
}

export function getTrackedDayCount(logs: LogsResponse): number {
  const trackedDays = new Set<string>();

  for (const log of logs.food) {
    trackedDays.add(getLocalDateKey(log.time));
  }

  for (const log of logs.workouts) {
    trackedDays.add(getLocalDateKey(log.time));
  }

  for (const log of logs.sleep) {
    trackedDays.add(getLocalDateKey(log.time));
  }

  return trackedDays.size;
}

export function buildHistoryRows(
  logs: LogsResponse,
  goals: GoalsState,
  dayTypesByDay: DayTypeMap
): HistoryRow[] {

  const grouped = new Map<string, DailySummary>();

  for (const log of logs.food) {
    const key = getLocalDateKey(log.time);
    const entry = grouped.get(key) ?? createDailySummary(log.time);

    entry.protein += log.protein;
    entry.kcal += log.kcal;
    entry.carbs += log.carbs ?? 0;
    entry.fats += log.fats ?? 0;
    entry.fiber += log.fiber ?? 0;
    entry.water += log.water ?? 0;
    grouped.set(key, entry);
  }

  for (const log of logs.workouts) {
    const key = getLocalDateKey(log.time);
    const entry = grouped.get(key) ?? createDailySummary(log.time);

    entry.workoutFocuses.add(log.focus);
    entry.exerciseCount += log.exercises?.length ?? 0;
    entry.totalVolume += log.volume ?? 0;
    grouped.set(key, entry);
  }

  for (const log of logs.sleep) {
    const key = getLocalDateKey(log.time);
    const entry = grouped.get(key) ?? createDailySummary(log.time);

    entry.sleep = log.hours;
    grouped.set(key, entry);
  }

  return Array.from(grouped.values())
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .map((entry) => ({
      day: formatHistoryDay(entry.date),
      type: dayTypesByDay[entry.dayKey] ?? '--',
      sleep: entry.sleep === null ? '--' : formatNumber(entry.sleep),
      protein: round(entry.protein),
      target: getProteinTarget(goals, dayTypesByDay[entry.dayKey] ?? 'Rest'),
      status: entry.protein >= getProteinTarget(goals, dayTypesByDay[entry.dayKey] ?? 'Rest') ? 'completed' : 'pending',
      kcal: round(entry.kcal),
      carbs: round(entry.carbs),
      fats: round(entry.fats),
      fiber: round(entry.fiber),
      water: round(entry.water),
      workout:
        entry.workoutFocuses.size > 0
          ? Array.from(entry.workoutFocuses).join(', ')
          : '--',
      workoutDetail: entry.exerciseCount > 0 ? `${entry.exerciseCount} exercises` : undefined,
      totalVolume: entry.totalVolume > 0 ? Math.round(entry.totalVolume) : undefined,
    }));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

export function buildDayTypeMap(entries: DayTypeEntryRecord[]): DayTypeMap {
  return entries.reduce<DayTypeMap>((map, entry) => {
    map[entry.dayKey] = entry.dayType;
    return map;
  }, {});
}

export function getCurrentDayType(dayTypesByDay: DayTypeMap): DayType {
  return dayTypesByDay[getLocalDateKey(new Date())] ?? 'Rest';
}

export function getProteinTarget(goals: GoalsState, dayType: DayType): number {
  switch (dayType) {
    case 'Training':
      return goals.proteinTraining ?? goals.proteinTarget;
    case 'Rest':
      return goals.proteinRest ?? goals.proteinTarget;
    case 'Lite':
      return goals.proteinLite ?? goals.proteinTarget;
    default:
      return goals.proteinTarget;
  }
}

function createDailySummary(value: Date | string): DailySummary {
  return {
    dayKey: getLocalDateKey(value),
    date: new Date(value),
    protein: 0,
    kcal: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    water: 0,
    sleep: null,
    workoutFocuses: new Set<string>(),
    exerciseCount: 0,
    totalVolume: 0,
  };
}

function toInputValue(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

function toNullableNumber(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getLocalDateKey(value: Date | string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatHistoryDay(value: Date): string {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function round(value: number): number {
  return Number((value ?? 0).toFixed(1));
}

function formatNumber(value: number): string {
  if (value === undefined || value === null) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
