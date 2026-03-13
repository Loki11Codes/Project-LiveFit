import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const latest = await prisma.bodyMeasurement.findFirst({
      where: { userId: (session.user as any).id },
      orderBy: { time: 'desc' },
    });
    return NextResponse.json(latest || {});
  } catch (error) {
    console.error('Failed to fetch latest measurement:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const measurement = await prisma.bodyMeasurement.create({
      data: {
        userId: (session.user as any).id,
        weight: Number.parseFloat(body.weight) || null,
        waist: Number.parseFloat(body.waist) || null,
        chest: Number.parseFloat(body.chest) || null,
        arms: Number.parseFloat(body.arms) || null,
        thighs: Number.parseFloat(body.thighs) || null,
        hips: Number.parseFloat(body.hips) || null,
      },
    });
    return NextResponse.json(measurement);
  } catch (error) {
    console.error('Failed to create measurement:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
