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

export type ParsedLogEnvelope = {
  category?: string;
  data?: unknown;
};

/**
 * Orchestrates the persistence of multiple log envelopes within a single transaction 
 * per envelope to ensure partial successes don't fail the entire set.
 */
export async function persistLogData(envelopes: ParsedLogEnvelope[], userId: string, clientDate?: string): Promise<void> {
  if (envelopes.length === 0) return;

  for (const envelope of envelopes) {
    if (!envelope.category) continue;

    const category = envelope.category;
    const logData = envelope.data || envelope;

    try {
      await prisma.$transaction(async (tx) => {
        await handleCategoryPersistence(tx, category, logData, userId, clientDate);
      });
    } catch (error) {
      console.error(`Persistence failed for ${category}:`, getErrorMessage(error));
      throw error;
    }
  }
}

async function handleCategoryPersistence(
  tx: Prisma.TransactionClient,
  category: string,
  logData: unknown,
  userId: string,
  clientDate?: string
): Promise<void> {
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
    default:
      console.warn(`Unknown category: ${category}`);
  }
}

async function persistFoodLogs(tx: Prisma.TransactionClient, items: FoodItemInput[], userId: string): Promise<void> {

  for (const item of items) {
    const parsed = FoodItemSchema.safeParse(item);
    if (!parsed.success) {
      console.warn('Skipping invalid food log from AI:', parsed.error);
      continue;
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
          },
        });
        continue;
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
        time: validated.date ? new Date(validated.date) : undefined,
      },
    });
  }
}

async function persistWorkoutLog(tx: Prisma.TransactionClient, data: WorkoutLogInput, userId: string): Promise<void> {

  const parsed = WorkoutLogSchema.safeParse(data);
  if (!parsed.success) {
    console.warn('Skipping invalid workout log from AI:', parsed.error);
    return;
  }
  const validated = parsed.data;
  const logDate = validated.date ? new Date(validated.date) : new Date();
  const prs = getRecordValue(data, 'prs');
  const detailsFallback = prs ? JSON.stringify(prs) : undefined;
  
  const exercisesConfig = validated.exercises ? {
    create: await Promise.all(
      validated.exercises.map(async (ex, exIdx) => {
        const matched = await tx.exercise.findFirst({
          where: { name: { equals: ex.name } },
        });
        return {
          exerciseId: matched?.id || null,
          customName: matched ? null : ex.name,
          order: exIdx,
          sets: ex.sets
            ? {
                create: ex.sets.map((set) => ({
                  setNumber: set.setNumber,
                  reps: set.reps,
                  weight: set.weight,
                  distance: set.distance,
                  duration: set.duration,
                })),
              }
            : undefined,
        };
      })
    ),
  } : undefined;

  if (validated.update) {
    const startOfDay = new Date(logDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(logDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await tx.workoutLog.findFirst({
      where: {
        userId,
        focus: { equals: validated.focus },
        time: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { time: 'desc' },
    });

    if (existing) {

      await tx.workoutLog.update({
        where: { id: existing.id },
        data: {
          volume: validated.volume,
          details: validated.details || detailsFallback,
          exercises: exercisesConfig ? {
            deleteMany: {}, // Clear old sets for clean recreation
            ...exercisesConfig
          } : undefined
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

function hasItemsArray(value: unknown): value is { items: unknown[] } {
  return isRecord(value) && Array.isArray(value.items);
}

function getRecordValue(value: unknown, key: string): unknown {
  if (!isRecord(value)) {
    return undefined;
  }

  return value[key];
}

function getStringValue(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const nestedValue = value[key];
  return typeof nestedValue === 'string' ? nestedValue : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
