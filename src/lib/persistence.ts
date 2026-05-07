import { Prisma } from '@prisma/client';
import prisma from './prisma';
import {
  FoodItemSchema,
  WorkoutLogSchema,
  SleepLogSchema,
  MeasurementSchema,
  UserProfileSchema,
  GoalSchema,
  type FoodItemInput,
  type WorkoutLogInput,
  type SleepLogInput,
  type MeasurementInput,
  type UserProfileInput,
  type GoalInput,
} from './validation';
import { getErrorMessage, getLocalDateKey } from './dashboard';
import { calculateDailyTargets } from './recommendations';
import { syncAchievements, type AchievementBadge } from './achievements';

export type { ParsedLogEnvelope } from './types';

interface ResolvedSet {
  setNumber?: number;
  reps?: number;
  weight?: number;
  distance?: number;
  duration?: number;
}

interface ResolvedExercise {
  id: string | null;
  name: string;
  order: number;
  sets?: ResolvedSet[];
  matchedExercise?: unknown;
}

/**
 * Orchestrates the persistence of multiple log envelopes within a single transaction 
 * per envelope to ensure partial successes don't fail the entire set.
 */
export async function persistLogData(envelopes: ParsedLogEnvelope[], userId: string, clientDate?: string): Promise<AchievementBadge[]> {
  if (envelopes.length === 0) return [];
  console.log(`[PERSISTENCE] Starting persistence for ${envelopes.length} envelopes for user ${userId}`);
  console.log(`[PERSISTENCE] Processing ${envelopes.length} envelopes for user ${userId}`);

  const results = await Promise.allSettled(envelopes.map(async (envelope) => {
    if (!envelope.category) return [];

    const category = envelope.category;
    const logData = envelope.data || envelope;

    console.log(`[PERSISTENCE] Category: ${category}, Data:`, JSON.stringify(logData).substring(0, 500));

    try {
      return await prisma.$transaction(async (tx) => {
        return await handleCategoryPersistence(tx, category, logData, userId, clientDate);
      });
    } catch (error) {
      console.error(`[PERSISTENCE] ERROR for ${category}:`, getErrorMessage(error));
      throw error;
    }
  }));

  const newlyUnlocked: AchievementBadge[] = [];
  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      newlyUnlocked.push(...result.value);
    }
  });

  const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (firstError?.reason) {
    throw firstError.reason;
  }

  // Deduplicate badges unlocked across different envelopes in same batch
  const uniqueBadges = Array.from(new Map(newlyUnlocked.map(b => [b.badgeId, b])).values());
  return uniqueBadges;
}

async function handleCategoryPersistence(
  tx: Prisma.TransactionClient,
  category: string,
  logData: unknown,
  userId: string,
  clientDate?: string
): Promise<AchievementBadge[]> {
  switch (category) {
    case 'food': {
      // Extract envelope-level date for items that don't carry their own
      const envelopeDate = isRecord(logData) && typeof logData.date === 'string' ? logData.date : clientDate;
      if (hasItemsArray(logData)) {
        const itemsWithDate = (logData.items as FoodItemInput[]).map((item) => ({
          ...item,
          date: item.date ?? envelopeDate,
        }));
        await persistFoodLogs(tx, itemsWithDate, userId);
      } else {
        const singleItem = { ...(logData as FoodItemInput), date: (logData as FoodItemInput).date ?? envelopeDate };
        await persistFoodLogs(tx, [singleItem], userId);
      }
      break;
    }
    case 'workout':
      await persistWorkoutLog(tx, logData as WorkoutLogInput, userId);
      break;
    case 'sleep':
      await persistSleepLog(tx, logData as SleepLogInput, userId);
      break;
    case 'measurement':
      await persistMeasurement(tx, logData as MeasurementInput, userId);
      break;
    case 'profile':
      await persistProfileUpdate(tx, logData as UserProfileInput, userId);
      break;
    case 'goals':
      await persistGoalUpdate(tx, logData as GoalInput, userId);
      break;
    case 'dayType':
      await persistDayTypeUpdate(tx, logData, userId, clientDate);
      break;
    case 'delete':
      await persistDeleteAction(tx, logData, userId, clientDate);
      break;
    case 'knowledge':
      await persistKnowledgeEntry(tx, logData as Record<string, unknown>, userId);
      break;
    case 'meal_plan':
      await persistMealPlan(tx, logData as Record<string, unknown>, userId);
      break;
    default:
      console.warn(`Unknown category: ${category}`);
  }

  // Check for new achievements at the end of any valid category persistence
  return await syncAchievements(tx, userId);
}

async function persistFoodLogs(tx: Prisma.TransactionClient, items: FoodItemInput[], userId: string): Promise<void> {

  await Promise.all(items.map(async (item) => {
    const parsed = FoodItemSchema.safeParse(item);
    if (!parsed.success) {
      console.warn('Skipping invalid food log from AI:', parsed.error);
      return;
    }
    const validated = parsed.data;
    const logDate = validated.date ? new Date(validated.date) : new Date();
    
    if (validated.update) {
      // Semantic update: find Most recent entry with same name on this day
      const startOfDay = new Date(logDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(logDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await tx.foodLog.findFirst({
        where: {
          userId,
          name: { equals: validated.name },
          time: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: { time: 'desc' },
      });

      if (existing) {
        await tx.foodLog.update({
          where: { id: existing.id },
          data: {
            kcal: validated.kcal,
            protein: validated.protein,
            carbs: validated.carbs,
            fats: validated.fats,
            fiber: validated.fiber,
            water: validated.water,
          },
        });
        return;
      }
    }

    await tx.foodLog.create({
      data: {
        userId,
        name: validated.name,
        kcal: validated.kcal,
        protein: validated.protein,
        carbs: validated.carbs,
        fats: validated.fats,
        fiber: validated.fiber,
        water: validated.water,
        time: validated.date ? new Date(validated.date) : undefined,
      },
    });
  }));
}

async function persistWorkoutLog(tx: Prisma.TransactionClient, data: WorkoutLogInput, userId: string): Promise<void> {
  const parsed = WorkoutLogSchema.safeParse(data);
  if (!parsed.success) {
    console.error('[PERSISTENCE] Workout validation failed:', JSON.stringify(parsed.error.issues, null, 2));
    console.warn('Skipping invalid workout log from AI:', parsed.error);
    return;
  }

  const validated = parsed.data;
  const logDate = validated.date ? new Date(validated.date) : new Date();
  const prs = getRecordValue(data, 'prs');
  const detailsFallback = prs ? JSON.stringify(prs) : undefined;

  // Resolve exercises and prepare config
  const resolvedExercises = await resolveWorkoutExercises(tx, validated.exercises);
  const exercisesConfig = createExercisesConfig(resolvedExercises);

  // Upsert the workout log
  await upsertWorkoutLog(tx, {
    userId,
    validated,
    logDate,
    detailsFallback,
    exercisesConfig
  });

  // Track and Update Personal Records
  await updatePersonalRecords(tx, userId, resolvedExercises);
}

async function resolveWorkoutExercises(tx: Prisma.TransactionClient, exercises?: WorkoutLogInput['exercises']) {
  if (!exercises) return [];
  
  return await Promise.all(
    exercises.map(async (ex, exIdx) => {
      const matched = ex.exerciseId 
        ? await tx.exercise.findUnique({ where: { id: ex.exerciseId } })
        : await tx.exercise.findFirst({ where: { name: { equals: ex.name } } });
      
      return {
        ...ex,
        id: matched?.id || null,
        order: exIdx,
        matchedExercise: matched
      };
    })
  );
}

function createExercisesConfig(resolvedExercises: ResolvedExercise[]) {
  return {
    create: resolvedExercises.map((ex) => ({
      exerciseId: ex.id,
      customName: ex.id ? null : ex.name,
      order: ex.order,
      sets: ex.sets
        ? {
            create: ex.sets.map((set: ResolvedSet, setIdx: number) => ({
              setNumber: set.setNumber ?? setIdx + 1,
              reps: set.reps,
              weight: set.weight,
              distance: set.distance,
              duration: set.duration,
            })),
          }
        : undefined,
    }))
  };
}

async function upsertWorkoutLog(tx: Prisma.TransactionClient, params: {
  userId: string;
  validated: WorkoutLogInput;
  logDate: Date;
  detailsFallback?: string;
  exercisesConfig: {
    create: {
      exerciseId: string | null;
      customName: string | null;
      order: number;
      sets: {
        create: {
          setNumber: number;
          reps: number | undefined;
          weight: number | undefined;
          distance: number | undefined;
          duration: number | undefined;
        }[];
      } | undefined;
    }[];
  };
}) {
  const { userId, validated, logDate, detailsFallback, exercisesConfig } = params;

  if (validated.update) {
    const startOfDay = new Date(logDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(logDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await tx.workoutLog.findFirst({
      where: {
        userId,
        focus: { equals: validated.focus },
        time: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { time: 'desc' },
    });

    if (existing) {
      await tx.workoutLog.update({
        where: { id: existing.id },
        data: {
          volume: validated.volume ?? existing.volume,
          details: validated.details || detailsFallback || existing.details,
          exercises: {
            deleteMany: {},
            ...exercisesConfig
          }
        },
      });
      return;
    }
  }

  await tx.workoutLog.create({
    data: {
      userId,
      focus: validated.focus,
      volume: validated.volume,
      details: validated.details || detailsFallback,
      time: validated.date ? new Date(validated.date) : undefined,
      exercises: exercisesConfig,
    },
  });
}

export async function updatePersonalRecords(tx: Prisma.TransactionClient, userId: string, resolvedExercises: ResolvedExercise[]) {
  for (const ex of resolvedExercises) {
    if (!ex.id || !ex.sets) continue;

    let maxWeight = 0;
    let max1RM = 0;

    ex.sets.forEach((set: ResolvedSet) => {
      const w = set.weight || 0;
      const r = set.reps || 0;
      const rm = w * (1 + r / 30);
      
      if (w > maxWeight) maxWeight = w;
      if (rm > max1RM) max1RM = rm;
    });

    if (maxWeight > 0 || max1RM > 0) {
      const existingPr = await tx.personalRecord.findUnique({
        where: { userId_exerciseId: { userId, exerciseId: ex.id } }
      });

      if (existingPr) {
        await tx.personalRecord.update({
          where: { id: existingPr.id },
          data: {
            maxWeight: Math.max(existingPr.maxWeight || 0, maxWeight),
            max1RM: Math.max(existingPr.max1RM || 0, max1RM)
          }
        });
      } else {
        await tx.personalRecord.create({
          data: { userId, exerciseId: ex.id, maxWeight, max1RM }
        });
      }
    }
  }
}

async function persistSleepLog(tx: Prisma.TransactionClient, data: SleepLogInput, userId: string): Promise<void> {

  const parsed = SleepLogSchema.safeParse(data);
  if (!parsed.success) {
    console.warn('Skipping invalid sleep log from AI:', parsed.error);
    return;
  }
  const validated = parsed.data;
  const logDate = validated.date ? new Date(validated.date) : new Date();

  if (validated.update) {
    const startOfDay = new Date(logDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(logDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await tx.sleepLog.findFirst({
      where: {
        userId,
        time: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { time: 'desc' },
    });

    if (existing) {

      await tx.sleepLog.update({
        where: { id: existing.id },
        data: {
          hours: validated.hours,
          bedTime: validated.bedTime || getStringValue(data, 'bed'),
          wakeTime: validated.wakeTime || getStringValue(data, 'wake'),
        },
      });
      return;
    }
  }

  await tx.sleepLog.create({
    data: {
      userId,
      hours: validated.hours,
      bedTime: validated.bedTime || getStringValue(data, 'bed'),
      wakeTime: validated.wakeTime || getStringValue(data, 'wake'),
      time: validated.date ? new Date(validated.date) : undefined,
    },
  });
}

async function persistMeasurement(tx: Prisma.TransactionClient, data: MeasurementInput, userId: string): Promise<void> {

  const parsed = MeasurementSchema.safeParse(data);
  if (!parsed.success) {
    console.warn('Skipping invalid measurement trace from AI:', parsed.error);
    return;
  }
  const validated = parsed.data;
  const logDate = validated.date ? new Date(validated.date) : new Date();

  if (validated.update) {
    const startOfDay = new Date(logDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(logDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await tx.bodyMeasurement.findFirst({
      where: {
        userId,
        time: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { time: 'desc' },
    });

    if (existing) {
      await tx.bodyMeasurement.update({
        where: { id: existing.id },
        data: {
          weight: validated.weight,
          waist: validated.waist,
          chest: validated.chest,
          arms: validated.arms,
          thighs: validated.thighs,
          hips: validated.hips,
          calves: validated.calves,
          neck: validated.neck,
          bodyFat: validated.bodyFat,
        },
      });
      await syncUserGoals(tx, userId);
      return;
    }
  }

  await tx.bodyMeasurement.create({
    data: {
      userId,
      weight: validated.weight,
      waist: validated.waist,
      chest: validated.chest,
      arms: validated.arms,
      thighs: validated.thighs,
      hips: validated.hips,
      calves: validated.calves,
      neck: validated.neck,
      bodyFat: validated.bodyFat,
      time: validated.date ? new Date(validated.date) : undefined,
    },
  });
  await syncUserGoals(tx, userId);
}


async function persistProfileUpdate(tx: Prisma.TransactionClient, raw: UserProfileInput, userId: string): Promise<void> {

  const parsed = UserProfileSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn('Skipping invalid profile update from AI:', parsed.error);
    return;
  }
  const validated = parsed.data;
  await tx.userProfile.upsert({
    where: { userId },
    create: { userId, ...validated },
    update: validated,
  });

  // Automatically recalculate goals when profile changes
  await syncUserGoals(tx, userId);
}


async function persistGoalUpdate(tx: Prisma.TransactionClient, raw: GoalInput, userId: string): Promise<void> {

  const parsed = GoalSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn('Skipping invalid goal update from AI:', parsed.error);
    return;
  }
  const validated = parsed.data;
  await tx.goal.upsert({
    where: { userId },
    create: { userId, ...validated },
    update: validated,
  });
}

/**
 * Utility to keep Goal table in sync with UserProfile and latest weight.
 */
export async function syncUserGoals(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const [profile, latestMeasurement] = await Promise.all([
    tx.userProfile.findUnique({ where: { userId } }),
    tx.bodyMeasurement.findFirst({
      where: { userId, weight: { not: null } },
      orderBy: { time: 'desc' },
    }),
  ]);

  if (!profile || !latestMeasurement?.weight) {
    return; // Cannot calculate without profile + weight
  }

  const targets = calculateDailyTargets({
    gender: profile.gender,
    age: profile.age,
    height: profile.height,
    weight: latestMeasurement.weight,
    activityPreference: profile.activityPreference,
    primaryGoal: profile.primaryGoal,
    dietaryPreference: profile.dietaryPreference,
  });

  if (targets) {
    await tx.goal.upsert({
      where: { userId },
      create: {
        userId,
        kcalTarget: targets.kcalTarget,
        proteinTarget: targets.proteinTarget,
        carbsTarget: targets.carbsTarget,
        fatsTarget: targets.fatsTarget,
      },
      update: {
        kcalTarget: targets.kcalTarget,
        proteinTarget: targets.proteinTarget,
        carbsTarget: targets.carbsTarget,
        fatsTarget: targets.fatsTarget,
      },
    });
    console.log(
      `[PERSISTENCE] Synchronized goals for ${userId}: ${targets.kcalTarget} kcal, ${targets.proteinTarget}g P, ${targets.carbsTarget}g C, ${targets.fatsTarget}g F`
    );
  }
}


async function persistDayTypeUpdate(tx: Prisma.TransactionClient, raw: unknown, userId: string, clientDate?: string): Promise<void> {

  const data = raw as Record<string, unknown>;
  const dayKey = (data.dayKey as string) || clientDate || getLocalDateKey(new Date());
  
  let dayType = (data.dayType as string) || (data.type as string) || '';
  // Normalize case and common variations
  const searchVal = dayType.toLowerCase();
  if (searchVal.includes('train')) dayType = 'Training';
  else if (searchVal.includes('rest')) dayType = 'Rest';
  else if (searchVal.includes('lite') || searchVal.includes('light')) dayType = 'Lite';
  else {
    console.warn(`[PERSISTENCE] Invalid DayType received: "${dayType}". Defaulting to Rest.`);
    dayType = 'Rest';
  }

  // dayKey is already declared above

  await tx.dayTypeEntry.upsert({
    where: {
      userId_dayKey: {
        userId,
        dayKey,
      },
    },
    update: {
      dayType,
    },
    create: {
      userId,
      dayKey,
      dayType,
    },
  });
  // Logic to upsert day type...
}

async function persistDeleteAction(
  tx: Prisma.TransactionClient,
  raw: unknown,
  userId: string,
  clientDate?: string
): Promise<void> {
  if (!isRecord(raw)) {
    console.warn('[PERSISTENCE] Delete action received non-object data');
    return;
  }

  const target = typeof raw.target === 'string' ? raw.target : '';
  const name = typeof raw.name === 'string' ? raw.name : '';
  const dateStr = typeof raw.date === 'string' ? raw.date : clientDate;

  if (!target) {
    console.warn('[PERSISTENCE] Delete action missing "target" category');
    return;
  }

  const logDate = dateStr ? new Date(dateStr) : new Date();
  const startOfDay = new Date(logDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(logDate);
  endOfDay.setHours(23, 59, 59, 999);
  const dateRange = { gte: startOfDay, lte: endOfDay };

  const focus = name || (typeof raw.focus === 'string' ? raw.focus : '');

  const handlers: Record<string, () => Promise<void>> = {
    food: () => deleteFoodEntry(tx, userId, dateRange, name),
    workout: () => deleteWorkoutEntry(tx, userId, dateRange, focus),
    sleep: () => deleteSingleEntry(tx.sleepLog, userId, dateRange),
    measurement: () => deleteSingleEntry(tx.bodyMeasurement, userId, dateRange),
    knowledge: () => deleteKnowledgeEntry(tx, raw, userId),
    water: async () => { await tx.foodLog.deleteMany({ where: { userId, time: dateRange, NOT: { water: null } } }); },
    all: async () => {
      await Promise.all([
        tx.foodLog.deleteMany({ where: { userId, time: dateRange } }),
        tx.workoutLog.deleteMany({ where: { userId, time: dateRange } }),
        tx.sleepLog.deleteMany({ where: { userId, time: dateRange } }),
        tx.bodyMeasurement.deleteMany({ where: { userId, time: dateRange } }),
      ]);
    },
  };

  const handler = handlers[target];
  if (handler) {
    await handler();
  } else {
    console.warn(`[PERSISTENCE] Unknown delete target: "${target}"`);
  }
}

type TimeRangeFilter = { gte: Date; lte: Date };

async function deleteFoodEntry(
  tx: Prisma.TransactionClient, userId: string, dateRange: TimeRangeFilter, name: string
): Promise<void> {
  if (name) {
    const entry = await tx.foodLog.findFirst({
      where: { userId, name: { equals: name }, time: dateRange },
      orderBy: { time: 'desc' },
    });
    if (entry) {
      await tx.foodLog.delete({ where: { id: entry.id } });
    } else {
      console.warn(`[PERSISTENCE] No food log found to delete: "${name}"`);
    }
  } else {
    await tx.foodLog.deleteMany({ where: { userId, time: dateRange } });
  }
}

async function deleteWorkoutEntry(
  tx: Prisma.TransactionClient, userId: string, dateRange: TimeRangeFilter, focus: string
): Promise<void> {
  if (focus) {
    const entry = await tx.workoutLog.findFirst({
      where: { userId, focus: { equals: focus }, time: dateRange },
      orderBy: { time: 'desc' },
    });
    if (entry) {
      await tx.workoutLog.delete({ where: { id: entry.id } });
    } else {
      console.warn(`[PERSISTENCE] No workout log found to delete: "${focus}"`);
    }
  } else {
    await tx.workoutLog.deleteMany({ where: { userId, time: dateRange } });
  }
}

async function deleteSingleEntry(
  model: { findFirst: (args: { where: { userId: string; time: TimeRangeFilter }; orderBy: { time: 'desc' } }) => Promise<{ id: string } | null>; delete: (args: { where: { id: string } }) => Promise<unknown> },
  userId: string,
  dateRange: TimeRangeFilter,
): Promise<void> {
  const entry = await model.findFirst({
    where: { userId, time: dateRange },
    orderBy: { time: 'desc' },
  });
  if (entry) {
    await model.delete({ where: { id: entry.id } });
  }
}

async function persistKnowledgeEntry(tx: Prisma.TransactionClient, data: Record<string, unknown>, userId: string): Promise<void> {
  const key = typeof data.key === 'string' ? data.key.toLowerCase() : '';
  const value = typeof data.value === 'string' ? data.value : '';

  if (!key || !value) return;

  await tx.userKnowledge.upsert({
    where: { userId_key: { userId, key } },
    update: { value },
    create: { userId, key, value }
  });
}

async function persistMealPlan(tx: Prisma.TransactionClient, data: Record<string, unknown>, userId: string): Promise<void> {
  const entries = data.entries as Record<string, unknown>[] | undefined;
  if (!entries || !Array.isArray(entries)) return;

  await tx.mealPlan.create({
    data: {
      userId,
      name: (data.name as string) || "AI Generated Plan",
      weekStarting: data.weekStarting ? new Date(data.weekStarting as string) : new Date(),
      entries: {
        create: entries.map((e) => ({
          dayIndex: (e.dayIndex as number) ?? 0,
          mealType: (e.mealType as string) || 'Meal',
          title: (e.title as string) || 'Untitled Meal',
          kcal: e.kcal as number,
          protein: e.protein as number,
          carbs: e.carbs as number,
          fats: e.fats as number,
          notes: e.notes as string
        }))
      }
    }
  });
}

function hasItemsArray(value: unknown): value is { items: unknown[] } {
  return isRecord(value) && Array.isArray(value.items);
}

export function getRecordValue(value: unknown, key: string): unknown {
  if (!isRecord(value)) {
    return undefined;
  }

  return value[key];
}

export function getStringValue(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const nestedValue = value[key];
  return typeof nestedValue === 'string' ? nestedValue : undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
async function deleteKnowledgeEntry(tx: Prisma.TransactionClient, data: Record<string, unknown>, userId: string): Promise<void> {
  const key = typeof data.key === 'string' ? data.key.toLowerCase() : '';
  if (!key) return;

  const entry = await tx.userKnowledge.findFirst({
    where: { userId, key: { equals: key, mode: 'insensitive' } }
  });

  if (entry) {
    await tx.userKnowledge.delete({ where: { id: entry.id } });
  }
}
