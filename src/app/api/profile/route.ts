import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserProfileSchema, GoalSchema } from "@/lib/validation";
import { unauthorized, internalError } from "@/lib/api";
import { syncUserGoals } from "@/lib/persistence";
import { type Session } from "next-auth";

// Distinguish between Goal update and Profile update based on fields
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    if (type === "goals") {
      const goal = await prisma.goal.findUnique({
        where: { userId: session.user.id },
      });
      return NextResponse.json(goal || {});
    }

    const [profile, user, account] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        include: { achievements: true },
      }) as Promise<{
        name: string | null;
        email: string | null;
        phone: string | null;
        username: string | null;
        achievements: Record<string, unknown>[];
      } | null>,
      prisma.account.findFirst({
        where: { userId: session.user.id },
        select: { provider: true },
      }),
    ]);

    return NextResponse.json({
      ...profile,
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
      username: user?.username,
      achievements: user?.achievements || [],
      provider: account?.provider ?? "credentials",
    });
  } catch (error) {
    console.error("Failed to fetch profile/goal:", error);
    return internalError(
      `Unable to load data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function handleGoalUpdate(session: Session, body: unknown) {
  const parsed = GoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      { status: 400 },
    );
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
}

async function handleProfileUpdate(session: Session, body: unknown) {
  const parsed = UserProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const { name, phone, username, ...profileData } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const profile = await tx.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...profileData,
      },
      update: profileData,
    });

    const userUpdate: Record<string, string | null> = {};
    if (name !== undefined) userUpdate.name = name;
    if (phone !== undefined) userUpdate.phone = phone;
    if (username !== undefined) userUpdate.username = username;

    if (Object.keys(userUpdate).length > 0) {
      await tx.user.update({
        where: { id: session.user.id },
        data: userUpdate,
      });
    }

    // Recalculate goals whenever profile changes
    await syncUserGoals(tx, session.user.id);

    return { ...profile, name, phone, username };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const body = await req.json();
  const isGoalUpdate =
    body &&
    typeof body === "object" &&
    ("proteinTarget" in body || "proteinTraining" in body);

  try {
    if (isGoalUpdate) {
      return await handleGoalUpdate(session, body);
    } else {
      return await handleProfileUpdate(session, body);
    }
  } catch (error) {
    console.error("Failed to update profile/goal:", error);
    return internalError("Unable to save changes right now");
  }
}
