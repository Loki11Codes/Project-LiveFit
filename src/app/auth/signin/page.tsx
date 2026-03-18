"use client";

import { BaseSyntheticEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, LogIn, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21.8 12.2c0-.7-.1-1.2-.2-1.8h-9.4V14h5.5c-.1.9-.7 2.2-2.1 3.1l3.2 2.5c1.9-1.8 3-4.4 3-7.4Z"
        fill="#4285F4"
      />
      <path
        d="M12.2 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.8.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.2l-3.2 2.5C4.8 19.7 8.2 22 12.2 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.8c-.2-.6-.3-1.2-.3-1.8 0-.7.1-1.4.3-2l-3.2-2.5C2.5 8.9 2.2 10.4 2.2 12s.3 3.1 1 4.5l3.2-2.7Z"
        fill="#FBBC05"
      />
      <path
        d="M12.2 5.8c1.9 0 3.2.8 3.9 1.4l2.8-2.7C17.2 3.1 14.9 2 12.2 2c-4 0-7.3 2.3-9 5.6L6.5 10c.8-2.4 3.1-4.2 5.7-4.2Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
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
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              suppressHydrationWarning
              className="h-12 w-full rounded-2xl border-2 border-zinc-300/80 bg-white/90 pl-11 pr-4 text-[15px] font-medium text-zinc-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100/50"
            />
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
