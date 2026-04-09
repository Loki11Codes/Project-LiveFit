"use client";

import { BaseSyntheticEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, LogIn, Mail, Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleMark } from "@/components/auth/GoogleMark";
import { FitnessIllustration } from "@/components/auth/FitnessIllustration";


export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  const handleSubmit = async (e: BaseSyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error("Sign-in unexpected error:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Sign In"
      title="Welcome back"
      subtitle="Re-open your Caloriq workspace and keep your momentum moving."
      panelTitle="Your progress stays in motion"
      panelDescription="Log in to review streaks, update meals, and keep your fitness insights synchronized in one place."
      panelPoints={[
        "Daily metrics and AI insights in one dashboard",
        "Secure email login plus one-tap Google sign-in",
        "Fast mobile-friendly flow built for daily check-ins",
      ]}
      bottomText="Need a new account?"
      bottomLinkLabel="Create one"
      bottomLinkHref="/auth/signup"
      illustration={<FitnessIllustration />}
    >
      {success && (
        <div className="mb-6 rounded-2xl border border-emerald-500/25 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Account created successfully. You can sign in now.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2 mt-1">
        <div className="relative flex items-center">
          <Mail
            size={18}
            className="pointer-events-none absolute left-4 text-zinc-400"
          />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError("");
            }}
            placeholder="Email Address"
            aria-label="Email"
            autoFocus
            required
            suppressHydrationWarning
            className="h-10 w-full rounded-2xl border-2 border-auth-input-border bg-auth-input-bg pl-11 pr-4 text-[14px] font-medium text-auth-input-text outline-none transition placeholder:text-zinc-500 focus:border-[#185fa5] focus:ring-4 focus:ring-[#185fa5]/10"
          />
        </div>

        <div className="relative flex items-center">
          <Lock
            size={18}
            className="pointer-events-none absolute left-4 text-zinc-400"
          />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError("");
            }}
            placeholder="Password"
            aria-label="Password"
            required
            suppressHydrationWarning
            className="h-10 w-full rounded-2xl border-2 border-auth-input-border bg-auth-input-bg pl-11 pr-12 text-[14px] font-medium text-auth-input-text outline-none transition placeholder:text-zinc-500 focus:border-[#185fa5] focus:ring-4 focus:ring-[#185fa5]/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            suppressHydrationWarning
            className="absolute right-4 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-50 px-4 py-3 text-[14px] font-medium text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          suppressHydrationWarning
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[#185fa5] px-5 text-[13px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#378add] disabled:cursor-not-allowed disabled:bg-zinc-500 shadow-md"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LogIn size={16} />
          )}
          {loading ? "Signing in" : "Sign In"}
        </button>
      </form>

      <div className="my-3 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.12em] text-auth-text-muted">
        <span className="h-px flex-1 bg-auth-border/50" />
        <span>Social Access</span>
        <span className="h-px flex-1 bg-auth-border/50" />
      </div>

      <button
        type="button"
        suppressHydrationWarning
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="inline-flex h-10 w-full items-center justify-center gap-3 rounded-2xl border-2 border-auth-border bg-auth-surface px-5 text-[13px] font-semibold text-auth-input-text transition hover:brightness-95 shadow-sm"
      >
        <GoogleMark />
        Google Sign In
      </button>
    </AuthShell>
  );
}
