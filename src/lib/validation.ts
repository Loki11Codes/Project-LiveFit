import { z } from "zod";

/**
 * Lightweight E.164 phone validation to avoid importing `react-phone-number-input`
 * (which contains client-side class components that break Turbopack server builds).
 */
function isValidPhoneNumber(value: string): boolean {
  // E.164: starts with +, 7-15 digits total
  return /^\+[1-9]\d{6,14}$/.test(value);
}

export const fallbackNumber = (min?: number, max?: number) => {
  let schema = z.number();
  if (min !== undefined) schema = schema.min(min);
  if (max !== undefined) schema = schema.max(max);
  return z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return 0;
    const n = Number(val);
    return Number.isFinite(n) ? n : val;
  }, schema);
};

export const optionalFiniteNumber = z.preprocess((val) => {
  if (val === null || val === undefined || val === "") return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : val;
}, z.number().optional());

export const optionalNullableFiniteNumber = z.preprocess((val) => {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : val;
}, z.number().nullable().optional());
const trimmedString = z.string().trim();

export const DayTypeSchema = z.enum(["Rest", "Training", "Lite"]);
export type DayTypeInput = z.infer<typeof DayTypeSchema>;

export const DayTypeEntrySchema = z.object({
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayType: DayTypeSchema,
});
export type DayTypeEntryInput = z.infer<typeof DayTypeEntrySchema>;

// Goals Validation
export const GoalSchema = z.object({
  proteinTarget: fallbackNumber(0, 500),
  kcalTarget: fallbackNumber(0, 10000),
  carbsTarget: optionalNullableFiniteNumber,
  fatsTarget: optionalNullableFiniteNumber,
  proteinTraining: optionalNullableFiniteNumber,
  proteinRest: optionalNullableFiniteNumber,
  proteinLite: optionalNullableFiniteNumber,
  waterTarget: optionalNullableFiniteNumber,
  sleepTarget: optionalNullableFiniteNumber,
  workoutDuration: optionalNullableFiniteNumber,
});
export type GoalInput = z.infer<typeof GoalSchema>;

// User Profile Validation
export const UserProfileSchema = z.object({
  name: z.string().max(100).nullable().optional(),
  username: z.string().max(100).nullable().optional(),
  phone: z.string().max(20).nullable().optional().refine((val) => {
    if (!val) return true;
    return isValidPhoneNumber(val);
  }, { message: "Invalid phone number format" }),
  age: z.coerce.number().int().min(0).max(150).nullable().optional(),
  gender: z.string().max(20).nullable().optional(),
  height: optionalNullableFiniteNumber,
  startDay: z.number().int().min(1).nullable().optional(),
  accentColor: z.string().regex(/^#[\dA-Fa-f]{6}$/).optional(),
  primaryGoal: z.string().max(100).nullable().optional(),
  dietaryPreference: z.string().max(100).nullable().optional(),
  activityPreference: z.string().max(100).nullable().optional(),
  darkMode: z.boolean().optional(),
  hapticFeedback: z.boolean().optional(),
  workoutReminders: z.boolean().optional(),
  mealLogging: z.boolean().optional(),
  waterCheckIns: z.boolean().optional(),
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
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  update: z.boolean().optional(),
});
export type MeasurementInput = z.infer<typeof MeasurementSchema>;

// Food Log Item Validation (Used for manual or AI logs)
export const FoodItemSchema = z.object({
  name: trimmedString.min(1).max(120),
  protein: fallbackNumber(0),
  kcal: fallbackNumber(0),
  carbs: optionalFiniteNumber,
  fats: optionalFiniteNumber,
  fiber: optionalFiniteNumber,
  water: optionalFiniteNumber,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  update: z.boolean().optional(),
});
export type FoodItemInput = z.infer<typeof FoodItemSchema>;

// Workout Log Validation
export const WorkoutSetSchema = z.object({
  setNumber: z.number().int().optional(),
  reps: optionalFiniteNumber,
  weight: optionalFiniteNumber,
  distance: optionalFiniteNumber,
  duration: z.number().int().optional(),
});
export type WorkoutSetInput = z.infer<typeof WorkoutSetSchema>;

export const WorkoutExerciseSchema = z.object({
  name: trimmedString.min(1).max(120),
  exerciseId: z.string().optional(),
  sets: z.array(WorkoutSetSchema).optional(),
});
export type WorkoutExerciseInput = z.infer<typeof WorkoutExerciseSchema>;

export const WorkoutLogSchema = z.object({
  focus: trimmedString.min(1, "Focus is required").max(120).default("Workout"),
  volume: optionalFiniteNumber,
  details: trimmedString.max(2000).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  update: z.boolean().optional(),
  duration: z.number().int().optional(), // total duration in mins
  exercises: z.array(WorkoutExerciseSchema).optional(),
});
export type WorkoutLogInput = z.infer<typeof WorkoutLogSchema>;

// Sleep Log Validation
export const SleepLogSchema = z.object({
  hours: fallbackNumber(0, 24),
  bedTime: trimmedString.max(40).optional(),
  wakeTime: trimmedString.max(40).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  update: z.boolean().optional(),
});
export type SleepLogInput = z.infer<typeof SleepLogSchema>;

export const ChatHistoryPartSchema = z.object({
  text: z.string().max(4000),
});
export type ChatHistoryPartInput = z.infer<typeof ChatHistoryPartSchema>;

export const ChatHistoryMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  parts: z.array(ChatHistoryPartSchema).max(20),
});
export type ChatHistoryMessageInput = z.infer<typeof ChatHistoryMessageSchema>;

export const ChatAttachmentPayloadSchema = z.object({
  base64: z.string().min(1),
  mediaType: z.string().regex(/^(image|audio)\//),
  name: trimmedString.min(1).max(180),
});
export type ChatAttachmentPayloadInput = z.infer<
  typeof ChatAttachmentPayloadSchema
>;

export const ChatRequestSchema = z
  .object({
    prompt: z.string().max(4000),
    history: z.array(ChatHistoryMessageSchema).max(200),
    images: z.array(ChatAttachmentPayloadSchema).max(6),
    clientDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    clientTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    userContext: z
      .object({
        profile: z.any().nullable(),
        goals: z.any(),
        analytics: z.any().nullable(),
        dayType: z.string(),
        todaysStats: z.object({
          protein: z.number(),
          kcal: z.number(),
          water: z.number(),
        }),
        knowledge: z.array(z.any()).optional(),
        prs: z.array(z.any()).optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.prompt.trim() && value.images.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "A prompt or at least one image/audio attachment is required.",
        path: ["prompt"],
      });
    }
  });
export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "yopmail.com", "guerrillamail.com", "temp-mail.org", 
  "10minutemail.com", "throwawaymail.com", "dispostable.com", "sharklasers.com",
  "getnada.com", "maildrop.cc", "mail-temporaire.fr"
]);

export const SignupSchema = z
  .object({
    name: trimmedString.min(1).max(80),
    email: z
      .string()
      .trim()
      .regex(
        /^[\w.%+-]{1,64}@[\w.-]{1,191}\.[a-zA-Z]{2,8}$/,
        "Invalid email address",
      )
      .max(160),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .max(72)
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/\d/, "Must contain at least one number")
      .regex(/[^\w\s]|_/, "Must contain at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => {
    const domain = data.email.split("@")[1]?.toLowerCase();
    return !DISPOSABLE_EMAIL_DOMAINS.has(domain || "");
  }, {
    message: "Disposable email addresses are not allowed. Please use a real email.",
    path: ["email"],
  });
export type SignupInput = z.infer<typeof SignupSchema>;
