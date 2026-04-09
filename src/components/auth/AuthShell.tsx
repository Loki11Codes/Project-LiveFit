"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";

interface AuthShellProps {
  badge: string;
  title: string;
  subtitle: string;
  panelTitle: string;
  panelDescription: string;
  panelPoints: string[];
  children: ReactNode;
  illustration?: ReactNode;
  bottomText: string;
  bottomLinkLabel: string;
  bottomLinkHref: string;
}

const shellVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
      when: "beforeChildren",
      staggerChildren: 0.08,
    },
  },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

function AuthBackground() {
  return (
    <>
      {/* Fixed Background Layers */}
      <div className="fixed inset-0 z-0 transition-colors duration-1000 bg-auth-bg" />
      
      {/* Dynamic Gradients (respecting theme via opacity) */}
      <div className="fixed inset-0 z-0 animate-pulse-slow bg-[radial-gradient(circle_at_8%_0%,#854f0b15,transparent_40%),radial-gradient(circle_at_100%_100%,#185fa520,transparent_45%)] opacity-(--auth-bg-opacity)" />

      {/* Grid Pattern */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-size-[34px_34px] transition-opacity duration-1000 bg-[linear-gradient(to_right,var(--input-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--input-border)_1px,transparent_1px)] opacity-40" />
      
      <div className="pointer-events-none fixed -left-20 top-8 z-0 h-80 w-80 rounded-full blur-[110px] transition-colors duration-1000 bg-[#854f0b]/10" />
      <div className="pointer-events-none fixed -bottom-14 -right-20 z-0 h-96 w-96 rounded-full blur-[120px] transition-colors duration-1000 bg-[#185fa5]/15" />
    </>
  );
}

export function AuthShell({
  badge,
  title,
  subtitle,
  panelTitle,
  panelDescription,
  panelPoints,
  children,
  illustration,
  bottomText,
  bottomLinkLabel,
  bottomLinkHref,
}: Readonly<AuthShellProps>) {

  return (
    <div className="relative w-full text-auth-text">
      <AuthBackground />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-400 flex-col justify-center px-4 py-2 sm:px-6 lg:px-8 lg:py-4">
        <Link
          href="/"
            className="mb-1 inline-flex w-fit items-center gap-2 rounded-full border border-auth-border bg-auth-surface/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-auth-text-muted backdrop-blur-sm transition hover:border-auth-border/40 hover:bg-auth-surface"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <motion.div
          variants={shellVariants}
          initial="hidden"
          animate="visible"
          className="grid w-full items-stretch gap-4 lg:gap-8 xl:grid-cols-12"
        >
          <motion.section
            variants={itemVariants}
            className="relative hidden flex-col justify-between overflow-hidden rounded-3xl border border-auth-border bg-auth-surface2/40 p-4 shadow-xl backdrop-blur-xl sm:p-6 xl:flex xl:col-span-5"
          >
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-200/45 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-cyan-200/40 blur-3xl" />

            <div className="relative pt-1">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-auth-border bg-auth-surface px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-auth-text-muted">
                <Sparkles size={14} className="text-amber-500" />
                {badge}
              </span>
              
              {illustration && (
                <div className="mt-4">
                  {illustration}
                </div>
              )}

              <h2 className="mt-3 max-w-sm text-xl font-semibold leading-tight tracking-tight text-auth-text sm:text-2xl lg:text-[1.6rem]">
                {panelTitle}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-auth-text-muted">
                {panelDescription}
              </p>

              <div className="mt-3 space-y-1.5">
                {panelPoints.map((point) => (
                  <p
                    key={point}
                    className="flex items-start gap-2.5 rounded-2xl border border-auth-border bg-auth-surface/60 px-3.5 py-2.5 text-[14px] font-medium leading-relaxed text-auth-text"
                  >
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0 text-[#0f6e56]"
                    />
                    {point}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-auto relative z-10 pt-4 border-t border-auth-border">
              <p className="text-[13px] font-serif italic leading-relaxed text-auth-text">
                &ldquo;Intelligence meets intensity.&rdquo;
              </p>
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-auth-text-muted">
                Caloriq Brand Mantra
              </p>
            </div>
          </motion.section>

          <motion.section
            variants={itemVariants}
            className="w-full flex-col justify-center flex rounded-3xl border border-auth-border bg-auth-bg/95 p-4 shadow-xl backdrop-blur-xl sm:mx-auto sm:p-6 xl:col-span-7"
          >
            <div className="mb-3">
              <div className="mb-3 flex items-center gap-3">
                <div className="w-8.5 h-8.5 bg-[#185fa5] rounded-[9px] flex items-center justify-center shadow-[0_4px_12px_rgba(24,95,165,0.25)] overflow-hidden">
                   <svg width="18" height="18" viewBox="0 0 30 30" fill="none">
                    <polyline 
                      points="2,15 8,15 10,8 13,22 16,10 19,18 21,15 28,15" 
                      stroke="white" 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      fill="none"
                    />
                  </svg>
                </div>
                <div className="text-[1.35rem] tracking-tighter font-black drop-shadow-sm text-auth-text">
                  Calor<span className="text-[#185fa5]">iq</span>
                </div>
              </div>

              <div className="mb-2 inline-flex items-center rounded-full border border-auth-border bg-auth-surface px-3 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-auth-text-muted">
                {badge}
              </div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-[1.65rem] text-auth-text">
                {title}
              </h1>
              <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-auth-text-muted">
                {subtitle}
              </p>
            </div>

            <div className="rounded-3xl border border-auth-border bg-auth-surface/40 p-5 sm:p-8">
              {children}
            </div>

            <p className="mt-2 text-center text-[12px] font-medium text-auth-text-muted">
              {bottomText}{" "}
              <Link
                href={bottomLinkHref}
                className="font-semibold underline decoration-[#185fa5]/60 underline-offset-4 hover:text-iq-blue-light transition-colors text-auth-text"
              >
                {bottomLinkLabel}
              </Link>
            </p>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
