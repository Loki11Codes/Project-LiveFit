import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoalSchema } from '@/lib/validation';
import { parseJsonBody, unauthorized, internalError } from '@/lib/api';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  try {
    const goal = await prisma.goal.findUnique({
      where: { userId: session.user.id }
    });
    return NextResponse.json(goal || {});
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    return internalError('Unable to load goals right now');
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const parsedBody = await parseJsonBody(req, GoalSchema);
  if (!parsedBody.success) {
    return parsedBody.response;
  }

  try {
    const { proteinTarget, kcalTarget } = parsedBody.data;
    const goal = await prisma.goal.upsert({
      where: { userId: session.user.id },
      update: {
        proteinTarget: proteinTarget,
        kcalTarget: kcalTarget,
      },
      create: {
        userId: session.user.id,
        proteinTarget: proteinTarget,
        kcalTarget: kcalTarget,
      },
    });
    return NextResponse.json(goal);
  } catch (error) {
    console.error('Failed to update goals:', error);
    return internalError('Unable to update goals right now');
  }
}
