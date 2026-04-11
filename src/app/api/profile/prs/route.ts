import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { internalError } from '@/lib/api';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

    const prs = await prisma.personalRecord.findMany({
      where: { userId: session.user.id },
      include: {
        exercise: {
          select: { name: true, category: true }
        }
      }
    });

    return NextResponse.json(prs);
  } catch (error) {
    console.error('PRs GET Error:', error);
    return internalError('Failed to fetch personal records');
  }
}
