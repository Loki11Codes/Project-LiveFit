import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { badRequest, internalError, success } from "@/lib/api";

/**
 * GET Handler for Magic Link Verification
 * Example: /api/auth/verify?token=...&email=...
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return badRequest("Missing token or email parameter");
  }

  try {
    const vToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });

    if (!vToken || vToken.expires < new Date()) {
      return badRequest("Invalid or expired verification link");
    }

    // Mark user as verified
    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token: token,
          },
        },
      }),
    ]);

    // Redirect to a success page or login
    const successUrl = new URL("/auth/signin?verified=1", req.url);
    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error("Link verification error:", error);
    return internalError("Verification failed");
  }
}

/**
 * POST Handler for OTP Verification
 * Example: { email: "...", code: "123456" }
 */
export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return badRequest("Missing email or verification code");
    }

    const otpKey = `otp:${email}`;
    const vToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: otpKey,
          token: code,
        },
      },
    });

    if (!vToken || vToken.expires < new Date()) {
      return badRequest("Invalid or expired verification code");
    }

    // Mark user as verified
    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: otpKey,
            token: code,
          },
        },
      }),
    ]);

    return success("Email verified successfully");
  } catch (error) {
    console.error("OTP verification error:", error);
    return internalError("Verification failed");
  }
}
