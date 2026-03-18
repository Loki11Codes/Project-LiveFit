"use client";

import { BaseSyntheticEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  User,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion } from "framer-motion";
import { getClientErrorMessage, requestJson } from "@/lib/client-api";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleMark } from "@/components/auth/GoogleMark";
import { NutritionIllustration } from "@/components/auth/NutritionIllustration";


export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const passwordMatch = useMemo(() => {
    if (!confirmPassword) {
      return null;
    }

    return password === confirmPassword;
  }, [confirmPassword, password]);

  const passwordChecks = useMemo(
    () => ({
      minimumLength: password.length >= 6,
      upperOrNumber: /[A-Z0-9]/.test(password),
    }),
    [password],
  );

  const handleSubmit = async (e: BaseSyntheticEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await requestJson<{ message: string }>("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      setSuccess("Account created. Redirecting to sign in.");
      router.push("/auth/signin?success=1");
    } catch (error) {
      setError(getClientErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Create Account"
      title="Build your LiveFit profile"
      subtitle="Start with a few details and unlock daily tracking, nutrition insights, and guided progress from day one."
      panelTitle="Train smarter, not noisier"
      panelDescription="LiveFit gives you a practical fitness command center so your habits and outcomes stay visible every day."
      panelPoints={[
        "Clear daily goals for nutrition and body metrics",
        "Personalized analytics that learn from your log history",
        "Simple setup now, better consistency over time",
      ]}
      bottomText="Already have an account?"
      bottomLinkLabel="Sign in"
      bottomLinkHref="/auth/signin"
      illustration={<NutritionIllustration />}
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="name"
            className="text-[12px] font-bold uppercase tracking-[0.16em] text-zinc-600 ml-1"
          >
            Full Name
          </label>
          <div className="relative flex items-center">
            <User
              size={18}
              className="pointer-events-none absolute left-4 text-zinc-400"
            />
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError("");
              }}
              placeholder="Alex Carter"
              autoFocus
              required
              suppressHydrationWarning
              className="h-12 w-full rounded-2xl border-2 border-zinc-300/80 bg-white/90 pl-11 pr-4 text-[15px] font-medium text-zinc-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100/50"
            />
          </div>
        </div>

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
              required
              suppressHydrationWarning
              className="h-12 w-full rounded-2xl border-2 border-zinc-300/80 bg-white/90 pl-11 pr-4 text-[15px] font-medium text-zinc-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                placeholder="At least 6 chars"
                minLength={6}
                required
                suppressHydrationWarning
                className="h-12 w-full rounded-2xl border-2 border-zinc-300/80 bg-white/90 pl-11 pr-12 text-[15px] font-medium text-zinc-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100/50"
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

          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirmPassword"
              className="text-[12px] font-bold uppercase tracking-[0.16em] text-zinc-600 ml-1"
            >
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (error) setError("");
                }}
                placeholder="Re-enter password"
                required
                suppressHydrationWarning
                className={`h-12 w-full rounded-2xl border-2 bg-white/90 pl-4 pr-12 text-[15px] font-medium text-zinc-800 outline-none transition ${
                  passwordMatch === false
                    ? "border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100/50"
                    : "border-zinc-300/80 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100/50"
                }`}
              />
              <div className="absolute right-4 flex items-center gap-2">
                {passwordMatch && (
                  <CheckCircle2 size={16} className="text-emerald-600" />
                )}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  suppressHydrationWarning
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-zinc-200/80 bg-zinc-50/80 px-4 py-3 text-[13px] font-medium text-zinc-600">
          <p
            className={
              passwordChecks.minimumLength
                ? "text-emerald-700 font-semibold"
                : ""
            }
          >
            Minimum 6 characters
          </p>
          <p
            className={
              passwordChecks.upperOrNumber
                ? "text-emerald-700 font-semibold mt-1"
                : "mt-1"
            }
          >
            Contains an uppercase letter or a number
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border-2 border-rose-500/25 bg-rose-50 px-4 py-3 text-[14px] font-medium text-rose-700 mt-2">
            {error}
          </div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border-2 border-emerald-500/25 bg-emerald-50 px-4 py-3 text-[14px] font-medium text-emerald-700 mt-2"
          >
            {success}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading}
          suppressHydrationWarning
          className="inline-flex h-12 w-full mt-4 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 text-[14px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500 shadow-md"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <UserPlus size={18} />
          )}
          {loading ? "Creating account" : "Create Account"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4 text-[12px] font-bold uppercase tracking-[0.12em] text-zinc-400">
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
