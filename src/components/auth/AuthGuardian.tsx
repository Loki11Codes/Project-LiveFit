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
    // We only care about authenticated users who are NOT already on the reset page
    if (status === "authenticated" && session?.user?.requirePasswordChange) {
      if (pathname !== "/auth/reset-password") {
        console.warn("Security: Mandatory password reset detected. Redirecting...");
        router.push("/auth/reset-password");
      }
    }
  }, [session, status, pathname, router]);

  return null; // This component has no UI, it only handles logic
}
