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
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(routines);
  } catch (error) {
    console.error("Error fetching routines:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
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
          create: exercises.map(
            (e: {
              exerciseId: string;
              order: number;
              targetSets: number;
              targetReps?: number | string;
            }) => ({
              exerciseId: e.exerciseId,
              order: e.order,
              targetSets: e.targetSets,
              targetReps: e.targetReps ? e.targetReps.toString() : null,
            }),
          ),
        },
      },
      include: {
        exercises: { include: { exercise: true } },
      },
    });

    return NextResponse.json(newRoutine, { status: 201 });
  } catch (error) {
    console.error("Error creating routine:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE a routine by id
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Routine id is required" }, { status: 400 });
    }

    // Ensure the routine belongs to the current user before deleting
    const existing = await prisma.routine.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Routine not found" }, { status: 404 });
    }

    await prisma.routine.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting routine:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
