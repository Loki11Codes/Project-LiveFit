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

export async function persistLogData(envelopes: ParsedLogEnvelope[], userId: string, clientDate?: string) {
  if (envelopes.length === 0) return;

  for (const envelope of envelopes) {
    if (!envelope.category) continue;

    // AI might send { category: '...', data: { ... } } OR { category: '...', field1: '...', field2: '...' }
    // We handle the "flat" case by using the envelope itself as data if 'data' property is missing.
    const category = envelope.category;
    const logData = envelope.data || envelope;

    try {
      await prisma.$transaction(async (tx) => {
        switch (category) {
          case 'food':
            if (hasItemsArray(logData)) {
              await persistFoodLogs(tx, logData.items as FoodItemInput[], userId);
            }
            break;
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
          default:
            console.warn(`Unknown category: ${category}`);
        }
      });
    } catch (error) {
      console.error(`Persistence failed for ${category}:`, getErrorMessage(error));
      throw error;
    }
  }
}

async function persistFoodLogs(tx: Prisma.TransactionClient, items: FoodItemInput[], userId: string) {
  console.log('Saving food logs...');
  for (const item of items) {
    const validated = FoodItemSchema.parse(item);
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
        console.log(`Updating existing food log: ${validated.name}`);
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

async function persistWorkoutLog(tx: Prisma.TransactionClient, data: WorkoutLogInput, userId: string) {
  console.log('Saving workout log...');
  const validated = WorkoutLogSchema.parse(data);
  const logDate = (validated as any).date ? new Date((validated as any).date) : new Date();
  const prs = getRecordValue(data, 'prs');
  const detailsFallback = prs ? JSON.stringify(prs) : undefined;

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
      console.log(`Updating existing workout log: ${validated.focus}`);
      await tx.workoutLog.update({
        where: { id: existing.id },
        data: {
          volume: validated.volume,
          details: validated.details || detailsFallback,
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
      time: (validated as any).date ? new Date((validated as any).date) : undefined,
    },
  });
}

async function persistSleepLog(tx: Prisma.TransactionClient, data: SleepLogInput, userId: string) {
  console.log('Saving sleep log...');
  const validated = SleepLogSchema.parse(data);
  const logDate = (validated as any).date ? new Date((validated as any).date) : new Date();

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
      console.log('Updating existing sleep log');
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
      time: (validated as any).date ? new Date((validated as any).date) : undefined,
    },
  });
}

async function persistMeasurement(tx: Prisma.TransactionClient, data: MeasurementInput, userId: string) {
  console.log('Saving body measurement...');
  const validated = MeasurementSchema.parse(data);
  const logDate = (validated as any).date ? new Date((validated as any).date) : new Date();

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
      console.log('Updating existing body measurement');
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
      time: (validated as any).date ? new Date((validated as any).date) : undefined,
    },
  });
}

async function persistProfileUpdate(tx: Prisma.TransactionClient, raw: UserProfileInput, userId: string) {
  console.log('Updating user profile via AI...');
  // Coerce to numbers as AI often sends strings
  const validated = UserProfileSchema.parse({
    ...raw,
    age: raw.age ? Number.parseInt(String(raw.age), 10) : undefined,
    height: raw.height ? Number.parseFloat(String(raw.height)) : undefined,
  });
  await tx.userProfile.upsert({
    where: { userId },
    create: { userId, ...validated },
    update: validated,
  });
}

async function persistGoalUpdate(tx: Prisma.TransactionClient, raw: GoalInput, userId: string) {
  console.log('Updating user goals via AI...');
  const validated = GoalSchema.parse({
    ...raw,
    proteinTarget: raw.proteinTarget ? Number.parseFloat(String(raw.proteinTarget)) : undefined,
    kcalTarget: raw.kcalTarget ? Number.parseFloat(String(raw.kcalTarget)) : undefined,
    waterTarget: raw.waterTarget ? Number.parseFloat(String(raw.waterTarget)) : undefined,
    sleepTarget: raw.sleepTarget ? Number.parseFloat(String(raw.sleepTarget)) : undefined,
  });
  await tx.goal.upsert({
    where: { userId },
    create: { userId, ...validated },
    update: validated,
  });
}

async function persistDayTypeUpdate(tx: Prisma.TransactionClient, raw: unknown, userId: string, clientDate?: string) {
  console.log('Updating day type via AI...', raw);
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

  console.log(`Resolved DayType: ${dayType} for ${dayKey}`);

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
  console.log('Day type upserted successfully.');
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
