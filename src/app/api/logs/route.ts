import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const [food, workouts, sleep] = await Promise.all([
      prisma.foodLog.findMany({ 
        where: { userId }, 
        orderBy: { time: 'desc' } 
      }),
      prisma.workoutLog.findMany({ 
        where: { userId }, 
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
