"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  /** Effective appearance (after resolving "system") */
  theme: ResolvedTheme;
  /** User choice: light, dark, or follow device */
  themePreference: ThemePreference;
  toggleTheme: () => void;
  setTheme: (theme: ResolvedTheme) => void;
  setThemePreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  themePreference: "system",
  toggleTheme: () => {},
  setTheme: () => {},
  setThemePreference: () => {},
});

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem("theme");
    if (v === "dark" || v === "light" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

function getSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveTheme(preference: ThemePreference, systemIsDark: boolean): ResolvedTheme {
  if (preference === "system") return systemIsDark ? "dark" : "light";
  return preference;
}

function applyThemeToDom(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window !== "undefined" ? readStoredPreference() : "system"
  );
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== "undefined" ? getSystemDark() : false
  );
  const [mounted, setMounted] = useState(false);

  const theme = useMemo(
    () => resolveTheme(themePreference, systemDark),
    [themePreference, systemDark]
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    try {
      const stored = readStoredPreference();
      setPreferenceState((current) => (stored !== current ? stored : current));
    } catch {
      /* ignore */
    }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyThemeToDom(theme);
    try {
      localStorage.setItem("theme", themePreference);
    } catch (error) {
      console.warn("Failed to persist theme preference:", error);
    }
  }, [theme, themePreference, mounted]);

  const setThemePreference = (preference: ThemePreference) => {
    setPreferenceState(preference);
  };

  const setTheme = (newTheme: ResolvedTheme) => {
    setPreferenceState(newTheme);
  };

  const toggleTheme = () => {
    setPreferenceState((prev) => {
      const resolved = resolveTheme(prev, systemDark);
      return resolved === "dark" ? "light" : "dark";
    });
  };

  return (
    <ThemeContext.Provider
      value={{ theme, themePreference, toggleTheme, setTheme, setThemePreference }}
    >
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
