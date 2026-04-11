import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { internalError } from '@/lib/api';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

    const knowledge = await prisma.userKnowledge.findMany({
      where: { userId: session.user.id },
      select: { key: true, value: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(knowledge);
  } catch (error) {
    console.error('Knowledge GET Error:', error);
    return internalError('Failed to fetch knowledge');
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

    const { key, value } = await req.json();

    if (!key || value === undefined) {
      return new NextResponse('Missing key or value', { status: 400 });
    }

    const entry = await prisma.userKnowledge.upsert({
      where: {
        userId_key: {
          userId: session.user.id,
          key: key.toLowerCase()
        }
      },
      update: { value },
      create: {
        userId: session.user.id,
        key: key.toLowerCase(),
        value
      }
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Knowledge POST Error:', error);
    return internalError('Failed to save knowledge');
  }
}
