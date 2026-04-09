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
      minimumLength: password.length >= 12,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    }),
    [password],
  );

  const handleSubmit = async (e: BaseSyntheticEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    const { minimumLength, hasUpper, hasLower, hasNumber, hasSpecial } = passwordChecks;
    if (!minimumLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setError("Password does not meet all security requirements");
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
      setTimeout(() => {
        router.push("/auth/signin?success=1");
      }, 1500);
    } catch (error) {
      setError(getClientErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Create Account"
      title="Build your Caloriq profile"
      subtitle="Start with a few details and unlock daily tracking, nutrition insights, and guided progress from day one."
      panelTitle="Train smarter, not noisier"
      panelDescription="Caloriq gives you a practical fitness command center so your habits and outcomes stay visible every day."
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
      <form onSubmit={handleSubmit} className="space-y-2.5 mt-1">
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
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
              placeholder="Full Name"
              aria-label="Full Name"
              autoFocus
              required
              suppressHydrationWarning
              className="h-10 w-full rounded-2xl border-2 border-auth-input-border bg-auth-input-bg pl-11 pr-4 text-[14px] font-medium text-auth-input-text outline-none transition placeholder:text-zinc-500 focus:border-[#185fa5] focus:ring-4 focus:ring-[#185fa5]/10"
            />
          </div>

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
              required
              suppressHydrationWarning
              className="h-10 w-full rounded-2xl border-2 border-auth-input-border bg-auth-input-bg pl-11 pr-4 text-[14px] font-medium text-auth-input-text outline-none transition placeholder:text-zinc-500 focus:border-[#185fa5] focus:ring-4 focus:ring-[#185fa5]/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
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
              placeholder="New Password"
              aria-label="Password"
              minLength={6}
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

          <div className="relative flex items-center">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (error) setError("");
              }}
              placeholder="Confirm Password"
              aria-label="Confirm Password"
              required
              suppressHydrationWarning
              className={`h-10 w-full rounded-2xl border-2 pl-4 pr-12 text-[14px] font-medium outline-none transition ${
                passwordMatch === false
                  ? "border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100/50"
                  : "border-auth-input-border bg-auth-input-bg text-auth-input-text placeholder:text-zinc-500 focus:border-[#185fa5] focus:ring-4 focus:ring-[#185fa5]/10"
              }`}
            />
            <div className="absolute right-4 flex items-center gap-2">
              {passwordMatch && (
                <CheckCircle2 size={16} className="text-[#0f6e56]" />
              )}
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                suppressHydrationWarning
                className={`text-zinc-400 transition-colors hover:text-auth-text`}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-auth-input-border bg-auth-input-bg p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-medium text-auth-text-muted transition-colors">
          <div className={`flex items-center gap-2 ${passwordChecks.minimumLength ? "text-[#0f6e56] font-bold" : ""}`}>
             <CheckCircle2 size={12} className={passwordChecks.minimumLength ? "text-[#0f6e56]" : "text-zinc-400"} />
             At least 12 characters
          </div>
          <div className={`flex items-center gap-2 ${passwordChecks.hasUpper ? "text-[#0f6e56] font-bold" : ""}`}>
             <CheckCircle2 size={12} className={passwordChecks.hasUpper ? "text-[#0f6e56]" : "text-zinc-400"} />
             Uppercase letter [A-Z]
          </div>
          <div className={`flex items-center gap-2 ${passwordChecks.hasLower ? "text-[#0f6e56] font-bold" : ""}`}>
             <CheckCircle2 size={12} className={passwordChecks.hasLower ? "text-[#0f6e56]" : "text-zinc-400"} />
             Lowercase letter [a-z]
          </div>
          <div className={`flex items-center gap-2 ${passwordChecks.hasNumber ? "text-[#0f6e56] font-bold" : ""}`}>
             <CheckCircle2 size={12} className={passwordChecks.hasNumber ? "text-[#0f6e56]" : "text-zinc-400"} />
             At least one number
          </div>
          <div className={`flex items-center gap-2 ${passwordChecks.hasSpecial ? "text-[#0f6e56] font-bold" : ""}`}>
             <CheckCircle2 size={12} className={passwordChecks.hasSpecial ? "text-[#0f6e56]" : "text-zinc-400"} />
             Special character (@$!%*?&)
          </div>
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
            className="rounded-2xl border-2 border-emerald-500/25 bg-emerald-50 px-4 py-3 text-[14px] font-medium text-[#0f6e56] mt-2"
          >
            {success}
          </motion.div>
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
            <UserPlus size={16} />
          )}
          {loading ? "Creating account" : "Create Account"}
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
