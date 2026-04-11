"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  ShieldCheck, 
  Mail, 
  Loader2, 
  ArrowRight, 
  RefreshCcw,
  AlertCircle
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { requestJson, getClientErrorMessage } from "@/lib/client-api";

function VerifyEmailForm() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [email, setEmail] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Priority: Search param email > Session email
    const paramEmail = searchParams.get("email");
    if (paramEmail) {
      setEmail(paramEmail);
    } else if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [searchParams, session]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    setError(null);

    try {
      await requestJson("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });

      setSuccess(true);
      
      // Update session to reflect verified status
      await update({ emailVerified: new Date() });

      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(getClientErrorMessage(err));
      setLoading(false);
    }
  };

  // Auto-submit OTP if 6 digits are entered
  useEffect(() => {
    if (code.length === 6 && !loading && !success) {
      handleSubmit();
    }
  }, [code]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="p-4 rounded-3xl bg-auth-surface2 border border-auth-border text-[#185fa5]">
          <Mail size={40} />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-auth-text">Check your inbox</h3>
          <p className="text-sm text-auth-text-muted">
            We&apos;ve sent a 6-digit verification code to <br />
            <span className="font-bold text-auth-text">{email || "your email"}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2">
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replaceAll(/[^0-9]/g, ""))}
            placeholder="000000"
            className="h-16 w-full max-w-[240px] rounded-2xl border-2 border-auth-input-border bg-auth-input-bg text-center text-3xl font-black tracking-[0.5em] text-auth-input-text focus:border-[#185fa5] outline-none transition shadow-xl"
            autoFocus
            disabled={loading || success}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || success || code.length !== 6}
          className="h-12 w-full rounded-2xl bg-[#185fa5] text-sm font-bold uppercase tracking-wider text-white hover:bg-[#378add] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:grayscale"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : success ? (
            <ShieldCheck size={18} />
          ) : (
            <ArrowRight size={18} />
          )}
          {loading ? "Verifying..." : success ? "Verified" : "Verify Email"}
        </button>
      </form>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          className="text-xs font-bold uppercase tracking-wider text-auth-text-muted hover:text-[#185fa5] transition flex items-center gap-2"
        >
          <RefreshCcw size={14} />
          Resend Code
        </button>
      </div>
    </div>
  );
}

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
