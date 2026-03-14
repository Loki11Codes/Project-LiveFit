import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoalSchema } from '@/lib/validation';
import { unauthorized, badRequest, internalError } from '@/lib/api';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  try {
    const goal = await prisma.goal.findUnique({
      where: { userId: (session.user as any).id }
    });
    return NextResponse.json(goal || {});
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    return internalError();
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const result = GoalSchema.safeParse(body);

    if (!result.success) {
      return badRequest('Invalid input', result.error.issues);
    }

    const { proteinTarget, kcalTarget } = result.data;
    const goal = await prisma.goal.upsert({
      where: { userId: (session.user as any).id },
      update: {
        proteinTarget: proteinTarget,
        kcalTarget: kcalTarget,
      },
      create: {
        userId: (session.user as any).id,
        proteinTarget: proteinTarget,
        kcalTarget: kcalTarget,
      },
    });
    return NextResponse.json(goal);
  } catch (error) {
    console.error('Failed to update goals:', error);
    return internalError();
  }
}
