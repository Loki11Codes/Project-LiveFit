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
      subtitle="Re-open your LiveFit workspace and keep your momentum moving."
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

      <form onSubmit={handleSubmit} className="space-y-5 mt-2">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-[12px] font-bold uppercase tracking-[0.16em] text-zinc-600 ml-1"
          >
            Email
          </label>
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
              placeholder="you@example.com"
              autoFocus
              required
              suppressHydrationWarning
              className="h-12 w-full rounded-2xl border-2 border-zinc-300/80 bg-white/90 pl-11 pr-4 text-[15px] font-medium text-zinc-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100/50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="password"
            className="text-[12px] font-bold uppercase tracking-[0.16em] text-zinc-600 ml-1"
          >
            Password
          </label>
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
              placeholder="Enter your password"
              required
              suppressHydrationWarning
              className="h-12 w-full rounded-2xl border-2 border-zinc-300/80 bg-white/90 pl-11 pr-12 text-[15px] font-medium text-zinc-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100/50"
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
          className="inline-flex h-12 w-full mt-2 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 text-[14px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500 shadow-md"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <LogIn size={18} />
          )}
          {loading ? "Signing in" : "Sign In"}
        </button>
      </form>

      <div className="my-8 flex items-center gap-4 text-[12px] font-bold uppercase tracking-[0.12em] text-zinc-400">
        <span className="h-px flex-1 bg-zinc-300/80" />
        <span>Or continue with</span>
        <span className="h-px flex-1 bg-zinc-300/80" />
      </div>

      <button
        type="button"
        suppressHydrationWarning
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border-2 border-zinc-300/80 bg-white px-5 text-[14px] font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 shadow-sm"
      >
        <GoogleMark />
        Continue with Google
      </button>
    </AuthShell>
  );
}
