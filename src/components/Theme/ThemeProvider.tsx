"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import type { AppTheme } from "@/lib/types";

interface ThemeContextType {
  theme: AppTheme;
  accentColor: string;
  setTheme: (theme: AppTheme) => void;
  setAccentColor: (color: string) => void;
  toggleTheme: (event?: React.MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const BRAND_COLORS = [
  { name: "Caloriq Blue", hex: "#185fa5" },
  { name: "Vitality Green", hex: "#0f6e56" },
  { name: "Deep Purple", hex: "#534ab7" },
  { name: "Metabolic Amber", hex: "#854f0b" },
  { name: "Energy Coral", hex: "#993c1d" },
];

export function ThemeProvider({ children }: { readonly children: React.ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (globalThis.window === undefined) return "light";
    const savedTheme = localStorage.getItem("theme") as AppTheme;
    if (savedTheme) {
      document.documentElement.dataset.theme = savedTheme;
      return savedTheme;
    }
    const systemTheme = globalThis.window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = systemTheme;
    return systemTheme;
  });

  const [accentColor, setAccentColor] = useState(() => {
    if (globalThis.window === undefined) return "#185fa5";
    const savedAccent = localStorage.getItem("accentColor");
    if (savedAccent) {
      document.documentElement.style.setProperty("--user-accent", savedAccent);
      return savedAccent;
    }
    return "#185fa5";
  });

  useEffect(() => {
    // Empty effect to satisfy layout mounting logic if needed in future
  }, []);

  const updateTheme = (newTheme: AppTheme) => {
    setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem("theme", newTheme);
  };

  const updateAccentColor = (newColor: string) => {
    setAccentColor(newColor);
    document.documentElement.style.setProperty("--user-accent", newColor);
    localStorage.setItem("accentColor", newColor);
  };

  const toggleTheme = useCallback((event?: React.MouseEvent) => {
    const newTheme = theme === "light" ? "dark" : "light";
    
    // Check for View Transitions API support
    const isAppearanceTransition =
      document.startViewTransition !== undefined &&
      !globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!isAppearanceTransition || !event) {
      updateTheme(newTheme);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, globalThis.window.innerWidth - x),
      Math.max(y, globalThis.window.innerHeight - y)
    );

    document.documentElement.style.setProperty("--transition-x", `${x}px`);
    document.documentElement.style.setProperty("--transition-y", `${y}px`);

    const transition = document.startViewTransition(() => {
      updateTheme(newTheme);
    });

    transition.ready.then(() => {
      document.documentElement.classList.add("theme-transitioning");
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 1200,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      ).onfinish = () => {
        document.documentElement.classList.remove("theme-transitioning");
      };
    });
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    accentColor,
    setTheme: updateTheme,
    setAccentColor: updateAccentColor,
    toggleTheme,
  }), [theme, accentColor, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
