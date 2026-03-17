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
  data?: any;
};

export async function persistLogData(envelopes: ParsedLogEnvelope[], userId: string) {
  if (envelopes.length === 0) return;

  for (const parsed of envelopes) {
    if (!parsed.category || !parsed.data) continue;

    try {
      await prisma.$transaction(async (tx) => {
        switch (parsed.category) {
          case 'food':
            if (hasItemsArray(parsed.data)) {
              await persistFoodLogs(tx, parsed.data.items as FoodItemInput[], userId);
            }
            break;
          case 'workout':
            await persistWorkoutLog(tx, parsed.data, userId);
            break;
          case 'sleep':
            await persistSleepLog(tx, parsed.data, userId);
            break;
          case 'measurement':
            await persistMeasurement(tx, parsed.data, userId);
            break;
          case 'profile':
            await persistProfileUpdate(tx, parsed.data, userId);
            break;
          case 'goals':
            await persistGoalUpdate(tx, parsed.data, userId);
            break;
          case 'dayType':
            await persistDayTypeUpdate(tx, parsed.data, userId);
            break;
          default:
            console.warn(`Unknown category: ${parsed.category}`);
        }
      });
    } catch (error) {
      console.error(`Persistence failed for ${parsed.category}:`, getErrorMessage(error));
      throw error;
    }
  }
}

async function persistFoodLogs(tx: Prisma.TransactionClient, items: FoodItemInput[], userId: string) {
  console.log('Saving food logs...');
  for (const item of items) {
    const validated = FoodItemSchema.parse(item);
    await tx.foodLog.create({
      data: {
        userId,
        name: validated.name,
        kcal: validated.kcal,
        protein: validated.protein,
        carbs: validated.carbs,
        fats: validated.fats,
        fiber: validated.fiber,
      },
    });
  }
}

async function persistWorkoutLog(tx: Prisma.TransactionClient, data: WorkoutLogInput, userId: string) {
  console.log('Saving workout log...');
  const validated = WorkoutLogSchema.parse(data);
  const prs = getRecordValue(data, 'prs');
  const detailsFallback = prs ? JSON.stringify(prs) : undefined;

  await tx.workoutLog.create({
    data: {
      userId,
      focus: validated.focus,
      volume: validated.volume,
      details: validated.details || detailsFallback,
    },
  });
}

async function persistSleepLog(tx: Prisma.TransactionClient, data: SleepLogInput, userId: string) {
  console.log('Saving sleep log...');
  const validated = SleepLogSchema.parse(data);

  await tx.sleepLog.create({
    data: {
      userId,
      hours: validated.hours,
      bedTime: validated.bedTime || getStringValue(data, 'bed'),
      wakeTime: validated.wakeTime || getStringValue(data, 'wake'),
    },
  });
}

async function persistMeasurement(tx: Prisma.TransactionClient, data: MeasurementInput, userId: string) {
  console.log('Saving body measurement...');
  const validated = MeasurementSchema.parse(data);

  await tx.bodyMeasurement.create({
    data: {
      userId,
      weight: validated.weight,
      waist: validated.waist,
      chest: validated.chest,
      arms: validated.arms,
      thighs: validated.thighs,
      hips: validated.hips,
    },
  });
}

async function persistProfileUpdate(tx: Prisma.TransactionClient, raw: UserProfileInput, userId: string) {
  console.log('Updating user profile via AI...');
  // Coerce to numbers as AI often sends strings
  const data = {
    ...raw,
    age: (raw as any).age ? Number.parseInt(String((raw as any).age), 10) : undefined,
    height: (raw as any).height ? Number.parseFloat(String((raw as any).height)) : undefined,
  };
  const validated = UserProfileSchema.parse(data);
  await tx.userProfile.upsert({
    where: { userId },
    create: { userId, ...validated },
    update: validated,
  });
}

async function persistGoalUpdate(tx: Prisma.TransactionClient, raw: GoalInput, userId: string) {
  console.log('Updating user goals via AI...');
  const data = {
    ...raw,
    proteinTarget: (raw as any).proteinTarget ? Number.parseFloat(String((raw as any).proteinTarget)) : undefined,
    kcalTarget: (raw as any).kcalTarget ? Number.parseFloat(String((raw as any).kcalTarget)) : undefined,
    waterTarget: (raw as any).waterTarget ? Number.parseFloat(String((raw as any).waterTarget)) : undefined,
    sleepTarget: (raw as any).sleepTarget ? Number.parseFloat(String((raw as any).sleepTarget)) : undefined,
  };
  const validated = GoalSchema.parse(data);
  await tx.goal.upsert({
    where: { userId },
    create: { userId, ...validated },
    update: validated,
  });
}

async function persistDayTypeUpdate(tx: Prisma.TransactionClient, raw: any, userId: string) {
  console.log('Updating day type via AI...', raw);
  const today = getLocalDateKey(new Date());
  const dayKey = raw.dayKey || today;
  
  let dayType = raw.dayType || '';
  // Normalize case and common variations
  if (dayType.toLowerCase().includes('train')) dayType = 'Training';
  else if (dayType.toLowerCase().includes('rest')) dayType = 'Rest';
  else if (dayType.toLowerCase().includes('lite')) dayType = 'Lite';

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
