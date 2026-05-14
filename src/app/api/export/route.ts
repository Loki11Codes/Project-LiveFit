import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all user data in parallel
    const [
      user,
      profile,
      goals,
      measurements,
      foodLogs,
      workoutLogs,
      sleepLogs,
      knowledge,
      dayTypeEntries,
      routines,
      mealPlans,
      personalRecords,
      achievements,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          username: true,
          phone: true,
          email: true,
          emailVerified: true,
          requirePasswordChange: true,
          onboarded: true,
          hasSeenTutorial: true,
        },
      }),
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.goal.findUnique({ where: { userId } }),
      prisma.bodyMeasurement.findMany({ where: { userId }, orderBy: { time: 'desc' } }),
      prisma.foodLog.findMany({ where: { userId }, orderBy: { time: 'desc' } }),
      prisma.workoutLog.findMany({
        where: { userId },
        orderBy: { time: 'desc' },
        include: {
          exercises: {
            include: {
              sets: true,
            },
          },
        },
      }),
      prisma.sleepLog.findMany({ where: { userId }, orderBy: { time: 'desc' } }),
      prisma.userKnowledge.findMany({ where: { userId } }),
      prisma.dayTypeEntry.findMany({ where: { userId } }),
      prisma.routine.findMany({
        where: { userId },
        include: {
          exercises: true,
        },
      }),
      prisma.mealPlan.findMany({
        where: { userId },
        include: {
          entries: true,
        },
      }),
      prisma.personalRecord.findMany({
        where: { userId },
        include: {
          exercise: true,
        },
      }),
      prisma.achievement.findMany({ where: { userId } }),
    ]);

    const exportData = {
      user,
      profile,
      goals,
      measurements,
      foodLogs,
      workoutLogs,
      sleepLogs,
      knowledge,
      dayTypeEntries,
      routines,
      mealPlans,
      personalRecords,
      achievements,
    };

    // Return as a downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="caloriq-export.json"',
      },
    });
  } catch (error) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
