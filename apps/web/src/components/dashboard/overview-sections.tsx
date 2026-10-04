"use client";

import Link from "next/link";
import {
  formatMinutes,
  levelById,
  practiceDaysLabel,
  roadmapBySlug,
  weeklyPracticeLabel,
} from "@coddle/shared";
import type { PublicUser } from "@/lib/auth";

export function OverviewSections({ user }: { user: PublicUser }) {
  const roadmap = user.startingRoadmapSlug
    ? roadmapBySlug(user.startingRoadmapSlug)
    : null;
  const level = user.experienceLevel ? levelById(user.experienceLevel) : null;
  const nextNode = roadmap?.nodes[0] ?? null;
  const progress = 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Your learning
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Pick up where you left off and keep your daily goal in sight.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Continue learning
              </p>
              <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
                {nextNode ? `Next: ${nextNode}` : "Start your first roadmap"}
              </h3>
            </div>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-brand">
              {progress}%
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {roadmap
              ? `${roadmap.name} - ${roadmap.summary}`
              : "Choose a path to unlock a clear next step every time you return."}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-subtle">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <Link
            href="/roadmaps"
            className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {roadmap ? "Resume roadmap" : "Browse roadmaps"}
          </Link>
        </article>

        <article className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Daily goal
          </p>
          <div className="mt-3 flex items-center gap-4">
            <ProgressRing value={0} label="0%" />
            <div className="min-w-0">
              <p className="font-display text-xl font-bold tracking-tight text-ink">
                {user.dailyGoalMinutes
                  ? formatMinutes(user.dailyGoalMinutes)
                  : "Not set"}
              </p>
              {user.dailyGoalMinutes ? (
                <p className="mt-1 text-sm text-ink-muted">
                  {practiceDaysLabel(user.practiceDays)} ·{" "}
                  {weeklyPracticeLabel(user.dailyGoalMinutes, user.practiceDays.length)}
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-muted">Set a goal from your profile.</p>
              )}
              {level ? (
                <p className="mt-2 text-xs font-semibold text-brand">{level.label}</p>
              ) : null}
            </div>
          </div>
          <Link
            href="/roadmaps"
            className="mt-4 inline-flex text-sm font-semibold text-brand transition hover:text-brand-deep"
          >
            Start today’s session →
          </Link>
        </article>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EmptyPanel
          title="Courses"
          body="Courses you start will appear here."
          href="/courses"
          cta="Browse courses"
        />
        <EmptyPanel
          title="Resources"
          body="Saved links and bookmarks land here."
          href="/resources"
          cta="Find resources"
        />
        <EmptyPanel
          title="Projects"
          body="Ship work from your path and showcase it."
          href="/projects"
          cta="See projects"
        />
        <EmptyPanel
          title="Credentials"
          body="Verifiable proof from assessments and builds."
          href="/credentials"
          cta="View credentials"
        />
      </div>

      <article className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Community
            </p>
            <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
              Recent activity
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              Questions, replies, and project shares from developers you follow will show up
              here once community is live.
            </p>
          </div>
          <Link
            href="/community"
            className="inline-flex rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle"
          >
            Open community
          </Link>
        </div>
      </article>
    </div>
  );
}

function EmptyPanel({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-dashed border-border bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">{title}</p>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{body}</p>
      <Link
        href={href}
        className="mt-4 inline-flex text-sm font-semibold text-brand transition hover:text-brand-deep"
      >
        {cta} →
      </Link>
    </article>
  );
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  const radius = 28;
  const stroke = 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90" aria-hidden>
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-semibold text-ink">
        {label}
      </span>
    </div>
  );
}
