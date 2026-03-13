import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const goal = await prisma.goal.findUnique({
      where: { userId: (session.user as any).id }
    });
    return NextResponse.json(goal || {});
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { proteinTarget, kcalTarget } = await req.json();
    const goal = await prisma.goal.upsert({
      where: { userId: (session.user as any).id },
      update: {
        proteinTarget: Number.parseFloat(proteinTarget),
        kcalTarget: Number.parseFloat(kcalTarget),
      },
      create: {
        userId: (session.user as any).id,
        proteinTarget: Number.parseFloat(proteinTarget),
        kcalTarget: Number.parseFloat(kcalTarget),
      },
    });
    return NextResponse.json(goal);
  } catch (error) {
    console.error('Failed to update goals:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
