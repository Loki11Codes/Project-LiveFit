"use client";

import { BaseSyntheticEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, CheckCircle2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { AuthShell } from "@/components/auth/AuthShell";
import { getClientErrorMessage, requestJson } from "@/lib/client-api";
import { useSession } from "next-auth/react";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { usePasswordValidation } from "@/hooks/usePasswordValidation";
import { AuthInput } from "@/components/auth/AuthInput";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      badge="Security Update"
      title="Protect your account"
      subtitle="Caloriq has upgraded its security standards. Please set a new high-strength password to continue."
      panelTitle="Your data, doubly secured"
      panelDescription="We've implemented industry-standard 12-character complexity rules to safeguard your fitness and nutrition insights."
      panelPoints={[
        "Modern encryption standards for your peace of mind",
        "Bulletproof credentials for long-term account health",
        "One-time update to stay in compliance with new protocols",
      ]}
      bottomText="Need help?"
      bottomLinkLabel="Contact support"
      bottomLinkHref="mailto:support@caloriq.ai"
      illustration={<div className="flex justify-center p-8 opacity-20"><ShieldCheck size={120} /></div>}
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}

function ResetPasswordForm() {
  const { update } = useSession();
  const {
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword,
    passwordMatch,
    passwordChecks,
    isPasswordValid,
  } = usePasswordValidation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: BaseSyntheticEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!isPasswordValid) {
      setError("Please satisfy all security requirements");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await requestJson("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      setSuccess(true);
      
      // Update the session to clear the requirePasswordChange flag locally
      await update({ requirePasswordChange: false });

      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(getClientErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-1">
      <div className="space-y-2.5">
        <AuthInput
          icon={Lock}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New Secure Password"
          required
          aria-label="New Password"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <AuthInput
          icon={Lock}
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm New Password"
          required
          aria-label="Confirm Password"
          error={passwordMatch === false}
          rightElement={
            <>
              {passwordMatch && (
                <CheckCircle2 size={16} className="text-[#0f6e56]" />
              )}
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`text-zinc-400 transition-colors hover:text-auth-text`}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </>
          }
        />
      </div>

      <PasswordRequirements passwordChecks={passwordChecks} />

      {error && (
        <div className="rounded-2xl border-2 border-rose-500/25 bg-rose-50 px-4 py-2.5 text-[14px] font-medium text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-emerald-500/25 bg-emerald-50 px-4 py-2.5 text-[14px] font-medium text-[#0f6e56]"
        >
          Password updated successfully! Synchronizing session...
        </motion.div>
      )}

      <button
        type="submit"
        disabled={loading || success}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[#185fa5] px-5 text-[13px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#378add] disabled:cursor-not-allowed disabled:opacity-50 shadow-lg"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
        {loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}
