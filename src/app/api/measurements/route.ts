import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MeasurementSchema } from '@/lib/validation';
import { unauthorized, badRequest, internalError } from '@/lib/api';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  try {
    const latest = await prisma.bodyMeasurement.findFirst({
      where: { userId: (session.user as any).id },
      orderBy: { time: 'desc' },
    });
    return NextResponse.json(latest || {});
  } catch (error) {
    console.error('Failed to fetch latest measurement:', error);
    return internalError();
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const result = MeasurementSchema.safeParse(body);

    if (!result.success) {
      return badRequest('Invalid input', result.error.issues);
    }

    const data = result.data;
    const measurement = await prisma.bodyMeasurement.create({
      data: {
        userId: (session.user as any).id,
        weight: data.weight || null,
        waist: data.waist || null,
        chest: data.chest || null,
        arms: data.arms || null,
        thighs: data.thighs || null,
        hips: data.hips || null,
      },
    });
    return NextResponse.json(measurement);
  } catch (error) {
    console.error('Failed to create measurement:', error);
    return internalError();
  }
}
