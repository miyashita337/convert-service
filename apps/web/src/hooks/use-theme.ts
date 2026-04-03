"use client";

import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
    }
  }, []);

  // Listen for OS theme changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;

    const mq = matchMedia("(prefers-color-scheme:dark)");
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    const root = document.documentElement;

    if (next === "system") {
      localStorage.removeItem("theme");
      const prefersDark = matchMedia("(prefers-color-scheme:dark)").matches;
      root.classList.toggle("dark", prefersDark);
    } else {
      localStorage.setItem("theme", next);
      root.classList.toggle("dark", next === "dark");
    }
  }, []);

  const toggle = useCallback(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  }, [setTheme]);

  return { theme, setTheme, toggle };
}
