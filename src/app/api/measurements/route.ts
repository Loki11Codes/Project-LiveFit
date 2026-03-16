import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MeasurementSchema } from '@/lib/validation';
import { parseJsonBody, unauthorized, internalError } from '@/lib/api';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  try {
    const latest = await prisma.bodyMeasurement.findFirst({
      where: { userId: session.user.id },
      orderBy: { time: 'desc' },
    });
    return NextResponse.json(latest || {});
  } catch (error) {
    console.error('Failed to fetch latest measurement:', error);
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
    const measurement = await prisma.bodyMeasurement.create({
      data: {
        userId: session.user.id,
        weight: data.weight ?? null,
        waist: data.waist ?? null,
        chest: data.chest ?? null,
        arms: data.arms ?? null,
        thighs: data.thighs ?? null,
        hips: data.hips ?? null,
      },
    });
    return NextResponse.json(measurement);
  } catch (error) {
    console.error('Failed to create measurement:', error);
    return internalError('Unable to save measurements right now');
  }
}
