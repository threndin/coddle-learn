"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  formatMinutes,
  practiceDaysLabel,
  roadmapBySlug,
  weeklyPracticeLabel,
} from "@coddle/shared";
import type { PublicUser } from "@/lib/auth";
import {
  ContributionGraph,
  buildPointsWeeks,
  type DaySelection,
} from "@/components/dashboard/contribution-graph";

export function LearningActivity({ user }: { user: PublicUser }) {
  const [selected, setSelected] = useState<DaySelection | null>(null);
  const activity = useMemo(
    () =>
      buildPointsWeeks({
        seed: hashId(user.id),
        points: user.points,
        earnedAt: user.onboardingCompletedAt,
      }),
    [user.id, user.points, user.onboardingCompletedAt],
  );
  const roadmap = user.startingRoadmapSlug
    ? roadmapBySlug(user.startingRoadmapSlug)
    : null;

  return (
    <section aria-labelledby="learning-activity-heading" className="min-w-0 space-y-3">
      <div>
        <h2
          id="learning-activity-heading"
          className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl"
        >
          Your points
        </h2>
      </div>

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-ink-muted">
                Each square is points earned that day from learning milestones.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-ink-muted">
              <span>
                <span className="font-semibold tabular-nums text-ink">
                  {activity.total.toLocaleString()}
                </span>{" "}
                pts
              </span>
              <span>
                <span className="font-semibold tabular-nums text-ink">{activity.activeDays}</span>{" "}
                earning days
              </span>
            </div>
          </div>

          <ContributionGraph
            weeks={activity.weeks}
            busiest={activity.busiest}
            selected={selected?.date ?? null}
            onSelect={setSelected}
          />

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <MiniStat label="Total points" value={user.points.toLocaleString()} />
            <MiniStat label="Earning days" value={activity.activeDays} />
            <MiniStat
              label="Daily goal"
              value={user.dailyGoalMinutes ? formatMinutes(user.dailyGoalMinutes) : "-"}
            />
          </div>

          {selected ? (
            <p className="mt-3 text-xs text-ink-muted">
              Selected{" "}
              <span className="font-medium text-ink">
                {selected.date.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              : {selected.count.toLocaleString()} pt{selected.count === 1 ? "" : "s"}.
            </p>
          ) : null}
        </article>

        <aside className="rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-20">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Today’s plan
              </p>
              <h3 className="mt-2 font-display text-lg font-bold tracking-tight text-ink">
                {roadmap?.name ?? "Your path"}
              </h3>
            </div>
            <Link
              href="/roadmaps"
              className="text-xs font-semibold text-brand transition hover:text-brand-deep"
            >
              Open
            </Link>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {roadmap
              ? `Next up: ${roadmap.nodes[0] ?? "your first node"}. Practice to earn more points.`
              : "Choose a roadmap so today’s session has a clear next step."}
          </p>

          <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Practice</dt>
              <dd className="font-medium text-ink">
                {user.dailyGoalMinutes
                  ? formatMinutes(user.dailyGoalMinutes)
                  : "Not set"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Days</dt>
              <dd className="text-right font-medium text-ink">
                {user.practiceDays.length
                  ? practiceDaysLabel(user.practiceDays)
                  : "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Weekly</dt>
              <dd className="font-medium text-ink">
                {user.dailyGoalMinutes
                  ? weeklyPracticeLabel(user.dailyGoalMinutes, user.practiceDays.length)
                  : "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Points</dt>
              <dd className="font-mono font-semibold tabular-nums text-brand">
                {user.points.toLocaleString()}
              </dd>
            </div>
          </dl>

          <Link
            href="/roadmaps"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Start today’s session
          </Link>
        </aside>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface-subtle px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function hashId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
