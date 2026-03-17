import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserProfileSchema, GoalSchema } from '@/lib/validation';
import { unauthorized, internalError } from '@/lib/api';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  try {
    if (type === 'goals') {
      const goal = await prisma.goal.findUnique({
        where: { userId: session.user.id },
      });
      return NextResponse.json(goal || {});
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    });
    return NextResponse.json(profile || {});
  } catch (error) {
    console.error('Failed to fetch profile/goal:', error);
    return internalError(`Unable to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const body = await req.json();
  
  // Distinguish between Goal update and Profile update based on fields
  const isGoalUpdate = 'proteinTarget' in body || 'proteinTraining' in body;

  try {
    if (isGoalUpdate) {
      const parsed = GoalSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const goal = await prisma.goal.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          ...parsed.data,
        },
        update: parsed.data,
      });
      return NextResponse.json(goal);
    } else {
      const parsed = UserProfileSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const profile = await prisma.userProfile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          ...parsed.data,
        },
        update: parsed.data,
      });

      // Also update name in User model if provided in body (though not in schema, user might expect it)
      if (body.name) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { name: body.name },
        });
      }

      return NextResponse.json(profile);
    }
  } catch (error) {
    console.error('Failed to update profile/goal:', error);
    return internalError('Unable to save changes right now');
  }
}
