import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { badRequest, internalError } from "@/lib/api";
import { sendEmailChangedNotification } from "@/lib/email";

/**
 * GET /api/user/email/verify?token={uuid}&uid={userId}
 *
 * Confirms a pending email change.
 *
 * Flow:
 *   1. Look up VerificationToken by identifier "email-change:{uid}"
 *   2. Parse "{newEmail}|{uuid}" and validate uuid matches query param
 *   3. Check token has not expired
 *   4. Atomically: update User.email + emailVerified, delete token
 *   5. Send security notification to old email
 *   6. Redirect to /?emailChanged=1
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const uid = searchParams.get("uid");

  if (!token || !uid) {
    return badRequest("Missing token or user ID");
  }

  try {
    const identifier = `email-change:${uid}`;

    const vToken = await prisma.verificationToken.findFirst({
      where: { identifier },
    });

    if (!vToken) {
      return badRequest("No pending email change found. The link may have already been used.");
    }

    if (vToken.expires < new Date()) {
      // Clean up expired token
      await prisma.verificationToken.deleteMany({ where: { identifier } });
      return badRequest("This verification link has expired. Please request a new email change.");
    }

    // Token format: "{newEmail}|{uuid}"
    const pipeIndex = vToken.token.lastIndexOf("|");
    if (pipeIndex === -1) {
      return badRequest("Invalid verification token format.");
    }

    const newEmail = vToken.token.substring(0, pipeIndex);
    const storedUuid = vToken.token.substring(pipeIndex + 1);

    if (storedUuid !== token) {
      return badRequest("Invalid verification token.");
    }

    // Fetch old email for the security notification
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { email: true, name: true },
    });

    if (!user) {
      return badRequest("User not found.");
    }

    // Check the new email isn't now taken by someone else (race condition guard)
    const conflict = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });

    if (conflict && conflict.id !== uid) {
      await prisma.verificationToken.deleteMany({ where: { identifier } });
      return badRequest("This email address is no longer available.");
    }

    // Atomically update email and delete token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: uid },
        data: {
          email: newEmail,
          emailVerified: new Date(),
        },
      }),
      prisma.verificationToken.deleteMany({ where: { identifier } }),
    ]);

    // Send security notification to old address (fire-and-forget)
    if (user.email) {
      sendEmailChangedNotification(user.email, user.name || "there", newEmail).catch((err) =>
        console.error("Failed to send email-changed notification:", err)
      );
    }

    // Redirect to dashboard with a success flag
    const successUrl = new URL("/?emailChanged=1", req.url);
    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error("Email verify error:", error);
    return internalError("Verification failed. Please try again.");
  }
}
