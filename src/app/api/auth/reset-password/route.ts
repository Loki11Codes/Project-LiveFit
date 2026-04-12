/**
 * Security Overhaul: Reset Password API Handler
 */
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { badRequest, internalError, success } from "@/lib/api";

const ResetPasswordSchema = z.object({
  password: z
    .string()
    .min(12)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/\d/)
    .regex(/[^\w\s]|_/)
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return badRequest("Unauthorized");

  try {
    const body = await req.json();
    const result = ResetPasswordSchema.safeParse(body);
    if (!result.success) {
      return badRequest("Password does not meet security requirements");
    }

    const hashedPassword = await bcrypt.hash(result.data.password, 10);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        requirePasswordChange: false,
      },
    });

    return success("Password updated successfully");
  } catch (error) {
    console.error("Reset password error:", error);
    return internalError("Failed to update password. Please try again.");
  }
}
