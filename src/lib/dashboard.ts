import type { BodyMeasurement, FoodLog, SleepLog } from '@prisma/client';
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
} from '@/lib/types';

const VALID_TABS: TabId[] = ['chat', 'log', 'history', 'body', 'profile'];

export function parseTab(value: string | null): TabId {
  if (value && VALID_TABS.includes(value as TabId)) {
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
  const today = new Date();

  return foodLogs.filter((log) => isSameCalendarDay(new Date(log.time), today));
}

export function sumNutrition(foodLogs: FoodLog[]) {
  return foodLogs.reduce(
    (totals, log) => ({
      protein: totals.protein + log.protein,
      calories: totals.calories + log.kcal,
      carbs: totals.carbs + (log.carbs ?? 0),
      fats: totals.fats + (log.fats ?? 0),
      fiber: totals.fiber + (log.fiber ?? 0),
    }),
    {
      protein: 0,
      calories: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
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
  type DailySummary = {
    dayKey: string;
    date: Date;
    protein: number;
    kcal: number;
    carbs: number;
    fats: number;
    fiber: number;
    sleep: number | null;
    workoutFocuses: Set<string>;
  };

  const grouped = new Map<string, DailySummary>();

  for (const log of logs.food) {
    const key = getLocalDateKey(log.time);
    const entry = grouped.get(key) ?? createDailySummary(log.time);

    entry.protein += log.protein;
    entry.kcal += log.kcal;
    entry.carbs += log.carbs ?? 0;
    entry.fats += log.fats ?? 0;
    entry.fiber += log.fiber ?? 0;
    grouped.set(key, entry);
  }

  for (const log of logs.workouts) {
    const key = getLocalDateKey(log.time);
    const entry = grouped.get(key) ?? createDailySummary(log.time);

    entry.workoutFocuses.add(log.focus);
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
      target: goals.proteinTarget,
      status: entry.protein >= goals.proteinTarget ? 'completed' : 'pending',
      kcal: round(entry.kcal),
      carbs: round(entry.carbs),
      fats: round(entry.fats),
      fiber: round(entry.fiber),
      workout:
        entry.workoutFocuses.size > 0
          ? Array.from(entry.workoutFocuses).join(', ')
          : '--',
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

function createDailySummary(value: Date | string): {
  dayKey: string;
  date: Date;
  protein: number;
  kcal: number;
  carbs: number;
  fats: number;
  fiber: number;
  sleep: number | null;
  workoutFocuses: Set<string>;
} {
  return {
    dayKey: getLocalDateKey(value),
    date: new Date(value),
    protein: 0,
    kcal: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    sleep: null,
    workoutFocuses: new Set<string>(),
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

function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatHistoryDay(value: Date): string {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function round(value: number): number {
  return Number(value.toFixed(1));
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
