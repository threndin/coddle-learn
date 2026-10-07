"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"] as const;

export function starLabel(rating: number) {
  return STAR_LABELS[Math.round(rating)] ?? "";
}

/** Read-only stars with fractional fill. */
export function Stars({
  value,
  size = "sm",
}: {
  value: number;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const box =
    size === "lg" ? "h-6 w-6" : size === "md" ? "h-5 w-5" : size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((index) => {
        const fill = Math.max(0, Math.min(1, value - (index - 1)));
        return (
          <span key={index} className={`relative inline-block ${box}`}>
            <Icon name="star" className={`absolute inset-0 ${box} text-border-strong`} filled />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Icon name="star" className={`${box} text-amber-400`} filled />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function StarInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div
        role="radiogroup"
        aria-label="Rating"
        className="inline-flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            disabled={disabled}
            onMouseEnter={() => setHover(star)}
            onFocus={() => setHover(star)}
            onBlur={() => setHover(0)}
            onClick={() => onChange(star)}
            className="rounded-md p-0.5 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60"
          >
            <Icon
              name="star"
              className={`h-7 w-7 transition ${star <= shown ? "text-amber-400" : "text-border-strong"}`}
              filled
            />
          </button>
        ))}
      </div>
      <span className="min-w-16 text-sm font-semibold text-ink-muted">{starLabel(shown)}</span>
    </div>
  );
}
