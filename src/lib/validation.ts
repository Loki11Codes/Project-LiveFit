import { z } from 'zod';

// Goals Validation
export const GoalSchema = z.object({
  proteinTarget: z.number().min(0).max(500),
  kcalTarget: z.number().min(0).max(10000),
});

// Measurements Validation
export const MeasurementSchema = z.object({
  weight: z.number().nullable().optional(),
  waist: z.number().nullable().optional(),
  chest: z.number().nullable().optional(),
  arms: z.number().nullable().optional(),
  thighs: z.number().nullable().optional(),
  hips: z.number().nullable().optional(),
});

// Food Log Item Validation (Used for manual or AI logs)
export const FoodItemSchema = z.object({
  name: z.string().min(1),
  protein: z.number().min(0),
  kcal: z.number().min(0),
  carbs: z.number().optional(),
  fats: z.number().optional(),
  fiber: z.number().optional(),
});

// Workout Log Validation
export const WorkoutLogSchema = z.object({
  focus: z.string().min(1),
  volume: z.number().optional(),
  details: z.string().optional(),
});

// Sleep Log Validation
export const SleepLogSchema = z.object({
  hours: z.number().min(0).max(24),
  bedTime: z.string().optional(),
  wakeTime: z.string().optional(),
});
