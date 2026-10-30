"use client";

import { useEffect, useState } from "react";
import { applyThemePreference, resolvedDark, subscribeTheme } from "@/lib/theme";

export function ThemeToggle({
  variant = "icon",
  className = "",
}: {
  variant?: "icon" | "menu";
  className?: string;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    function sync() {
      setDark(document.documentElement.classList.contains("dark"));
    }
    sync();
    return subscribeTheme(sync);
  }, []);

  function onToggle() {
    const next = !resolvedDark();
    applyThemePreference(next ? "dark" : "light");
    setDark(next);
  }

  if (variant === "menu") {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={onToggle}
        aria-pressed={dark}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition hover:bg-surface-subtle ${className}`}
      >
        <span className="text-ink-muted">{dark ? <SunIcon /> : <MoonIcon />}</span>
        <span>{dark ? "Light mode" : "Dark mode"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink transition hover:bg-surface-subtle ${className}`}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M16.5 13.2A6.8 6.8 0 0 1 10.7 4 7.2 7.2 0 1 0 20 13.3a6.8 6.8 0 0 1-3.5-.1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.5v1.8M12 18.7v1.8M3.5 12h1.8M18.7 12h1.8M6 6l1.3 1.3M16.7 16.7 18 18M18 6l-1.3 1.3M7.3 16.7 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
