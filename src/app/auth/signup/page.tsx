"use client";

import { BaseSyntheticEvent, useState } from "react";
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
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { usePasswordValidation } from "@/hooks/usePasswordValidation";
import { AuthInput } from "@/components/auth/AuthInput";

export default function SignUp() {
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
      <SignUpForm />

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

function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const {
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword,
    passwordMatch,
    passwordChecks,
    isPasswordValid,
  } = usePasswordValidation();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: BaseSyntheticEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (!isPasswordValid) {
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
    <form onSubmit={handleSubmit} className="space-y-2.5 mt-1">
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        <AuthInput
          id="name"
          icon={User}
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
        />

        <AuthInput
          id="email"
          icon={Mail}
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
        />
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        <AuthInput
          id="password"
          icon={Lock}
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
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              suppressHydrationWarning
              className="text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <AuthInput
          id="confirmPassword"
          icon={Lock}
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
          error={passwordMatch === false}
          rightElement={
            <>
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
            </>
          }
        />
      </div>

      <PasswordRequirements passwordChecks={passwordChecks} size="sm" />

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
  );
}
