"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * AuthGuardian is a security component that mandatorily redirects users
 * if they are flagged for a password reset (requirePasswordChange).
 */
export function AuthGuardian() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    const isResetPath = pathname === "/auth/reset-password";
    const isOnboardingPath = pathname === "/onboarding";
    const isVerifyPath = pathname === "/auth/verify";

    // 1. Mandatory Password Reset (Highest Priority)
    if (session.user.requirePasswordChange === true) {
      if (!isResetPath) {
        console.warn("Security: Mandatory password reset detected. Redirecting...");
        router.push("/auth/reset-password");
      }
      return;
    }

    // 2. Mandatory Email Verification
    if (!session.user.emailVerified) {
      if (!isVerifyPath && !isResetPath) {
        console.warn("Security: Email not verified. Redirecting to verification...");
        router.push("/auth/verify");
      }
      return;
    }


    // 3. Mandatory Onboarding
    if (session.user.onboarded === false) {
      if (!isOnboardingPath && !isResetPath && !isVerifyPath) {
        console.log("Onboarding: New user detected. Redirecting to tutorial...");
        router.push("/onboarding");
      }
    }
  }, [session, status, pathname, router]);

  return null; // This component has no UI, it only handles logic
}
