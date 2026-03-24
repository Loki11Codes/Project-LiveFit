import type {
  BodyMeasurement,
  FoodLog,
  SleepLog,
  WorkoutLog,
} from '@prisma/client';

export type AppTheme = 'light' | 'dark';
export type DayType = 'Rest' | 'Training' | 'Lite';
export type TabId = 'chat' | 'log' | 'history' | 'body' | 'profile';

export type GoalsState = {
  proteinTarget: number;
  kcalTarget: number;
  proteinTraining?: number | null;
  proteinRest?: number | null;
  proteinLite?: number | null;
  waterTarget?: number | null;
  sleepTarget?: number | null;
};

export type UserProfile = {
  age?: number | null;
  gender?: string | null;
  height?: number | null;
  startDay?: number | null;
  primaryGoal?: string | null;
  day1?: string | null;
  day2?: string | null;
  day3?: string | null;
  day4?: string | null;
  day5?: string | null;
  day6?: string | null;
};

export type MeasurementFormField =
  | 'weight'
  | 'waist'
  | 'chest'
  | 'arms'
  | 'thighs'
  | 'hips'
  | 'calves'
  | 'neck'
  | 'bodyFat';

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

export type ParsedLogEnvelope = {
  category?: string;
  data?: unknown;
};

export type HistoryRow = {
  day: string;
  type: string;
  sleep: string;
  protein: number;
  target: number;
  status: 'completed' | 'pending';
  kcal: number;
  carbs: number;
  fats: number;
  fiber: number;
  workout: string;
};

export type DashboardState = {
  logs: LogsResponse;
  latestMeasurement: BodyMeasurement | null;
  measurements: MeasurementForm;
  goals: GoalsState;
  profile: UserProfile | null;
  analytics: AnalyticsResponse | null;
  dayType: DayType;
  dayTypesByDay: DayTypeMap;
};

export const DEFAULT_GOALS: GoalsState = {
  proteinTarget: 100,
  kcalTarget: 2200,
  proteinTraining: 100,
  proteinRest: 80,
  proteinLite: 57,
  waterTarget: 5.5,
  sleepTarget: 7.5,
};

export const EMPTY_MEASUREMENT_FORM: MeasurementForm = {
  weight: '',
  waist: '',
  chest: '',
  arms: '',
  thighs: '',
  hips: '',
  calves: '',
  neck: '',
  bodyFat: '',
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
