import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unauthorized, internalError } from '@/lib/api';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return unauthorized();
  }

  const userId = session.user.id;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const [foodLogs, bodyMeasurements] = await Promise.all([
      prisma.foodLog.findMany({
        where: {
          userId,
          time: { gte: sevenDaysAgo }
        },
        orderBy: { time: 'asc' }
      }),
      prisma.bodyMeasurement.findMany({
        where: {
          userId,
          time: { gte: sevenDaysAgo }
        },
        orderBy: { time: 'asc' }
      })
    ]);

    // Aggregate nutrition data by day
    const nutritionByDay: Record<string, { kcal: number, protein: number }> = {};
    foodLogs.forEach(log => {
      const day = new Date(log.time).toLocaleDateString('en-US', { weekday: 'short' });
      if (!nutritionByDay[day]) {
        nutritionByDay[day] = { kcal: 0, protein: 0 };
      }
      nutritionByDay[day].kcal += log.kcal;
      nutritionByDay[day].protein += log.protein;
    });

    const nutritionStats = Object.keys(nutritionByDay).map(day => ({
      day,
      ...nutritionByDay[day]
    }));

    // Calculate averages
    const totalDays = Object.keys(nutritionByDay).length || 1;
    const averages = {
      kcal: foodLogs.reduce((sum, log) => sum + log.kcal, 0) / (totalDays || 1),
      protein: foodLogs.reduce((sum, log) => sum + log.protein, 0) / (totalDays || 1),
    };

    // Weight trend
    const weightTrend = bodyMeasurements.map(m => ({
      date: new Date(m.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: m.weight
    })).filter(w => w.weight !== null);

    return NextResponse.json({
      nutritionStats,
      averages,
      weightTrend,
      meta: {
        period: '7d',
        logCount: foodLogs.length,
        measurementCount: bodyMeasurements.length
      }
    });
  } catch (error) {
    console.error('Analytics Fetch Error:', error);
    return internalError('Unable to load analytics right now');
  }
}
