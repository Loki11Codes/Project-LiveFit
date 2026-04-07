import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MeasurementSchema } from '@/lib/validation';
import { parseJsonBody, unauthorized, internalError } from '@/lib/api';
import { syncUserGoals } from '@/lib/persistence';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all');

  try {
    if (all === 'true') {
      // Return all measurements for history table
      const measurements = await prisma.bodyMeasurement.findMany({
        where: { userId: session.user.id },
        orderBy: { time: 'desc' },
      });
      return NextResponse.json(measurements);
    }
    
    // Default: return latest only
    const latest = await prisma.bodyMeasurement.findFirst({
      where: { userId: session.user.id },
      orderBy: { time: 'desc' },
    });
    return NextResponse.json(latest || {});
  } catch (error) {
    console.error('Failed to fetch measurements:', error);
    return internalError('Unable to load measurements right now');
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const parsedBody = await parseJsonBody(req, MeasurementSchema);
  if (!parsedBody.success) {
    return parsedBody.response;
  }

  try {
    const data = parsedBody.data;
    const measurement = await prisma.$transaction(async (tx) => {
      const m = await tx.bodyMeasurement.create({
        data: {
          userId: session.user.id,
          weight: data.weight ?? null,
          waist: data.waist ?? null,
          chest: data.chest ?? null,
          arms: data.arms ?? null,
          thighs: data.thighs ?? null,
          hips: data.hips ?? null,
          calves: data.calves ?? null,
          neck: data.neck ?? null,
          bodyFat: data.bodyFat ?? null,
        },
      });

      // Recalculate goals whenever weight is updated
      await syncUserGoals(tx, session.user.id);
      return m;
    });

    return NextResponse.json(measurement);
  } catch (error) {
    console.error('Failed to create measurement:', error);
    return internalError('Unable to save measurements right now');
  }
}
