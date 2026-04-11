"use client";

import React from "react";

import { CheckCircle2 } from "lucide-react";

interface PasswordRequirementsProps {
  readonly passwordChecks: {
    readonly minimumLength: boolean;
    readonly hasUpper: boolean;
    readonly hasLower: boolean;
    readonly hasNumber: boolean;
    readonly hasSpecial: boolean;
  };
  readonly size?: "sm" | "md";
}

export function PasswordRequirements({ passwordChecks, size = "md" }: PasswordRequirementsProps) {
  const iconSize = size === "sm" ? 12 : 14;
  const textSize = size === "sm" ? "text-[11px]" : "text-[12px]";
  const gridGap = size === "sm" ? "gap-y-1" : "gap-y-1.5";

  const RequirementsList = [
    { key: "minimumLength", label: "12+ characters" },
    { key: "hasUpper", label: "Uppercase [A-Z]" },
    { key: "hasLower", label: "Lowercase [a-z]" },
    { key: "hasNumber", label: "One number [0-9]" },
    { key: "hasSpecial", label: "Special char (@$!%*?&)" },
  ];

  return (
    <div className={`rounded-2xl border-2 border-auth-input-border bg-auth-input-bg p-3.5 space-y-2 ${textSize} font-medium text-auth-text-muted transition-all`}>
      <p className="mb-2 text-[10px] uppercase tracking-wider font-bold opacity-60">Security Requirements</p>
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 ${gridGap}`}>
        {RequirementsList.map((req) => {
          const isMet = passwordChecks[req.key as keyof typeof passwordChecks];
          return (
            <div 
              key={req.key}
              className={`flex items-center gap-2 transition-colors ${isMet ? "text-[#0f6e56] font-bold" : ""}`}
            >
              <CheckCircle2 
                size={iconSize} 
                className={isMet ? "text-[#0f6e56]" : "text-zinc-400"} 
              />
              {req.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
