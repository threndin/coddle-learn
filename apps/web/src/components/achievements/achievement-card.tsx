"use client";

import Link from "next/link";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  isAchievementSlug,
  type AchievementCategory,
} from "@coddle/shared";
import { Icon, type IconName } from "@/components/ui/icon";
import type { AchievementItem } from "@/lib/achievements";

type Theme = {
  from: string;
  to: string;
  accent: string;
  soft: string;
  ring: string;
  label: string;
};

/** One distinct palette per achievement so cards never share colors. */
const SLUG_THEMES: Record<string, Theme> = {
  "first-course": {
    from: "#004CC8",
    to: "#003A9E",
    accent: "#5B9BFF",
    soft: "rgba(0, 76, 200, 0.12)",
    ring: "rgba(91, 155, 255, 0.55)",
    label: "Common",
  },
  "first-project": {
    from: "#0F766E",
    to: "#115E59",
    accent: "#2DD4BF",
    soft: "rgba(15, 118, 110, 0.12)",
    ring: "rgba(45, 212, 191, 0.5)",
    label: "Notable",
  },
  "streak-7": {
    from: "#C2410C",
    to: "#9A3412",
    accent: "#FB923C",
    soft: "rgba(194, 65, 12, 0.12)",
    ring: "rgba(251, 146, 60, 0.55)",
    label: "Notable",
  },
  "open-source-contributor": {
    from: "#15803D",
    to: "#166534",
    accent: "#4ADE80",
    soft: "rgba(21, 128, 61, 0.12)",
    ring: "rgba(74, 222, 128, 0.5)",
    label: "Standout",
  },
  "roadmap-completed": {
    from: "#1E3A5F",
    to: "#0F2744",
    accent: "#7DD3FC",
    soft: "rgba(30, 58, 95, 0.14)",
    ring: "rgba(125, 211, 252, 0.45)",
    label: "Standout",
  },
  mentor: {
    from: "#BE185D",
    to: "#9D174D",
    accent: "#F9A8D4",
    soft: "rgba(190, 24, 93, 0.12)",
    ring: "rgba(249, 168, 212, 0.5)",
    label: "Legendary",
  },
  "course-creator": {
    from: "#B45309",
    to: "#92400E",
    accent: "#FBBF24",
    soft: "rgba(180, 83, 9, 0.12)",
    ring: "rgba(251, 191, 36, 0.55)",
    label: "Standout",
  },
  "resource-reviewer": {
    from: "#0E7490",
    to: "#155E75",
    accent: "#67E8F9",
    soft: "rgba(14, 116, 144, 0.12)",
    ring: "rgba(103, 232, 249, 0.5)",
    label: "Notable",
  },
};

const FALLBACK_THEME: Theme = {
  from: "#334155",
  to: "#1E293B",
  accent: "#94A3B8",
  soft: "rgba(51, 65, 85, 0.12)",
  ring: "rgba(148, 163, 184, 0.5)",
  label: "Common",
};

function themeFor(slug: string): Theme {
  return SLUG_THEMES[slug] ?? FALLBACK_THEME;
}

function categoryLabel(category: string) {
  return category in ACHIEVEMENT_CATEGORY_LABELS
    ? ACHIEVEMENT_CATEGORY_LABELS[category as AchievementCategory]
    : category;
}

function formatEarned(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function achievementIcon(name: string): IconName {
  const icons = new Set<string>([
    "book",
    "layers",
    "sparkle",
    "code",
    "target",
    "users",
    "pencil",
    "eye",
    "star",
  ]);
  return (icons.has(name) ? name : "star") as IconName;
}

function Medallion({
  item,
  theme,
  size = "md",
}: {
  item: AchievementItem;
  theme: Theme;
  size?: "md" | "lg";
}) {
  const dim =
    size === "lg"
      ? "h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32"
      : "h-[4.25rem] w-[4.25rem] sm:h-20 sm:w-20 md:h-24 md:w-24";
  const iconSize =
    size === "lg" ? "h-8 w-8 sm:h-10 sm:w-10 md:h-11 md:w-11" : "h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8";
  const badge =
    size === "lg"
      ? "h-7 w-7"
      : "h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7";
  const badgeIcon = size === "lg" ? "h-3.5 w-3.5" : "h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5";

  return (
    <div className={`relative mx-auto ${dim}`}>
      <div
        className={[
          "absolute inset-0 rounded-full transition duration-500",
          item.earned ? "scale-100 opacity-100" : "scale-95 opacity-40",
        ].join(" ")}
        style={{
          background: `radial-gradient(circle at 35% 30%, ${theme.accent}55, transparent 55%), radial-gradient(circle at 70% 75%, ${theme.from}33, transparent 50%)`,
        }}
      />
      <div
        className={[
          "absolute inset-[6%] rounded-full border-2 transition duration-500",
          item.earned ? "opacity-100" : "opacity-50",
        ].join(" ")}
        style={{
          borderColor: item.earned ? theme.ring : "var(--border-strong)",
          boxShadow: item.earned
            ? `0 0 0 3px ${theme.soft}, inset 0 1px 0 rgba(255,255,255,0.35)`
            : "inset 0 1px 0 rgba(255,255,255,0.2)",
          background: item.earned
            ? `linear-gradient(145deg, ${theme.from}, ${theme.to})`
            : "linear-gradient(145deg, #cbd5e1, #94a3b8)",
        }}
      />
      <div
        className={[
          "absolute inset-[18%] flex items-center justify-center rounded-full transition duration-500",
          item.earned ? "text-white" : "text-white/70",
        ].join(" ")}
        style={{
          background: item.earned
            ? `linear-gradient(160deg, ${theme.accent}33, transparent 60%), linear-gradient(145deg, ${theme.from}, ${theme.to})`
            : "linear-gradient(145deg, #94a3b8, #64748b)",
        }}
      >
        <Icon
          name={achievementIcon(item.icon)}
          className={`${iconSize} ${item.earned ? "" : "opacity-70"}`}
          strokeWidth={1.9}
        />
      </div>
      {!item.earned ? (
        <div
          className={`absolute -bottom-0.5 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface text-ink-muted shadow-sm ${badge}`}
        >
          <svg viewBox="0 0 24 24" className={badgeIcon} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
      ) : (
        <div
          className={`absolute -bottom-0.5 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full text-white shadow-sm ${badge}`}
          style={{ background: theme.from }}
        >
          <Icon name="check" className={badgeIcon} strokeWidth={2.4} />
        </div>
      )}
    </div>
  );
}

export function AchievementCard({
  item,
  priority = 0,
}: {
  item: AchievementItem;
  /** Stagger entrance motion. */
  priority?: number;
}) {
  const theme = themeFor(item.slug);
  const href = isAchievementSlug(item.slug) ? `/achievements/${item.slug}` : "/achievements";

  return (
    <Link
      href={href}
      className={[
        "group relative flex h-full flex-col overflow-hidden rounded-xl border transition duration-300 sm:rounded-2xl",
        "motion-safe:[animation:achievement-card-in_420ms_ease-out_both]",
        item.earned
          ? "border-border bg-surface hover:-translate-y-1 hover:shadow-[0_18px_40px_-28px_var(--brand-glow)]"
          : "border-dashed border-border bg-surface-subtle/70 hover:border-border-strong",
      ].join(" ")}
      style={{
        animationDelay: `${Math.min(priority, 8) * 45}ms`,
      }}
    >
      {/* Header plane */}
      <div
        className="relative overflow-hidden px-2.5 pb-7 pt-2.5 sm:px-4 sm:pb-9 sm:pt-4 md:px-5 md:pb-10 md:pt-5"
        style={{
          background: item.earned
            ? `linear-gradient(155deg, ${theme.from} 0%, ${theme.to} 100%)`
            : "linear-gradient(155deg, #e2e8f0 0%, #cbd5e1 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0 1px, transparent 1.5px), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.2) 0 1px, transparent 1.5px)",
            backgroundSize: "18px 18px, 22px 22px",
          }}
        />
        <div className="relative flex items-start justify-between gap-1.5">
          <span
            className={[
              "max-w-[55%] truncate rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] sm:max-w-none sm:rounded-md sm:px-2 sm:py-1 sm:text-[10px] sm:tracking-[0.16em]",
              item.earned ? "bg-white/15 text-white" : "bg-white/50 text-ink-muted",
            ].join(" ")}
          >
            {theme.label}
          </span>
          <span
            className={[
              "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] sm:rounded-md sm:px-2 sm:py-1 sm:text-[10px] sm:tracking-[0.14em]",
              item.earned ? "bg-white text-[color:var(--brand-navy)]" : "bg-surface text-ink-muted",
            ].join(" ")}
          >
            {item.earned ? (
              <>
                <span className="sm:hidden">Done</span>
                <span className="hidden sm:inline">Achieved</span>
              </>
            ) : (
              "Locked"
            )}
          </span>
        </div>

        <div className="relative mt-3 sm:mt-4 md:mt-5">
          <Medallion item={item} theme={theme} />
        </div>

        {item.earned ? (
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-20 w-20 rounded-full opacity-40 transition duration-500 group-hover:opacity-70 sm:h-28 sm:w-28"
            style={{
              background: `radial-gradient(circle, ${theme.accent}, transparent 70%)`,
            }}
          />
        ) : null}
      </div>

      {/* Body */}
      <div className="relative flex flex-1 flex-col px-2.5 pb-2.5 pt-3 sm:px-4 sm:pb-4 sm:pt-3.5 md:px-5 md:pb-5 md:pt-4">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-muted sm:text-[10px] sm:tracking-[0.16em]">
          {categoryLabel(item.category)}
        </p>
        <h3
          className={[
            "mt-1 font-display text-sm font-bold leading-snug tracking-tight transition sm:mt-1.5 sm:text-base md:text-lg",
            item.earned ? "text-ink group-hover:text-brand" : "text-ink-muted",
          ].join(" ")}
        >
          {item.title}
        </h3>
        <p className="mt-1.5 line-clamp-3 flex-1 text-[11px] leading-relaxed text-ink-muted sm:mt-2 sm:line-clamp-none sm:text-sm">
          {item.summary}
        </p>

        <div
          className="mt-3 rounded-lg px-2 py-1.5 sm:mt-4 sm:rounded-xl sm:px-3 sm:py-2.5"
          style={{ background: item.earned ? theme.soft : "var(--surface)" }}
        >
          {item.earned && item.earnedAt ? (
            <p className="text-[10px] font-semibold sm:text-xs" style={{ color: theme.from }}>
              <span className="sm:hidden">{formatEarned(item.earnedAt)}</span>
              <span className="hidden sm:inline">Achieved {formatEarned(item.earnedAt)}</span>
            </p>
          ) : (
            <p className="line-clamp-3 text-[10px] leading-relaxed text-ink-muted sm:line-clamp-none sm:text-xs">
              <span className="font-semibold text-ink">Quest: </span>
              {item.howToEarn}
            </p>
          )}
        </div>
      </div>

      {item.earned ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 opacity-90 transition group-hover:opacity-100 sm:h-1"
          style={{ background: `linear-gradient(90deg, ${theme.from}, ${theme.accent})` }}
        />
      ) : null}
    </Link>
  );
}

export function AchievementHeroCard({ item }: { item: AchievementItem }) {
  const theme = themeFor(item.slug);

  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl border",
        item.earned ? "border-border bg-surface" : "border-dashed border-border bg-surface-subtle",
      ].join(" ")}
    >
      <div
        className="relative px-6 pb-14 pt-8 sm:px-10 sm:pb-16 sm:pt-10"
        style={{
          background: item.earned
            ? `linear-gradient(155deg, ${theme.from} 0%, ${theme.to} 100%)`
            : "linear-gradient(155deg, #e2e8f0 0%, #cbd5e1 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.4) 0 1px, transparent 1.5px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <span
            className={[
              "rounded-md px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em]",
              item.earned ? "bg-white/15 text-white" : "bg-white/55 text-ink-muted",
            ].join(" ")}
          >
            {theme.label} · {categoryLabel(item.category)}
          </span>
          <span
            className={[
              "rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em]",
              item.earned ? "bg-white text-[color:var(--brand-navy)]" : "bg-surface text-ink-muted",
            ].join(" ")}
          >
            {item.earned ? "Unlocked" : "Locked"}
          </span>
        </div>
        <div className="relative mt-8">
          <Medallion item={item} theme={theme} size="lg" />
        </div>
      </div>

      <div className="px-6 py-7 sm:px-10 sm:py-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {item.title}
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">{item.summary}</p>

        {item.earned && item.earnedAt ? (
          <p className="mt-6 text-sm font-semibold" style={{ color: theme.from }}>
            Unlocked {formatEarned(item.earnedAt)}
          </p>
        ) : (
          <div
            className="mt-6 rounded-2xl px-4 py-3.5"
            style={{ background: theme.soft }}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
              Quest
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">{item.howToEarn}</p>
          </div>
        )}
      </div>
    </div>
  );
}
