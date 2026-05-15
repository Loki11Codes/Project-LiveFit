import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { unauthorized, badRequest, conflict, internalError, success } from "@/lib/api";
import { sendEmailChangeVerification } from "@/lib/email";

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "yopmail.com", "guerrillamail.com", "temp-mail.org",
  "10minutemail.com", "throwawaymail.com", "dispostable.com", "sharklasers.com",
  "getnada.com", "maildrop.cc", "mail-temporaire.fr",
]);

const ChangeEmailSchema = z.object({
  newEmail: z
    .string()
    .trim()
    .regex(/^[\w.%+-]{1,64}@[\w.-]{1,191}\.[a-zA-Z]{2,8}$/, "Invalid email address")
    .max(160)
    .refine(
      (email) => !DISPOSABLE_EMAIL_DOMAINS.has(email.split("@")[1]?.toLowerCase() ?? ""),
      "Disposable email addresses are not allowed"
    ),
});

/**
 * POST /api/user/email
 *
 * Initiates an email change for credentials-based users.
 * Google OAuth users are blocked — their email is managed by the provider.
 *
 * Flow:
 *   1. Validate session + provider
 *   2. Validate new email format
 *   3. Check no conflict with existing users
 *   4. Store pending token in VerificationToken (identifier: "email-change:{userId}")
 *   5. Send verification link to NEW email address
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();

    const userId = session.user.id;

    // Block OAuth users — their email is provider-managed
    const oauthAccount = await prisma.account.findFirst({
      where: { userId, provider: { not: "credentials" } },
      select: { provider: true },
    });

    if (oauthAccount) {
      return badRequest(
        `Your email is managed by ${oauthAccount.provider}. Sign in with ${oauthAccount.provider} to update it.`,
        { provider: oauthAccount.provider }
      );
    }

    const body = await req.json();
    const result = ChangeEmailSchema.safeParse(body);
    if (!result.success) {
      return badRequest("Invalid email address", result.error.issues);
    }

    const { newEmail } = result.data;
    const currentEmail = session.user.email;

    if (newEmail.toLowerCase() === currentEmail?.toLowerCase()) {
      return badRequest("New email must be different from your current email");
    }

    // Check if email is already taken
    const existing = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });
    if (existing) {
      return conflict("This email address is already in use");
    }

    // Generate a verification token — store as "{newEmail}|{uuid}"
    const uuid = uuidv4();
    const tokenValue = `${newEmail}|${uuid}`;
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    const identifier = `email-change:${userId}`;

    // Replace any existing pending token (rate-limit: one pending change at a time)
    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });

    await prisma.verificationToken.create({
      data: { identifier, token: tokenValue, expires },
    });

    // Send verification email to the new address
    const verifyUrl = `${process.env.NEXTAUTH_URL}/api/user/email/verify?token=${encodeURIComponent(uuid)}&uid=${encodeURIComponent(userId)}`;
    const userName = session.user.name || "there";
    await sendEmailChangeVerification(newEmail, userName, verifyUrl);

    return success("Verification email sent. Please check your inbox.");
  } catch (error) {
    console.error("Email change error:", error);
    return internalError("Failed to initiate email change. Please try again.");
  }
}
