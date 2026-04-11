import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { internalError } from '@/lib/api';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

    const latestPlan = await prisma.mealPlan.findFirst({
      where: { userId: session.user.id },
      include: {
        entries: {
          orderBy: [
            { dayIndex: 'asc' },
            { id: 'asc' } // Preserve insertion order for same-day meals
          ]
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(latestPlan);
  } catch (error) {
    console.error('MealPlan GET Error:', error);
    return internalError('Failed to fetch meal plan');
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

    const { name, weekStarting, entries } = await req.json();

    if (!entries || !Array.isArray(entries)) {
      return new NextResponse('Invalid entries', { status: 400 });
    }

    // Create a new plan
    const plan = await prisma.mealPlan.create({
      data: {
        userId: session.user.id,
        name: name || "My AI Meal Plan",
        weekStarting: weekStarting ? new Date(weekStarting) : new Date(),
        entries: {
          create: entries.map((e: any) => ({
            dayIndex: e.dayIndex,
            mealType: e.mealType,
            title: e.title,
            kcal: e.kcal,
            protein: e.protein,
            carbs: e.carbs,
            fats: e.fats,
            notes: e.notes
          }))
        }
      },
      include: { entries: true }
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('MealPlan POST Error:', error);
    return internalError('Failed to create meal plan');
  }
}
