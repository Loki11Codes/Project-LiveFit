import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import crypto from "node:crypto";
import prisma from "@/lib/prisma";

/**
 * Generates a 6-digit OTP code and a unique verification token.
 */
export function generateVerificationData() {
  const otp = crypto.randomInt(100000, 999999).toString();
  const token = uuidv4();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
  
  return { otp, token, expires };
}

function getVerifyEmailHtml(name: string, otp: string, verifyUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #185fa5;">Verify Your Caloriq Account</h2>
      <p>Hello ${name},</p>
      <p>To ensure we have a real email on file, please verify your account using one of the methods below:</p>
      
      <div style="margin: 32px 0; padding: 24px; background-color: #f3f4f6; border-radius: 16px; text-align: center;">
        <p style="margin-bottom: 8px; font-size: 14px; font-weight: bold; text-transform: uppercase; color: #6b7280;">Option 1: Enter this code</p>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #185fa5;">${otp}</div>
      </div>
      
      <div style="margin: 32px 0; text-align: center;">
        <p style="margin-bottom: 16px; font-size: 14px; font-weight: bold; text-transform: uppercase; color: #6b7280;">Option 2: Click the button</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 16px 32px; background-color: #185fa5; color: white; text-decoration: none; border-radius: 12px; font-weight: bold;">Verify Account Now</a>
      </div>
      
      <p style="font-size: 12px; color: #9ca3af; margin-top: 48px;">
        If you didn't create an account, you can safely ignore this email. This link and code expire in 24 hours.
      </p>
    </div>
  `;
}

/**
 * Sends a verification email containing both an OTP and a Magic Link.
 * In development without SMTP credentials, it logs the content to the console.
 */
export async function sendVerificationEmail(email: string, name: string, otp: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;
  const html = getVerifyEmailHtml(name, otp, verifyUrl);

  // For testing/dev if no SMTP is configured, log to console
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log("------------------------------------------");
    console.log(`[EMAIL LOG] Verification for ${email}`);
    console.log(`[OTP] ${otp}`);
    console.log(`[LINK] ${verifyUrl}`);
    console.log("------------------------------------------");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Caloriq" <${process.env.SMTP_FROM || "onboarding@resend.dev"}>`,
    to: email,
    subject: "Verify your Caloriq Account",
    html,
  });
}

/**
 * Stores the verification tokens in the database.
 */
export async function storeVerificationToken(email: string, token: string, otp: string, expires: Date) {
  // We use the email as the identifier for lookups
  await prisma.verificationToken.upsert({
    where: { 
      identifier_token: { 
        identifier: email, 
        token: token 
      } 
    },
    update: {
      token,
      expires,
    },
    create: {
      identifier: email,
      token,
      expires,
    },
  });
  
  // Note: Standard NextAuth VerificationToken table usually doesn't have an 'otp' column.
  // We will store the OTP in the 'token' field of a separate record or modify schema.
  // For simplicity without schema migration right now, we'll prefix it in another token record.
  
  await prisma.verificationToken.upsert({
    where: { 
      identifier_token: { 
        identifier: `otp:${email}`, 
        token: otp 
      } 
    },
    update: {
      token: otp,
      expires,
    },
    create: {
      identifier: `otp:${email}`,
      token: otp,
      expires,
    },
  });
}
