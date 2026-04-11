
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { badRequest, internalError, success, unauthorized } from "@/lib/api";
import { syncUserGoals } from "@/lib/persistence";

const OnboardingSchema = z.object({
  age: z.coerce.number().int().min(10).max(120),
  gender: z.enum(["male", "female", "other"]),
  height: z.coerce.number().min(50).max(300),
  activityLevel: z.string().min(1),
  primaryGoal: z.string().min(1),
  initialWeight: z.coerce.number().min(20).max(500),
  dietaryPreference: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const body = await req.json();
    const result = OnboardingSchema.safeParse(body);

    if (!result.success) {
      return badRequest("Invalid onboarding data", result.error.issues);
    }

    const data = result.data;

    await prisma.$transaction(async (tx) => {
      // 1. Update User Profile
      await tx.userProfile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          age: data.age,
          gender: data.gender,
          height: data.height,
          activityPreference: data.activityLevel,
          primaryGoal: data.primaryGoal,
          dietaryPreference: data.dietaryPreference || "Balanced",
        },
        update: {
          age: data.age,
          gender: data.gender,
          height: data.height,
          activityPreference: data.activityLevel,
          primaryGoal: data.primaryGoal,
          dietaryPreference: data.dietaryPreference,
        },
      });

      // 2. Log Initial Weight
      await tx.bodyMeasurement.create({
        data: {
          userId: session.user.id,
          weight: data.initialWeight,
          time: new Date(),
        },
      });

      // 3. Mark Onboarding as Complete
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          onboarded: true,
          hasSeenTutorial: true,
        },
      });

      // 4. Synchronize Goals based on new data
      await syncUserGoals(tx, session.user.id);
    });

    return success("Onboarding complete");
  } catch (error) {
    console.error("Onboarding error:", error);
    return internalError("Failed to complete onboarding. Please try again.");
  }
}
