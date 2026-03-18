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
    <div className="relative w-full text-(--text)">
      {/* Fixed Background Layers */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_0%,#ffe7b8,transparent_33%),radial-gradient(circle_at_100%_100%,#baf2ef,transparent_38%),linear-gradient(180deg,#fffef8,#f7fbff_58%,#ecfeff)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-size-[34px_34px] opacity-45" />
      <div className="pointer-events-none fixed -left-20 top-8 z-0 h-80 w-80 rounded-full bg-amber-300/35 blur-[110px]" />
      <div className="pointer-events-none fixed -bottom-14 -right-20 z-0 h-96 w-96 rounded-full bg-cyan-300/35 blur-[120px]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[85rem] flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Link
          href="/"
          className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white/75 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-700 backdrop-blur-sm transition hover:border-black/20 hover:bg-white"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <motion.div
          variants={shellVariants}
          initial="hidden"
          animate="visible"
          className="grid w-full items-stretch gap-6 lg:gap-10 xl:grid-cols-12"
        >
          <motion.section
            variants={itemVariants}
            className="relative hidden flex-col justify-center overflow-hidden rounded-[2rem] border border-black/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,248,221,0.82))] p-8 shadow-[0_18px_50px_rgba(18,31,51,0.1)] backdrop-blur-xl sm:p-10 xl:flex xl:col-span-5"
          >
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-200/45 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-cyan-200/40 blur-3xl" />

            <div className="relative pt-1 flex flex-col justify-center h-full">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-black/10 bg-white/75 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-700">
                <Sparkles size={14} className="text-amber-500" />
                {badge}
              </span>
              
              {illustration && (
                <div className="mt-8">
                  {illustration}
                </div>
              )}

              <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-4xl lg:text-[2.25rem]">
                {panelTitle}
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-zinc-600 sm:text-base">
                {panelDescription}
              </p>

              <div className="mt-8 space-y-3">
                {panelPoints.map((point) => (
                  <p
                    key={point}
                    className="flex items-start gap-2.5 rounded-2xl border border-black/10 bg-white/70 px-3.5 py-2.5 text-[14px] font-medium leading-relaxed text-zinc-700"
                  >
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />
                    {point}
                  </p>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section
            variants={itemVariants}
            className="w-full flex-col justify-center flex rounded-[2rem] border border-black/10 bg-white/95 p-6 shadow-[0_22px_56px_rgba(17,24,39,0.14)] backdrop-blur-xl sm:mx-auto sm:p-10 xl:col-span-7"
          >
            <div className="mb-8">
              <div className="mb-3 inline-flex items-center rounded-full border border-black/10 bg-zinc-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-700">
                {badge}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-[2.25rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-600 sm:text-base">
                {subtitle}
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-5 sm:p-8">
              {children}
            </div>

            <p className="mt-6 text-center text-[14px] font-medium text-zinc-600">
              {bottomText}{" "}
              <Link
                href={bottomLinkHref}
                className="font-semibold text-zinc-900 underline decoration-amber-400/80 underline-offset-4 hover:text-amber-600"
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
