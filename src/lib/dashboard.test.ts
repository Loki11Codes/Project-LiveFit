import { test, expect } from 'vitest';
import type { FoodLog, SleepLog, WorkoutLog } from '@prisma/client';
import {
  buildHistoryRows,
  getCurrentDayType,
  getLocalDateKey,
  getProteinTarget,
  getTrackedDayCount,
  sumNutrition,
  toMeasurementForm,
  toMeasurementPayload,
} from './dashboard';
import type { DayTypeMap, GoalsState, LogsResponse } from './types';

test('buildHistoryRows aggregates daily logs, applies day types, and sorts newest first', () => {
  const march16Morning = new Date(2026, 2, 16, 8, 15);
  const march16Evening = new Date(2026, 2, 16, 20, 0);
  const march15Morning = new Date(2026, 2, 15, 9, 30);

  const logs: LogsResponse = {
    food: [
      createFoodLog('food-1', march16Morning, { protein: 30, kcal: 500 }),
      createFoodLog('food-2', march16Evening, { protein: 20, kcal: 400 }),
      createFoodLog('food-3', march15Morning, { protein: 40, kcal: 600 }),
    ],
    workouts: [
      createWorkoutLog('workout-1', march16Morning, { focus: 'Push' }),
      createWorkoutLog('workout-2', march16Evening, { focus: 'Legs' }),
    ],
    sleep: [
      createSleepLog('sleep-1', march16Morning, { hours: 7.5 }),
      createSleepLog('sleep-2', march15Morning, { hours: 6 }),
    ],
  };
  const goals: GoalsState = {
    proteinTarget: 45,
    kcalTarget: 2200,
  };
  const dayTypesByDay: DayTypeMap = {
    [getLocalDateKey(march16Morning)]: 'Training',
    [getLocalDateKey(march15Morning)]: 'Rest',
  };

  const history = buildHistoryRows(logs, goals, dayTypesByDay);

  expect(history.length).toBe(2);
  expect(history[0]).toEqual({
    day: 'Mar 16, 2026',
    type: 'Training',
    sleep: '7.5',
    protein: 50,
    target: 45,
    status: 'completed',
    kcal: 900,
    carbs: 0,
    fats: 0,
    fiber: 0,
    workout: 'Push, Legs',
  });
  expect(history[1]).toEqual({
    day: 'Mar 15, 2026',
    type: 'Rest',
    sleep: '6',
    protein: 40,
    target: 45,
    status: 'pending',
    kcal: 600,
    carbs: 0,
    fats: 0,
    fiber: 0,
    workout: '--',
  });
});

test('buildHistoryRows handles Lite day type', () => {
  const march18 = new Date(2026, 2, 18);
  const logs: LogsResponse = { 
    food: [createFoodLog('food-1', march18, { protein: 10 })], 
    workouts: [], 
    sleep: [] 
  };
  const goals: GoalsState = { proteinTarget: 40, kcalTarget: 2000 };
  const dayTypes: DayTypeMap = { [getLocalDateKey(march18)]: 'Lite' };
  
  const history = buildHistoryRows(logs, goals, dayTypes);
  expect(history[0].type).toBe('Lite');
});

test('buildHistoryRows handles missing data gracefully', () => {
  const march18 = new Date(2026, 2, 18);
  const logs: LogsResponse = { 
    food: [], 
    workouts: [], 
    sleep: [createSleepLog('sleep-1', march18, { hours: 8 })] 
  };
  const history = buildHistoryRows(logs, { proteinTarget: 40, kcalTarget: 2000 }, {});
  expect(history[0].workout).toBe('--');
});

test('getTrackedDayCount counts unique logged days across categories', () => {
  const logs: LogsResponse = {
    food: [
      createFoodLog('food-1', new Date(2026, 2, 16, 8), { protein: 10, kcal: 100 }),
      createFoodLog('food-2', new Date(2026, 2, 16, 18), { protein: 12, kcal: 140 }),
    ],
    workouts: [
      createWorkoutLog('workout-1', new Date(2026, 2, 14, 7), { focus: 'Pull' }),
    ],
    sleep: [
      createSleepLog('sleep-1', new Date(2026, 2, 15, 23), { hours: 8 }),
    ],
  };

  expect(getTrackedDayCount(logs)).toBe(3);
});

test('sumNutrition totals optional macros and getCurrentDayType falls back to Rest', () => {
  const foodLogs = [
    createFoodLog('food-1', new Date(2026, 2, 16, 8), {
      protein: 25,
      kcal: 320,
      carbs: 18,
      fats: 12,
      fiber: 4,
    }),
    createFoodLog('food-2', new Date(2026, 2, 16, 13), {
      protein: 15,
      kcal: 280,
    }),
  ];

  expect(sumNutrition(foodLogs)).toEqual({
    protein: 40,
    calories: 600,
    carbs: 18,
    fats: 12,
    fiber: 4,
  });

  expect(getCurrentDayType({})).toBe('Rest');
  expect(getCurrentDayType({ [getLocalDateKey(new Date())]: 'Lite' })
  ).toBe('Lite');
});

test('toMeasurementForm handles null and populated data', () => {
  expect(toMeasurementForm(null).weight).toBe('');
  expect(toMeasurementForm({ weight: 80 }).weight).toBe('80');
});

test('toMeasurementPayload handles empty and numeric strings', () => {
  const base = {
    weight: '', waist: '', chest: '', arms: '', thighs: '',
    hips: '', calves: '', neck: '', bodyFat: ''
  };
  expect(toMeasurementPayload({ ...base, weight: '' }).weight).toBe(null);
  expect(toMeasurementPayload({ ...base, weight: '80.5' }).weight).toBe(80.5);
  expect(toMeasurementPayload({ ...base, weight: 'abc' }).weight).toBe(null);
});

test('getProteinTarget falls back to default goals', () => {
  const goals: GoalsState = { proteinTarget: 100, kcalTarget: 2000 };
  expect(getProteinTarget(goals, 'Unknown' as import('./types').DayType)).toBe(100);
});

test('buildHistoryRows handles complex training rows', () => {
  const march18 = new Date(2026, 2, 18);
  const logs: LogsResponse = {
    food: [createFoodLog('f1', march18, { protein: 50, kcal: 1000 })],
    workouts: [createWorkoutLog('w1', march18, { focus: 'Upper' })],
    sleep: [createSleepLog('s1', march18, { hours: 8 })]
  };
  const history = buildHistoryRows(logs, { proteinTarget: 40, kcalTarget: 2000 }, { [getLocalDateKey(march18)]: 'Training' });
  expect(history[0].status).toBe('completed');
  expect(history[0].workout).toBe('Upper');
});

function createFoodLog(
  id: string,
  time: Date,
  overrides: Partial<FoodLog>
): FoodLog {
  return {
    id,
    userId: 'user-1',
    name: 'Meal',
    protein: 0,
    kcal: 0,
    carbs: null,
    fats: null,
    fiber: null,
    time,
    ...overrides,
  };
}

function createWorkoutLog(
  id: string,
  time: Date,
  overrides: Partial<WorkoutLog>
): WorkoutLog {
  return {
    id,
    userId: 'user-1',
    focus: 'Workout',
    volume: null,
    details: null,
    routineId: null,
    time,
    ...overrides,
  };
}

function createSleepLog(
  id: string,
  time: Date,
  overrides: Partial<SleepLog>
): SleepLog {
  return {
    id,
    userId: 'user-1',
    hours: 0,
    bedTime: null,
    wakeTime: null,
    time,
    ...overrides,
  };
}
