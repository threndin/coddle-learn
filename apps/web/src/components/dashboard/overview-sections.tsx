"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  formatMinutes,
  levelById,
  practiceDaysLabel,
  roadmapBySlug,
  weeklyPracticeLabel,
} from "@coddle/shared";
import type { PublicUser } from "@/lib/auth";
import {
  fetchContinueLearning,
  setPrimaryRoadmap,
  type ContinueLearning,
  type EnrolledRoadmapSummary,
} from "@/lib/roadmaps";
import { useToast } from "@/components/app/toast";

export function OverviewSections({ user }: { user: PublicUser }) {
  const { pushToast } = useToast();
  const starter = user.startingRoadmapSlug
    ? roadmapBySlug(user.startingRoadmapSlug)
    : null;
  const level = user.experienceLevel ? levelById(user.experienceLevel) : null;
  const [continueLearning, setContinueLearning] = useState<ContinueLearning | null>(
    null,
  );
  const [enrolled, setEnrolled] = useState<EnrolledRoadmapSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyPrimary, setBusyPrimary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const value = await fetchContinueLearning();
        if (!cancelled) {
          setContinueLearning(value.continue);
          setEnrolled(value.enrolled);
        }
      } catch {
        if (!cancelled) {
          setContinueLearning(null);
          setEnrolled([]);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = continueLearning;
  const fallback = starter;
  const progress = active?.progressPercent ?? 0;
  const nextTitle =
    active?.nextStep?.title ??
    (active?.completedAt ? "Review your path" : fallback?.steps[0]?.title ?? null);
  const title = nextTitle
    ? `Next: ${nextTitle}`
    : "Start your first roadmap";
  const description = active
    ? `${active.name} — ${active.summary}`
    : fallback
      ? `${fallback.name} — ${fallback.summary}`
      : "Choose a path to unlock a clear next step every time you return.";
  const href = active
    ? `/roadmaps/${active.slug}${active.nextStep ? `?step=${encodeURIComponent(active.nextStep.slug)}` : ""}`
    : fallback
      ? `/roadmaps/${fallback.slug}`
      : "/roadmaps";
  const cta = active
    ? active.completedAt
      ? "Review roadmap"
      : "Resume roadmap"
    : fallback
      ? "Open roadmap"
      : "Browse roadmaps";

  async function makePrimary(slug: string) {
    setBusyPrimary(slug);
    try {
      await setPrimaryRoadmap(slug);
      const value = await fetchContinueLearning();
      setContinueLearning(value.continue);
      setEnrolled(value.enrolled);
      pushToast("Primary path updated", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Could not update primary", "error");
    } finally {
      setBusyPrimary(null);
    }
  }

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
                {loaded ? title : "Loading your path…"}
              </h3>
            </div>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-brand">
              {progress}%
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-subtle">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <Link
            href={href}
            className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {cta}
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
            href={href}
            className="mt-4 inline-flex text-sm font-semibold text-brand transition hover:text-brand-deep"
          >
            Start today’s session →
          </Link>
        </article>
      </div>

      {enrolled.length > 1 ? (
        <article className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Your enrolled paths
          </p>
          <ul className="mt-4 space-y-3">
            {enrolled.map((item) => (
              <li
                key={item.slug}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {item.name}
                    {item.isPrimary ? (
                      <span className="ml-2 text-xs font-semibold text-brand">Primary</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {item.progressPercent}%
                    {item.nextStep ? ` · Next: ${item.nextStep.title}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!item.isPrimary ? (
                    <button
                      type="button"
                      disabled={busyPrimary === item.slug}
                      onClick={() => void makePrimary(item.slug)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
                    >
                      Make primary
                    </button>
                  ) : null}
                  <Link
                    href={`/roadmaps/${item.slug}`}
                    className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

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
