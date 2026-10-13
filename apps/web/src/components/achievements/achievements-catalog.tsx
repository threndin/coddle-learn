"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  type AchievementCategory,
} from "@coddle/shared";
import { AchievementCard } from "@/components/achievements/achievement-card";
import { Icon } from "@/components/ui/icon";
import {
  fetchAchievements,
  type AchievementsCatalog,
} from "@/lib/achievements";

type Filter = "all" | "earned" | "locked" | AchievementCategory;

const CATEGORY_FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "earned", label: "Unlocked" },
  { id: "locked", label: "Locked" },
  { id: "learning", label: "Learning" },
  { id: "building", label: "Building" },
  { id: "contribution", label: "Contribution" },
  { id: "community", label: "Community" },
];

function categoryLabel(category: string) {
  return category in ACHIEVEMENT_CATEGORY_LABELS
    ? ACHIEVEMENT_CATEGORY_LABELS[category as AchievementCategory]
    : category;
}

export function AchievementsCatalog({
  initial,
}: {
  initial: AchievementsCatalog | null;
}) {
  const [catalog, setCatalog] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initial === null);

  useEffect(() => {
    if (initial !== null) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchAchievements();
        if (cancelled) return;
        setCatalog(data);
        setError(null);
      } catch {
        if (!cancelled) setError("Could not load achievements");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const needle = query.trim().toLowerCase();
    return catalog.achievements.filter((item) => {
      if (filter === "earned" && !item.earned) return false;
      if (filter === "locked" && item.earned) return false;
      if (
        filter !== "all" &&
        filter !== "earned" &&
        filter !== "locked" &&
        item.category !== filter
      ) {
        return false;
      }
      if (!needle) return true;
      const haystack = [item.title, item.summary, item.howToEarn, categoryLabel(item.category)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [catalog, filter, query]);

  const earned = filtered.filter((item) => item.earned);
  const locked = filtered.filter((item) => !item.earned);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <div className="max-w-4xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Achievements
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Milestones along the way
        </h1>
        <p className="mt-1 text-base leading-relaxed text-ink-muted">
          Smaller wins from learning, building, and contributing. Earn them as you go — locked
          ones show what is still ahead.
        </p>
        {catalog ? (
          <p className="mt-4 text-sm font-semibold text-ink">
            {catalog.earnedCount} of {catalog.totalCount} earned
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative w-full flex-1 sm:min-w-56 sm:max-w-sm">
          <span className="sr-only">Search achievements</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cards"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </label>
        <div className="flex w-full flex-wrap gap-1 rounded-xl border border-border bg-surface p-1 sm:w-auto">
          {CATEGORY_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={[
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                filter === item.id ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-ink-muted">Loading achievements…</p>
      ) : error ? (
        <p className="mt-10 text-sm text-rose-600">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border px-4 py-14 text-center">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">No matches</h2>
          <p className="mt-2 text-sm text-ink-muted">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-10">
          {earned.length > 0 ? (
            <section>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl font-bold tracking-tight text-ink">
                  Unlocked
                </h2>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  {earned.length} achievements
                </p>
              </div>
              <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {earned.map((item, index) => (
                  <li key={item.slug}>
                    <AchievementCard item={item} priority={index} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {locked.length > 0 ? (
            <section>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl font-bold tracking-tight text-ink">
                  Locked
                </h2>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  {locked.length} remaining
                </p>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                Complete the quest on each card to unlock it.
              </p>
              <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {locked.map((item, index) => (
                  <li key={item.slug}>
                    <AchievementCard item={item} priority={index + earned.length} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
