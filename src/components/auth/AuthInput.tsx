"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
  rightElement?: React.ReactNode;
  error?: boolean;
}

export function AuthInput({
  icon: Icon,
  rightElement,
  error,
  className = "",
  ...props
}: AuthInputProps) {
  return (
    <div className="relative flex items-center w-full">
      <Icon
        size={18}
        className="pointer-events-none absolute left-4 text-zinc-400"
      />
      <input
        {...props}
        className={`h-10 w-full rounded-2xl border-2 pl-11 text-[14px] font-medium outline-none transition ${
          error
            ? "border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100/50"
            : "border-auth-input-border bg-auth-input-bg text-auth-input-text placeholder:text-zinc-500 focus:border-[#185fa5] focus:ring-4 focus:ring-[#185fa5]/10"
        } ${rightElement ? "pr-12" : "pr-4"} ${className}`}
      />
      {rightElement && (
        <div className="absolute right-4 flex items-center gap-2">
          {rightElement}
        </div>
      )}
    </div>
  );
}
