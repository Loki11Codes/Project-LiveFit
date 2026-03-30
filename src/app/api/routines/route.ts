import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET all routines for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const routines = await prisma.routine.findMany({
      where: { userId: session.user.id },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(routines);
  } catch (error) {
    console.error("Error fetching routines:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// CREATE a new routine
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, exercises } = body;

    if (!name || !Array.isArray(exercises)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const newRoutine = await prisma.routine.create({
      data: {
        userId: session.user.id,
        name,
        exercises: {
          create: exercises.map((e: unknown) => ({
            exerciseId: e.exerciseId,
            order: e.order,
            targetSets: e.targetSets,
            targetReps: e.targetReps || null
          }))
        }
      },
      include: {
        exercises: { include: { exercise: true } }
      }
    });

    return NextResponse.json(newRoutine, { status: 201 });
  } catch (error) {
    console.error("Error creating routine:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
