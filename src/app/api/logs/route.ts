import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unauthorized, internalError, badRequest } from '@/lib/api';
import { z } from 'zod';
import { persistLogData, type ParsedLogEnvelope } from '@/lib/persistence';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return unauthorized();
  }

  const userId = session.user.id;

  try {
    const [food, workouts, sleep] = await Promise.all([
      prisma.foodLog.findMany({ 
        where: { userId }, 
        orderBy: { time: 'desc' } 
      }),
      prisma.workoutLog.findMany({ 
        where: { userId }, 
        include: {
          exercises: {
            include: {
              sets: true,
              exercise: true,
            },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { time: 'desc' } 
      }),
      prisma.sleepLog.findMany({ 
        where: { userId }, 
        orderBy: { time: 'desc' } 
      }),
    ]);

    return NextResponse.json({ food, workouts, sleep });
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return internalError('Unable to load logs right now');
  }
}

const DeleteLogSchema = z.object({
  category: z.enum(['food', 'workout', 'sleep', 'measurement']),
  id: z.string().min(1),
});

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return unauthorized();
  }

  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be valid JSON');
  }

  const parsed = DeleteLogSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Invalid delete request', parsed.error.issues);
  }

  const { category, id } = parsed.data;

  try {
    switch (category) {
      case 'food': {
        const existing = await prisma.foodLog.findFirst({ where: { id, userId } });
        if (!existing) return badRequest('Log not found');
        await prisma.foodLog.delete({ where: { id } });
        break;
      }
      case 'workout': {
        const existing = await prisma.workoutLog.findFirst({ where: { id, userId } });
        if (!existing) return badRequest('Log not found');
        await prisma.workoutLog.delete({ where: { id } });
        break;
      }
      case 'sleep': {
        const existing = await prisma.sleepLog.findFirst({ where: { id, userId } });
        if (!existing) return badRequest('Log not found');
        await prisma.sleepLog.delete({ where: { id } });
        break;
      }
      case 'measurement': {
        const existing = await prisma.bodyMeasurement.findFirst({ where: { id, userId } });
        if (!existing) return badRequest('Log not found');
        await prisma.bodyMeasurement.delete({ where: { id } });
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete log:', error);
    return internalError('Unable to delete log');
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return unauthorized();
  }

  try {
    const list = await req.json() as ParsedLogEnvelope[];
    if (!Array.isArray(list)) {
      return badRequest('Expected an array of log envelopes');
    }

    await persistLogData(list, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to post logs:', error);
    return internalError('Unable to save logs');
  }
}
