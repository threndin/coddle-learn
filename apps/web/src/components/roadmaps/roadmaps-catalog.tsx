"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SKILL_CATALOG, levelById } from "@coddle/shared";
import { useAppUser } from "@/components/app/app-user-context";
import type { RoadmapCatalogItem } from "@/lib/roadmaps";

type LevelFilter = "all" | "beginner" | "intermediate" | "advanced";
type ScopeFilter = "all" | "mine";

function skillName(slug: string) {
  return SKILL_CATALOG.find((skill) => skill.slug === slug)?.name ?? slug;
}

export function RoadmapsCatalog({
  initialRoadmaps,
}: {
  initialRoadmaps: RoadmapCatalogItem[] | null;
}) {
  const user = useAppUser();
  const [roadmaps] = useState<RoadmapCatalogItem[] | null>(initialRoadmaps);
  const [level, setLevel] = useState<LevelFilter>("all");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [error] = useState<string | null>(
    initialRoadmaps ? null : "Could not load roadmaps",
  );

  const filtered = useMemo(() => {
    if (!roadmaps) return [];
    return roadmaps.filter((roadmap) => {
      if (level !== "all" && roadmap.level !== level) return false;
      if (scope === "mine" && !roadmap.enrolled) return false;
      return true;
    });
  }, [roadmaps, level, scope]);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <div className="max-w-2xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Roadmaps
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Choose a path
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          Structured learning paths with ordered steps, curated resources, and
          progress you can pick up anytime.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "All levels"],
            ["beginner", "Beginner"],
            ["intermediate", "Intermediate"],
            ["advanced", "Advanced"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setLevel(id)}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              level === id
                ? "bg-brand text-white"
                : "border border-border bg-surface text-ink-muted hover:border-border-strong",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        {(
          [
            ["all", "All paths"],
            ["mine", "My paths"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setScope(id)}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              scope === id
                ? "bg-brand text-white"
                : "border border-border bg-surface text-ink-muted hover:border-border-strong",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm text-ink-muted">
          {error}
        </p>
      ) : null}

      {roadmaps && filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-8">
          <h2 className="font-display text-xl font-bold text-ink">No matching roadmaps</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {scope === "mine"
              ? "You have not started a roadmap in this filter yet. Browse all paths to enroll."
              : "Try another level filter to see more paths."}
          </p>
          {scope === "mine" ? (
            <button
              type="button"
              onClick={() => setScope("all")}
              className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
            >
              Show all paths
            </button>
          ) : null}
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((roadmap) => {
            const levelLabel = levelById(String(roadmap.level));
            const isStarter = user.startingRoadmapSlug === roadmap.slug;
            const matched = roadmap.matchedSkillSlugs ?? [];
            return (
              <article
                key={roadmap.slug}
                className={[
                  "flex flex-col rounded-2xl border bg-surface p-5 transition",
                  isStarter || roadmap.isPrimary
                    ? "border-brand/40 shadow-[0_0_0_1px_rgb(0_76_200/0.12)]"
                    : "border-border hover:border-border-strong",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    {levelLabel?.label ?? roadmap.level}
                  </p>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {roadmap.isPrimary ? (
                      <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand">
                        Primary
                      </span>
                    ) : isStarter ? (
                      <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand">
                        Your start
                      </span>
                    ) : null}
                    {roadmap.enrolled && !roadmap.isPrimary ? (
                      <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
                        In progress
                      </span>
                    ) : null}
                  </div>
                </div>

                <h2 className="mt-3 font-display text-xl font-bold tracking-tight text-ink">
                  {roadmap.name}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                  {roadmap.summary}
                </p>

                {matched.length > 0 ? (
                  <p className="mt-3 text-xs font-medium text-brand">
                    Matches {matched.length === 1
                      ? skillName(matched[0]!)
                      : `${matched.length} of your skills`}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                  <span>About {roadmap.weeks} weeks</span>
                  <span aria-hidden>·</span>
                  <span>{roadmap.stepCount} steps</span>
                  {roadmap.enrolled ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="font-semibold tabular-nums text-brand">
                        {roadmap.progressPercent}%
                      </span>
                    </>
                  ) : null}
                </div>

                {roadmap.enrolled ? (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-subtle">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${roadmap.progressPercent}%` }}
                    />
                  </div>
                ) : null}

                <Link
                  href={`/roadmaps/${roadmap.slug}`}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  {roadmap.enrolled
                    ? roadmap.completedAt
                      ? "Review roadmap"
                      : "Continue"
                    : "View roadmap"}
                </Link>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
