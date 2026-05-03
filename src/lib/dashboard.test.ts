import { describe, it, expect } from 'vitest';
import {
  parseTab,
  toMeasurementForm,
  toMeasurementPayload,
  getTodayFoodLogs,
  sumNutrition,
  getLatestSleepLog,
  getTrackedDayCount,
  buildHistoryRows,
  getErrorMessage,
  buildDayTypeMap,
  getProteinTarget,
  getLocalDateKey,
  getCurrentDayType,
  round,
  formatNumber,
} from './dashboard';
import type { FoodLog, BodyMeasurement, SleepLog } from '@prisma/client';
import { EMPTY_MEASUREMENT_FORM, DashboardState, GoalsState, DayTypeMap, MeasurementForm, DayTypeEntryRecord } from './types';

describe('dashboard utilities', () => {
  describe('parseTab', () => {
    it('returns valid tab if provided', () => {
      expect(parseTab('body')).toBe('body');
      expect(parseTab('history')).toBe('history');
    });

    it('returns "chat" for invalid or null tab', () => {
      expect(parseTab('invalid')).toBe('chat');
      expect(parseTab(null)).toBe('chat');
    });
  });

  describe('toMeasurementForm', () => {
    it('returns empty form for null input', () => {
      expect(toMeasurementForm(null)).toEqual(EMPTY_MEASUREMENT_FORM);
    });

    it('converts measurement to form strings', () => {
      const m = { weight: 75.5, waist: 80 } as unknown as BodyMeasurement;
      const form = toMeasurementForm(m);
      expect(form.weight).toBe('75.5');
      expect(form.waist).toBe('80');
      expect(form.chest).toBe('');
    });
  });

  describe('toMeasurementPayload', () => {
    it('converts form strings back to numbers or null', () => {
      const form = { 
        weight: '75.5', waist: '', chest: 'abc',
        arms: '', thighs: '', hips: '', calves: '', neck: '', bodyFat: ''
      } as unknown as Record<string, string>;
      const payload = toMeasurementPayload(form as unknown as MeasurementForm);
      expect(payload.weight).toBe(75.5);
      expect(payload.waist).toBeNull();
      expect(payload.chest).toBeNull();
    });
  });

  describe('sumNutrition', () => {
    it('sums kcal and protein correctly', () => {
      const logs = [
        { kcal: 500, protein: 30, carbs: 50, fats: 10, fiber: 5 },
        { kcal: 300, protein: 20, carbs: null as unknown as number, fats: null as unknown as number, fiber: null as unknown as number },
      ] as FoodLog[];
      const totals = sumNutrition(logs);
      expect(totals.calories).toBe(800);
      expect(totals.protein).toBe(50);
      expect(totals.carbs).toBe(50);
    });
  });

  describe('getTrackedDayCount', () => {
    it('counts unique days across categories', () => {
      const logs = {
        food: [{ time: new Date('2024-01-01T10:00:00Z') }],
        workouts: [{ time: new Date('2024-01-01T15:00:00Z') }, { time: new Date('2024-01-02T10:00:00Z') }],
        sleep: [{ time: new Date('2024-01-03T10:00:00Z') }],
      } as unknown as DashboardState['logs'];
      expect(getTrackedDayCount(logs)).toBe(3);
    });
  });

  describe('getProteinTarget', () => {
    const goals = { proteinTarget: 150, proteinTraining: 180, proteinRest: 120 } as unknown as GoalsState;
    it('returns correct target for day type', () => {
      expect(getProteinTarget(goals, 'Training')).toBe(180);
      expect(getProteinTarget(goals, 'Rest')).toBe(120);
      expect(getProteinTarget(goals, 'Lite' as unknown as "Lite")).toBe(150); // Fallback to proteinTarget if lite not set
    });
  });

  describe('buildDayTypeMap', () => {
    it('converts array to map', () => {
      const entries = [
        { dayKey: '2024-01-01', dayType: 'Training' },
        { dayKey: '2024-01-02', dayType: 'Rest' },
      ] as unknown as DayTypeEntryRecord[];
      const map = buildDayTypeMap(entries);
      expect(map['2024-01-01']).toBe('Training');
      expect(map['2024-01-02']).toBe('Rest');
    });
  });

  describe('buildHistoryRows', () => {
    it('aggregates data into daily rows', () => {
      const logs = {
        food: [{ time: new Date('2024-01-01'), kcal: 2000, protein: 150, carbs: 200, fats: 70, fiber: 30 }],
        workouts: [{ time: new Date('2024-01-01'), focus: 'Legs' }],
        sleep: [{ time: new Date('2024-01-01'), hours: 8 }],
      } as unknown as DashboardState['logs'];
      const goals = { proteinTarget: 160 } as unknown as GoalsState;
      const map = { '2024-01-01': 'Training' } as DayTypeMap;
      
      const rows = buildHistoryRows(logs, goals, map);
      expect(rows).toHaveLength(1);
      expect(rows[0].workout).toBe('Legs');
      expect(rows[0].kcal).toBe(2000);
      expect(rows[0].protein).toBe(150);
      expect(rows[0].status).toBe('pending'); // 150 < 160
    });

    it('handles pending status', () => {
      const goals = { proteinTarget: 100 } as unknown as GoalsState;
      const logs = { food: [{ time: new Date(), protein: 50, kcal: 100 }], workouts: [], sleep: [] } as unknown as DashboardState['logs'];
      const rows = buildHistoryRows(logs, goals, {});
      expect(rows[0].status).toBe('pending');
    });

    it('returns goals.proteinTarget for unknown day types', () => {
       const goals = { proteinTarget: 150 } as unknown as GoalsState;
       expect(getProteinTarget(goals, 'Unknown' as unknown as "Training")).toBe(150);
    });

    it('handles completed status', () => {
      const goals = { proteinTarget: 100 } as unknown as GoalsState;
      const logs = { food: [{ time: new Date(), protein: 120, kcal: 100 }], workouts: [], sleep: [] } as unknown as DashboardState['logs'];
      const rows = buildHistoryRows(logs, goals, {});
      expect(rows[0].status).toBe('completed');
    });

    it('sorts rows by date descending', () => {
      const logs = {
        food: [
          { time: new Date('2024-01-01'), kcal: 100, protein: 10 },
          { time: new Date('2024-01-03'), kcal: 200, protein: 20 },
        ],
        workouts: [],
        sleep: [],
      } as unknown as DashboardState['logs'];
      const rows = buildHistoryRows(logs, {} as unknown as GoalsState, {});
      expect(rows[0].kcal).toBe(200); // 2024-01-03
      expect(rows[1].kcal).toBe(100); // 2024-01-01
    });

    it('covers workout detail and volume branches', () => {
      const logs = {
        food: [],
        workouts: [{ time: new Date(), focus: 'Legs', exercises: [{}, {}], volume: 5000 }],
        sleep: [],
      } as unknown as DashboardState['logs'];
      const rows = buildHistoryRows(logs, {} as unknown as GoalsState, {});
      expect(rows[0].workoutDetail).toBe('2 exercises');
      expect(rows[0].totalVolume).toBe(5000);
    });
  });

  describe('getErrorMessage', () => {
    it('extracts message from Error object', () => {
      expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
    });
    it('returns fallback for non-error types', () => {
      expect(getErrorMessage('string error')).toBe('Unknown error');
    });
  });

  describe('getLocalDateKey', () => {
    it('formats date correctly as YYYY-MM-DD', () => {
      const d = new Date(2024, 0, 15); // Jan 15 2024
      expect(getLocalDateKey(d)).toBe('2024-01-15');
    });
  });

  describe('getTodayFoodLogs', () => {
    it('filters logs for today', () => {
      const today = new Date();
      const logs = [
        { time: today },
        { time: new Date('2020-01-01') }
      ] as FoodLog[];
      expect(getTodayFoodLogs(logs)).toHaveLength(1);
    });
  });

  describe('getLatestSleepLog', () => {
    it('returns first log if exists', () => {
      expect(getLatestSleepLog([{ hours: 8 }] as unknown as SleepLog[])).toEqual({ hours: 8 });
      expect(getLatestSleepLog([])).toBeNull();
    });
  });

  describe('getCurrentDayType', () => {
    it('returns type for today if exists', () => {
      const today = getLocalDateKey(new Date());
      const map = { [today]: 'Training' } as DayTypeMap;
      expect(getCurrentDayType(map)).toBe('Training');
    });
    it('returns Rest as fallback', () => {
      expect(getCurrentDayType({})).toBe('Rest');
    });
  });

  describe('Formatting Helpers', () => {
    it('round handles null values', () => {
       const logs = { 
         food: [{ time: new Date(), kcal: 0, protein: 10 }], 
         workouts: [], 
         sleep: [] 
       } as unknown as DashboardState['logs'];
       const rows = buildHistoryRows(logs, {} as unknown as GoalsState, {});
       expect(rows[0].kcal).toBe(0);
    });

    it('formatNumber handles non-integer and nulls', () => {
       const logs = { 
         food: [], 
         workouts: [], 
         sleep: [{ time: new Date('2024-01-01'), hours: 7.5 }] 
       } as unknown as DashboardState['logs'];
       const rows = buildHistoryRows(logs, {} as unknown as GoalsState, { '2024-01-01': 'Rest' });
       expect(rows[0].sleep).toBe('7.5');
       
       expect(formatNumber(null as unknown as number)).toBe("0");
       expect(formatNumber(undefined as unknown as number)).toBe("0");
       expect(formatNumber(10)).toBe("10");
    });

    it('round handles null values directly', () => {
       expect(round(null as unknown as number)).toBe(0);
       expect(round(10.555)).toBe(10.6);
    });
  });
});
