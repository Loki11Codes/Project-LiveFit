import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unauthorized, internalError } from '@/lib/api';

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
