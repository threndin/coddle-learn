"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  COURSE_ACCENTS,
  COURSE_LIMITS,
  EXPERIENCE_LEVELS,
  SKILL_CATALOG,
  SKILL_CATEGORIES,
  levelById,
  type SkillCategory,
} from "@coddle/shared";
import { Icon } from "@/components/ui/icon";

export function FieldLabel({
  htmlFor,
  label,
  hint,
  count,
  max,
}: {
  htmlFor?: string;
  label: string;
  hint?: ReactNode;
  count?: number;
  max?: number;
}) {
  const near = count !== undefined && max !== undefined && count > max * 0.9;
  return (
    <div className="mb-1.5 flex items-end justify-between gap-3">
      <div>
        <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
      </div>
      {count !== undefined && max !== undefined ? (
        <span
          className={[
            "shrink-0 font-mono text-[11px] tabular-nums",
            count > max ? "text-rose-600" : near ? "text-amber-600" : "text-ink-muted",
          ].join(" ")}
        >
          {count}/{max}
        </span>
      ) : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-60";

export function LevelPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (level: string) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Level" className="grid gap-2 sm:grid-cols-3">
      {EXPERIENCE_LEVELS.map((level, index) => {
        const active = value === level.id;
        return (
          <button
            key={level.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(level.id)}
            className={[
              "group rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
              active
                ? "border-brand bg-brand-soft ring-4 ring-brand/10"
                : "border-border bg-surface hover:border-border-strong",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm font-semibold ${active ? "text-brand" : "text-ink"}`}>
                {level.label}
              </span>
              <span className="flex items-end gap-0.5" aria-hidden>
                {[0, 1, 2].map((bar) => (
                  <span
                    key={bar}
                    className={[
                      "w-1 rounded-sm",
                      bar === 0 ? "h-2" : bar === 1 ? "h-3" : "h-4",
                      bar <= index ? (active ? "bg-brand" : "bg-ink-muted") : "bg-border",
                    ].join(" ")}
                  />
                ))}
              </span>
            </div>
            <p className="mt-1 text-xs leading-snug text-ink-muted">{level.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export function SkillPicker({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (slugs: string[]) => void;
  disabled?: boolean;
}) {
  const [category, setCategory] = useState<SkillCategory>("All");
  const [query, setQuery] = useState("");
  const selected = new Set(value);
  const full = value.length >= COURSE_LIMITS.skillMax;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SKILL_CATALOG.filter(
      (skill) =>
        (category === "All" || skill.category === category) &&
        (!q || skill.name.toLowerCase().includes(q)),
    );
  }, [category, query]);

  function toggle(slug: string) {
    if (selected.has(slug)) onChange(value.filter((item) => item !== slug));
    else if (!full) onChange([...value, slug]);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter skills"
            disabled={disabled}
            className="w-full rounded-lg border border-border bg-surface-subtle py-1.5 pl-8 pr-2 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {SKILL_CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={[
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                category === item
                  ? "bg-ink text-surface"
                  : "text-ink-muted hover:bg-surface-subtle hover:text-ink",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {visible.map((skill) => {
          const active = selected.has(skill.slug);
          return (
            <button
              key={skill.slug}
              type="button"
              aria-pressed={active}
              disabled={disabled || (!active && full)}
              onClick={() => toggle(skill.slug)}
              className={[
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
              ].join(" ")}
            >
              {active ? <Icon name="check" className="h-3 w-3" strokeWidth={2.4} /> : null}
              {skill.name}
            </button>
          );
        })}
        {visible.length === 0 ? (
          <p className="px-1 py-1.5 text-xs text-ink-muted">No skills match that filter.</p>
        ) : null}
      </div>
      <p className="mt-3 text-[11px] text-ink-muted">
        {value.length}/{COURSE_LIMITS.skillMax} selected · Learners with these skills see this course
        as a match.
      </p>
    </div>
  );
}

export function AccentPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (accent: string) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-2">
      {COURSE_ACCENTS.map((accent) => {
        const active = accent.id === value;
        return (
          <button
            key={accent.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={accent.label}
            title={accent.label}
            disabled={disabled}
            onClick={() => onChange(accent.id)}
            className={[
              "relative h-8 w-8 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60",
              active
                ? "ring-2 ring-offset-2 ring-offset-surface"
                : "hover:scale-110",
            ].join(" ")}
            style={{
              background: `linear-gradient(135deg, ${accent.id}, #0B1220)`,
              ...(active ? { ["--tw-ring-color" as string]: accent.id } : {}),
            }}
          >
            {active ? (
              <Icon name="check" className="absolute inset-0 m-auto h-4 w-4 text-white" strokeWidth={2.6} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Live HTML stand-in for the generated SVG cover, so edits show instantly. */
export function CoverPreview({
  title,
  level,
  accent,
  imageUrl,
  className = "",
}: {
  title: string;
  level: string;
  accent: string;
  imageUrl?: string | null;
  className?: string;
}) {
  if (imageUrl) {
    return (
      <div className={`relative aspect-[1200/630] overflow-hidden rounded-xl bg-surface-subtle ${className}`}>
        {/* Uploaded covers live on R2; hosts vary with CDN config. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  const levelLabel = levelById(level)?.label ?? level;
  return (
    <div
      className={`@container relative aspect-[1200/630] overflow-hidden rounded-xl ${className}`}
      style={{ background: `linear-gradient(135deg, ${accent} 0%, #0B1220 100%)` }}
      aria-hidden
    >
      <span className="absolute right-[-3%] top-[-9%] h-[57%] w-[30%] rounded-full bg-white/[0.08]" />
      <span className="absolute bottom-[-18%] left-[-5%] h-[70%] w-[37%] rounded-full bg-white/[0.06]" />
      <div className="absolute inset-0 flex flex-col px-[6%] py-[8%]">
        <p className="text-[2.3cqw] font-bold tracking-[0.33em] text-white/75">CODDLE LEARN</p>
        <div className="flex flex-1 flex-col justify-center">
          <p className="line-clamp-3 max-w-[85%] text-[5.2cqw] font-extrabold leading-[1.12] text-white">
            {title.trim() || "Your course title"}
          </p>
          <p className="mt-[2.5%] text-[2.3cqw] font-semibold text-white/80">{levelLabel}</p>
        </div>
      </div>
    </div>
  );
}
