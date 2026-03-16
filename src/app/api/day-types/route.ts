import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DayTypeEntrySchema } from '@/lib/validation';
import { parseJsonBody, internalError, unauthorized } from '@/lib/api';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  try {
    const entries = await prisma.dayTypeEntry.findMany({
      where: { userId: session.user.id },
      select: {
        dayKey: true,
        dayType: true,
      },
      orderBy: {
        dayKey: 'desc',
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Failed to fetch day types:', error);
    return internalError('Unable to load day types right now');
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const parsedBody = await parseJsonBody(req, DayTypeEntrySchema);
  if (!parsedBody.success) {
    return parsedBody.response;
  }

  try {
    const entry = await prisma.dayTypeEntry.upsert({
      where: {
        userId_dayKey: {
          userId: session.user.id,
          dayKey: parsedBody.data.dayKey,
        },
      },
      update: {
        dayType: parsedBody.data.dayType,
      },
      create: {
        userId: session.user.id,
        dayKey: parsedBody.data.dayKey,
        dayType: parsedBody.data.dayType,
      },
      select: {
        dayKey: true,
        dayType: true,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Failed to update day type:', error);
    return internalError('Unable to update day type right now');
  }
}
