import { z } from 'zod';

const finiteNumber = z.number().finite();
const optionalFiniteNumber = finiteNumber.optional();
const optionalNullableFiniteNumber = finiteNumber.nullable().optional();
const trimmedString = z.string().trim();

export const DayTypeSchema = z.enum(['Rest', 'Training', 'Lite']);
export type DayTypeInput = z.infer<typeof DayTypeSchema>;

export const DayTypeEntrySchema = z.object({
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayType: DayTypeSchema,
});
export type DayTypeEntryInput = z.infer<typeof DayTypeEntrySchema>;

// Goals Validation
export const GoalSchema = z.object({
  proteinTarget: finiteNumber.min(0).max(500),
  kcalTarget: finiteNumber.min(0).max(10000),
  proteinTraining: optionalNullableFiniteNumber,
  proteinRest: optionalNullableFiniteNumber,
  proteinLite: optionalNullableFiniteNumber,
  waterTarget: optionalNullableFiniteNumber,
  sleepTarget: optionalNullableFiniteNumber,
});
export type GoalInput = z.infer<typeof GoalSchema>;

// User Profile Validation
export const UserProfileSchema = z.object({
  age: z.number().int().min(0).max(150).nullable().optional(),
  gender: z.string().max(20).nullable().optional(),
  height: optionalNullableFiniteNumber,
  startDay: z.number().int().min(1).nullable().optional(),
  primaryGoal: z.string().max(100).nullable().optional(),
  day1: z.string().max(200).nullable().optional(),
  day2: z.string().max(200).nullable().optional(),
  day3: z.string().max(200).nullable().optional(),
  day4: z.string().max(200).nullable().optional(),
  day5: z.string().max(200).nullable().optional(),
  day6: z.string().max(200).nullable().optional(),
});
export type UserProfileInput = z.infer<typeof UserProfileSchema>;

// Measurements Validation
export const MeasurementSchema = z.object({
  weight: optionalNullableFiniteNumber,
  waist: optionalNullableFiniteNumber,
  chest: optionalNullableFiniteNumber,
  arms: optionalNullableFiniteNumber,
  thighs: optionalNullableFiniteNumber,
  hips: optionalNullableFiniteNumber,
  calves: optionalNullableFiniteNumber,
  neck: optionalNullableFiniteNumber,
  bodyFat: optionalNullableFiniteNumber,
});
export type MeasurementInput = z.infer<typeof MeasurementSchema>;

// Food Log Item Validation (Used for manual or AI logs)
export const FoodItemSchema = z.object({
  name: trimmedString.min(1).max(120),
  protein: finiteNumber.min(0),
  kcal: finiteNumber.min(0),
  carbs: optionalFiniteNumber,
  fats: optionalFiniteNumber,
  fiber: optionalFiniteNumber,
});
export type FoodItemInput = z.infer<typeof FoodItemSchema>;

// Workout Log Validation
export const WorkoutLogSchema = z.object({
  focus: trimmedString.min(1).max(120),
  volume: optionalFiniteNumber,
  details: trimmedString.max(2000).optional(),
});
export type WorkoutLogInput = z.infer<typeof WorkoutLogSchema>;

// Sleep Log Validation
export const SleepLogSchema = z.object({
  hours: finiteNumber.min(0).max(24),
  bedTime: trimmedString.max(40).optional(),
  wakeTime: trimmedString.max(40).optional(),
});
export type SleepLogInput = z.infer<typeof SleepLogSchema>;

export const ChatHistoryPartSchema = z.object({
  text: z.string().max(4000),
});
export type ChatHistoryPartInput = z.infer<typeof ChatHistoryPartSchema>;

export const ChatHistoryMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(ChatHistoryPartSchema).max(20),
});
export type ChatHistoryMessageInput = z.infer<typeof ChatHistoryMessageSchema>;

export const ChatImagePayloadSchema = z.object({
  base64: z.string().min(1),
  mediaType: z.string().startsWith('image/'),
  name: trimmedString.min(1).max(180),
});
export type ChatImagePayloadInput = z.infer<typeof ChatImagePayloadSchema>;

export const ChatRequestSchema = z
  .object({
    prompt: z.string().max(4000),
    history: z.array(ChatHistoryMessageSchema).max(50),
    images: z.array(ChatImagePayloadSchema).max(6),
  })
  .superRefine((value, ctx) => {
    if (!value.prompt.trim() && value.images.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A prompt or at least one image is required.',
        path: ['prompt'],
      });
    }
  });
export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;

export const SignupSchema = z.object({
  name: trimmedString.min(1).max(80),
  email: trimmedString.email().max(160),
  password: z.string().min(6).max(72),
});
export type SignupInput = z.infer<typeof SignupSchema>;
