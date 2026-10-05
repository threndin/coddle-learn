"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ROADMAP_COMPLETE_POINTS,
  STEP_COMPLETE_POINTS,
  formatMinutes,
  levelById,
} from "@coddle/shared";
import { useAppUserActions } from "@/components/app/app-user-context";
import { useToast } from "@/components/app/toast";
import {
  setPrimaryRoadmap,
  startRoadmap,
  toggleBookmark,
  updateRoadmapProgress,
  type RoadmapDetail,
  type RoadmapStepDetail,
} from "@/lib/roadmaps";

export function RoadmapDetailView({
  slug,
  initialStepSlug,
  initialRoadmap,
}: {
  slug: string;
  initialStepSlug: string | null;
  initialRoadmap: RoadmapDetail | null;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { pushToast } = useToast();
  const { refreshUser } = useAppUserActions();
  const [roadmap, setRoadmap] = useState<RoadmapDetail | null>(initialRoadmap);
  const [error, setError] = useState<string | null>(
    initialRoadmap ? null : "That roadmap could not be found.",
  );
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initialStepSlug ??
      initialRoadmap?.nextStep?.slug ??
      initialRoadmap?.steps[0]?.slug ??
      null,
  );
  const [panelOpen, setPanelOpen] = useState(Boolean(initialStepSlug));

  const selected = useMemo(
    () => roadmap?.steps.find((step) => step.slug === selectedSlug) ?? null,
    [roadmap, selectedSlug],
  );

  const selectedIndex = useMemo(() => {
    if (!roadmap || !selectedSlug) return -1;
    return roadmap.steps.findIndex((step) => step.slug === selectedSlug);
  }, [roadmap, selectedSlug]);

  function selectStep(step: RoadmapStepDetail, openPanel = true) {
    setSelectedSlug(step.slug);
    if (openPanel) setPanelOpen(true);
    startTransition(() => {
      router.replace(`/roadmaps/${slug}?step=${encodeURIComponent(step.slug)}`, {
        scroll: false,
      });
    });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!roadmap) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        const next = roadmap.steps[Math.min(roadmap.steps.length - 1, selectedIndex + 1)];
        if (next) selectStep(next);
      }
      if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        const prev = roadmap.steps[Math.max(0, selectedIndex - 1)];
        if (prev) selectStep(prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap, selectedIndex, slug]);

  const applyDetail = useCallback(
    (detail: RoadmapDetail, toast?: string) => {
      setRoadmap(detail);
      setError(null);
      if (toast) pushToast(toast, "success");
      void refreshUser();
    },
    [pushToast, refreshUser],
  );

  async function handleStart() {
    setBusy(true);
    try {
      const detail = await startRoadmap(slug, { makePrimary: !roadmap?.isPrimary });
      const next = detail.nextStep?.slug ?? detail.steps[0]?.slug ?? null;
      applyDetail(detail, "Roadmap started");
      if (next) {
        setSelectedSlug(next);
        setPanelOpen(true);
        router.replace(`/roadmaps/${slug}?step=${encodeURIComponent(next)}`, {
          scroll: false,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start roadmap";
      setError(message);
      pushToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handlePrimary() {
    setBusy(true);
    try {
      const detail = await setPrimaryRoadmap(slug);
      applyDetail(detail, "Set as your primary path");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Could not update primary", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleProgress(status: "completed" | "skipped" | "incomplete") {
    if (!selected || !roadmap) return;
    const previous = roadmap;
    const stepSlug = selected.slug;

    const optimistic = optimisticProgress(roadmap, stepSlug, status);
    if (optimistic) {
      setRoadmap(optimistic);
      if (status === "completed" || status === "skipped") {
        const next =
          optimistic.nextStep?.slug ??
          optimistic.steps.find((step) => step.status === "current")?.slug ??
          stepSlug;
        setSelectedSlug(next);
      }
    }

    setBusy(true);
    try {
      const detail = await updateRoadmapProgress(slug, stepSlug, status);
      const toast =
        status === "completed"
          ? `Step complete · +${STEP_COMPLETE_POINTS} pts`
          : status === "skipped"
            ? "Step skipped"
            : "Step reopened";
      applyDetail(
        detail,
        detail.completedAt && status === "completed"
          ? `Roadmap complete · +${STEP_COMPLETE_POINTS + ROADMAP_COMPLETE_POINTS} pts`
          : toast,
      );
      if (status === "completed" || status === "skipped") {
        const next = detail.nextStep?.slug ?? stepSlug;
        setSelectedSlug(next);
        router.replace(`/roadmaps/${slug}?step=${encodeURIComponent(next)}`, {
          scroll: false,
        });
      }
    } catch (err) {
      setRoadmap(previous);
      const message = err instanceof Error ? err.message : "Could not update progress";
      setError(message);
      pushToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleBookmark(resource: {
    title: string;
    url: string;
    bookmarked?: boolean;
  }) {
    if (!selected) return;
    const previous = roadmap;
    if (roadmap) {
      setRoadmap({
        ...roadmap,
        steps: roadmap.steps.map((step) =>
          step.slug !== selected.slug
            ? step
            : {
                ...step,
                resources: step.resources.map((item) =>
                  item.url === resource.url
                    ? { ...item, bookmarked: !resource.bookmarked }
                    : item,
                ),
              },
        ),
      });
    }
    try {
      const detail = await toggleBookmark(slug, {
        stepSlug: selected.slug,
        url: resource.url,
        title: resource.title,
        remove: Boolean(resource.bookmarked),
      });
      setRoadmap(detail);
      pushToast(
        resource.bookmarked ? "Bookmark removed" : "Resource saved",
        "success",
      );
    } catch (err) {
      if (previous) setRoadmap(previous);
      pushToast(err instanceof Error ? err.message : "Could not save resource", "error");
    }
  }

  if (error && !roadmap) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Roadmaps
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink">
          Roadmap unavailable
        </h1>
        <p className="mt-3 text-ink-muted">{error}</p>
        <Link
          href="/roadmaps"
          className="mt-8 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to catalog
        </Link>
      </div>
    );
  }

  if (!roadmap) return null;

  const level = levelById(String(roadmap.level));
  const actionable =
    selected &&
    roadmap.enrolled &&
    (selected.status === "current" ||
      selected.status === "completed" ||
      selected.status === "skipped" ||
      selected.status === "optional");

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-6 rounded-2xl bg-brand px-5 py-6 text-white sm:px-7 sm:py-7">
        <div className="max-w-2xl">
          <Link
            href="/roadmaps"
            className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-white/70 transition hover:text-white"
          >
            ← All roadmaps
          </Link>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {roadmap.name}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-white/80">{roadmap.summary}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/70">
            <span>{level?.label ?? roadmap.level}</span>
            <span aria-hidden>·</span>
            <span>About {roadmap.weeks} weeks</span>
            <span aria-hidden>·</span>
            <span>{roadmap.steps.length} steps</span>
          </div>
        </div>

        <div className="w-full shrink-0 sm:w-56">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-white/70">Progress</p>
            <p className="font-mono text-sm font-semibold tabular-nums">
              {roadmap.progressPercent}%
            </p>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/25">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={false}
              animate={{ width: `${roadmap.progressPercent}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.3 }}
            />
          </div>

          {!roadmap.enrolled ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleStart()}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand transition hover:bg-white/95 disabled:opacity-60"
            >
              Start roadmap
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              {roadmap.completedAt ? (
                <p className="text-sm">Complete</p>
              ) : roadmap.nextStep ? (
                <p className="text-sm text-white/70">
                  Next: <span className="text-white">{roadmap.nextStep.title}</span>
                </p>
              ) : null}
              {roadmap.isPrimary ? (
                <p className="text-xs text-white/60">Primary roadmap</p>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handlePrimary()}
                  className="text-sm font-medium text-white/90 underline-offset-2 hover:underline disabled:opacity-60"
                >
                  Set as primary
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {error ? (
        <p className="mt-4 rounded-xl border border-border bg-surface-subtle px-4 py-3 text-sm text-ink-muted">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ol className="relative space-y-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          {roadmap.steps.map((step, index) => {
            const isSelected = selected?.slug === step.slug;
            const isLast = index === roadmap.steps.length - 1;
            const prevBranch = roadmap.steps[index - 1]?.branchKey;
            const showBranchNote =
              step.branchKey &&
              (!prevBranch || prevBranch !== step.branchKey);
            return (
              <li key={step.slug} className="relative flex gap-4 pb-8 last:pb-0">
                {!isLast ? (
                  <span
                    className="absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px bg-border"
                    aria-hidden
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => selectStep(step)}
                  className={[
                    "relative z-10 flex w-full items-start gap-4 rounded-xl text-left transition hover:bg-surface-subtle/80",
                    isSelected ? "bg-surface-subtle/90 ring-1 ring-brand/20" : "",
                  ].join(" ")}
                >
                  <StepMarker status={step.status} active={isSelected} index={index} />
                  <div className="min-w-0 flex-1 py-1 pr-2">
                    {showBranchNote ? (
                      <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">
                        Choose one path
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={[
                          "font-display text-lg font-bold tracking-tight",
                          step.status === "locked" ? "text-ink-muted" : "text-ink",
                        ].join(" ")}
                      >
                        {step.title}
                      </p>
                      <StatusPill status={step.status} />
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted line-clamp-2">
                      {step.summary}
                    </p>
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                      {formatMinutes(step.estimatedMinutes)}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>

        <aside className="hidden lg:block">
          <StepPanel
            step={selected}
            enrolled={roadmap.enrolled}
            actionable={Boolean(actionable)}
            busy={busy}
            onStart={() => void handleStart()}
            onComplete={() => void handleProgress("completed")}
            onSkip={() => void handleProgress("skipped")}
            onReopen={() => void handleProgress("incomplete")}
            onBookmark={(resource) => void handleBookmark(resource)}
          />
        </aside>
      </div>

      {panelOpen && selected ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close step panel"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setPanelOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Step
              </p>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-medium text-ink-muted"
              >
                Close
              </button>
            </div>
            <StepPanel
              step={selected}
              enrolled={roadmap.enrolled}
              actionable={Boolean(actionable)}
              busy={busy}
              onStart={() => void handleStart()}
              onComplete={() => void handleProgress("completed")}
              onSkip={() => void handleProgress("skipped")}
              onReopen={() => void handleProgress("incomplete")}
              onBookmark={(resource) => void handleBookmark(resource)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function optimisticProgress(
  roadmap: RoadmapDetail,
  stepSlug: string,
  status: "completed" | "skipped" | "incomplete",
): RoadmapDetail | null {
  const steps = roadmap.steps.map((step) => {
    if (step.slug !== stepSlug) return step;
    if (status === "incomplete") {
      return { ...step, status: "current" as const };
    }
    return { ...step, status };
  });
  const done = steps.filter(
    (step) => step.status === "completed" || step.status === "skipped",
  ).length;
  const next = steps.find((step) => step.status === "current" || step.status === "optional");
  return {
    ...roadmap,
    enrolled: true,
    steps,
    progressPercent: Math.round((done / Math.max(steps.length, 1)) * 100),
    nextStep: next ? { slug: next.slug, title: next.title } : null,
  };
}

function StepMarker({
  status,
  active,
  index,
}: {
  status: RoadmapStepDetail["status"];
  active: boolean;
  index: number;
}) {
  const number = String(index + 1).padStart(2, "0");
  const base =
    "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-mono text-[11px] font-bold tabular-nums";

  if (status === "completed") {
    return (
      <span className={`${base} border-brand bg-brand text-white`} aria-label={`Step ${number}, completed`}>
        ✓
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span
        className={`${base} border-border-strong bg-surface-subtle text-ink-muted`}
        aria-label={`Step ${number}, skipped`}
      >
        –
      </span>
    );
  }
  if (status === "optional") {
    return (
      <span
        className={`${base} border-brand/40 bg-brand-soft text-brand`}
        aria-label={`Step ${number}, optional`}
      >
        {number}
      </span>
    );
  }
  if (status === "current") {
    return (
      <span
        className={[
          base,
          "border-brand bg-brand-soft text-brand",
          active ? "pulse-node" : "",
        ].join(" ")}
        aria-label={`Step ${number}, current`}
      >
        {number}
      </span>
    );
  }
  return (
    <span
      className={`${base} border-border bg-surface text-ink-muted`}
      aria-label={`Step ${number}, locked`}
    >
      {number}
    </span>
  );
}

function StatusPill({ status }: { status: RoadmapStepDetail["status"] }) {
  const label =
    status === "completed"
      ? "Done"
      : status === "skipped"
        ? "Skipped"
        : status === "optional"
          ? "Optional"
          : status === "current"
            ? "Current"
            : "Locked";
  return (
    <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
      {label}
    </span>
  );
}

function StepPanel({
  step,
  enrolled,
  actionable,
  busy,
  onStart,
  onComplete,
  onSkip,
  onReopen,
  onBookmark,
}: {
  step: RoadmapStepDetail | null;
  enrolled: boolean;
  actionable: boolean;
  busy: boolean;
  onStart: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onReopen: () => void;
  onBookmark: (resource: {
    title: string;
    url: string;
    bookmarked?: boolean;
  }) => void;
}) {
  if (!step) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-ink-muted">Select a step to see details.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-20">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
        Step detail
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
        {step.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.summary}</p>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
        About {formatMinutes(step.estimatedMinutes)}
      </p>

      {step.learnings.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            What you’ll learn
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink">
            {step.learnings.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-brand" aria-hidden>
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {step.practice ? (
        <div className="mt-4 rounded-xl bg-brand-soft/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            Practice
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink">{step.practice}</p>
        </div>
      ) : null}

      {step.resources.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Resources
          </p>
          <ul className="mt-3 space-y-2">
            {step.resources.map((resource) => (
              <li
                key={resource.url}
                className="rounded-xl border border-border px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 text-sm font-semibold text-ink transition hover:text-brand"
                  >
                    {resource.title}
                  </a>
                  <button
                    type="button"
                    onClick={() => onBookmark(resource)}
                    className={[
                      "shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
                      resource.bookmarked
                        ? "bg-brand text-white"
                        : "bg-surface-subtle text-ink-muted hover:text-brand",
                    ].join(" ")}
                  >
                    {resource.bookmarked ? "Saved" : "Save"}
                  </button>
                </div>
                <span className="mt-1 block font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                  {resource.type}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 space-y-2 border-t border-border pt-4">
        {!enrolled ? (
          <button
            type="button"
            disabled={busy}
            onClick={onStart}
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            Start to unlock steps
          </button>
        ) : step.status === "locked" ? (
          <p className="text-sm text-ink-muted">
            Complete earlier steps to unlock this one.
          </p>
        ) : actionable ? (
          <div className="flex flex-col gap-2">
            {step.status === "completed" || step.status === "skipped" ? (
              <button
                type="button"
                disabled={busy}
                onClick={onReopen}
                className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-border-strong disabled:opacity-60"
              >
                Mark incomplete
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onComplete}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  Mark complete · +{STEP_COMPLETE_POINTS} pts
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onSkip}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-border-strong disabled:opacity-60"
                >
                  Skip step
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
