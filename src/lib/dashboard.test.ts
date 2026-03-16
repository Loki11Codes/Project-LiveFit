import assert from 'node:assert/strict';
import test from 'node:test';
import type { FoodLog, SleepLog, WorkoutLog } from '@prisma/client';
import {
  buildHistoryRows,
  getCurrentDayType,
  getLocalDateKey,
  getTrackedDayCount,
  sumNutrition,
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

  assert.equal(history.length, 2);
  assert.deepEqual(history[0], {
    day: 'Mar 16, 2026',
    type: 'Training',
    sleep: '7.5',
    protein: 50,
    target: 45,
    status: 'completed',
    kcal: 900,
    workout: 'Push, Legs',
  });
  assert.deepEqual(history[1], {
    day: 'Mar 15, 2026',
    type: 'Rest',
    sleep: '6',
    protein: 40,
    target: 45,
    status: 'pending',
    kcal: 600,
    workout: '--',
  });
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

  assert.equal(getTrackedDayCount(logs), 3);
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

  assert.deepEqual(sumNutrition(foodLogs), {
    protein: 40,
    calories: 600,
    carbs: 18,
    fats: 12,
    fiber: 4,
  });

  assert.equal(getCurrentDayType({}), 'Rest');
  assert.equal(
    getCurrentDayType({ [getLocalDateKey(new Date())]: 'Lite' }),
    'Lite'
  );
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
