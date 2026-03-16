import type {
  BodyMeasurement,
  FoodLog,
  Goal,
  SleepLog,
  WorkoutLog,
} from '@prisma/client';

export type AppTheme = 'light' | 'dark';
export type DayType = 'Rest' | 'Training' | 'Lite';
export type TabId = 'chat' | 'log' | 'history' | 'body' | 'profile';

export type GoalsState = Pick<Goal, 'proteinTarget' | 'kcalTarget'>;

export type MeasurementFormField =
  | 'weight'
  | 'waist'
  | 'chest'
  | 'arms'
  | 'thighs'
  | 'hips';

export type MeasurementForm = Record<MeasurementFormField, string>;
export type MeasurementPayload = Record<MeasurementFormField, number | null>;

export type LogsResponse = {
  food: FoodLog[];
  workouts: WorkoutLog[];
  sleep: SleepLog[];
};

export type DayTypeEntryRecord = {
  dayKey: string;
  dayType: DayType;
};

export type DayTypeMap = Record<string, DayType>;

export type NutritionStat = {
  day: string;
  kcal: number;
  protein: number;
};

export type WeightTrendPoint = {
  date: string;
  weight: number;
};

export type AnalyticsResponse = {
  nutritionStats: NutritionStat[];
  averages: {
    kcal: number;
    protein: number;
  };
  weightTrend: WeightTrendPoint[];
  meta: {
    period: string;
    logCount: number;
    measurementCount: number;
  };
};

export type ChatImagePayload = {
  base64: string;
  mediaType: string;
  name: string;
};

export type ChatImageAttachment = ChatImagePayload & {
  id: string;
  previewUrl: string;
};

export type InlineNotice = {
  tone: 'success' | 'error' | 'warning';
  message: string;
};

export type HistoryRow = {
  day: string;
  type: string;
  sleep: string;
  protein: number;
  target: number;
  status: 'completed' | 'pending';
  kcal: number;
  workout: string;
};

export type DashboardState = {
  logs: LogsResponse;
  latestMeasurement: BodyMeasurement | null;
  measurements: MeasurementForm;
  goals: GoalsState;
  analytics: AnalyticsResponse | null;
  dayType: DayType;
  dayTypesByDay: DayTypeMap;
};

export const DEFAULT_GOALS: GoalsState = {
  proteinTarget: 100,
  kcalTarget: 2200,
};

export const EMPTY_MEASUREMENT_FORM: MeasurementForm = {
  weight: '',
  waist: '',
  chest: '',
  arms: '',
  thighs: '',
  hips: '',
};

export const EMPTY_LOGS: LogsResponse = {
  food: [],
  workouts: [],
  sleep: [],
};

export const EMPTY_DAY_TYPES_BY_DAY: DayTypeMap = {};

export const EMPTY_ANALYTICS: AnalyticsResponse = {
  nutritionStats: [],
  averages: {
    kcal: 0,
    protein: 0,
  },
  weightTrend: [],
  meta: {
    period: '7d',
    logCount: 0,
    measurementCount: 0,
  },
};
