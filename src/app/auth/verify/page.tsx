"use client";

import { Suspense } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { VerifyEmailForm } from "./VerifyEmailForm";

export default function VerifyEmailPage() {
  return (
    <AuthShell
      badge="Security"
      title="Verify your identity"
      subtitle="Confirm your email to unlock your Caloriq workspace and start your fitness journey."
      panelTitle="Authentication Guard"
      panelDescription="We enforce real email verification to maintain a secure and high-quality environment for all our athletes."
      panelPoints={[
        "Secure 256-bit encryption",
        "Instant magic link verification",
        "Multi-factor identity check"
      ]}
      illustration={<div className="flex justify-center p-8 opacity-20"><ShieldCheck size={120} /></div>}
    >
      <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-auth-text-muted" /></div>}>
        <VerifyEmailForm />
      </Suspense>
    </AuthShell>
  );
}
