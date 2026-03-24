import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { internalError } from '@/lib/api';
import { extractAndCleanLogData } from '@/lib/chat-utils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const messages = (await prisma.chatMessage.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 100,
    })) as unknown as Array<{
      id: string;
      role: string;
      text: string;
      createdAt: Date;
      images: string | null;
    }>;

    const formattedMessages = messages.map((msg) => {
      let images = [];
      if (msg.images) {
        try {
          images = JSON.parse(msg.images);
        } catch (e) {
          console.error('Failed to parse chat images:', e);
        }
      }

      return {
        id: msg.id,
        role: msg.role,
        text: extractAndCleanLogData(msg.text).cleanText,
        timestamp: new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(new Date(msg.createdAt)),
        images,
      };
    });

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('Check History Route Error:', error);
    return internalError('Failed to fetch chat history');
  }
}
