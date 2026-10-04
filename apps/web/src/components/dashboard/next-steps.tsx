"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { roadmapBySlug } from "@coddle/shared";
import type { PublicUser } from "@/lib/auth";
import { NavIcon, type NavIconId } from "@/components/app/nav-config";

type Step = {
  id: string;
  label: string;
  why: string;
  href: string;
  cta: string;
  icon: NavIconId;
};

function stepsForUser(user: PublicUser): Step[] {
  const roadmap = user.startingRoadmapSlug
    ? roadmapBySlug(user.startingRoadmapSlug)
    : null;
  const skillHint =
    user.skills[0]?.name ??
    (user.skills.length > 0 ? "your skills" : "your path");

  return [
    {
      id: "open-roadmap",
      label: roadmap ? `Open ${roadmap.name}` : "Open your roadmap",
      why: roadmap
        ? `Start with ${roadmap.nodes[0] ?? "the first node"} and work through the path.`
        : "Pick a structured path so you always know what to learn next.",
      href: "/roadmaps",
      cta: "View roadmaps",
      icon: "roadmaps",
    },
    {
      id: "review-goal",
      label: "Review your practice schedule",
      why: user.dailyGoalMinutes
        ? `You aimed for ${user.dailyGoalMinutes} minutes on your practice days.`
        : "Confirm the days and minutes you can stick with.",
      href: "/settings",
      cta: "Open settings",
      icon: "settings",
    },
    {
      id: "explore-courses",
      label: `Explore courses for ${skillHint}`,
      why: "Courses turn roadmap nodes into guided lessons and practice.",
      href: "/courses",
      cta: "Browse courses",
      icon: "courses",
    },
    {
      id: "bookmark-resource",
      label: "Bookmark a resource",
      why: "Save docs, videos, and articles you will reuse while learning.",
      href: "/resources",
      cta: "Find resources",
      icon: "resources",
    },
    {
      id: "join-community",
      label: "Join the community",
      why: "Ask questions, share progress, and learn with other developers.",
      href: "/community",
      cta: "Visit community",
      icon: "community",
    },
  ];
}

function storageKey(userId: string) {
  return `learn_next_steps_${userId}`;
}

export function NextStepsGuide({ user }: { user: PublicUser }) {
  const steps = stepsForUser(user);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(user.id));
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setDone(parsed);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [user.id]);

  function toggle(id: string) {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey(user.id), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const completedCount = steps.filter((step) => done[step.id]).length;

  return (
    <section
      aria-labelledby="next-steps-heading"
      className="w-full rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="next-steps-heading"
            className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl"
          >
            Your next steps
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            A short guide based on the plan you set up.
          </p>
        </div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          {ready ? `${completedCount} of ${steps.length} done` : "…"}
        </p>
      </div>

      <ol className="mt-6 grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((step, index) => {
          const isDone = Boolean(done[step.id]);
          return (
            <li
              key={step.id}
              className={[
                "flex h-full flex-col rounded-xl border p-4 transition",
                isDone
                  ? "border-border bg-surface-subtle opacity-80"
                  : "border-border bg-surface hover:border-border-strong",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={[
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                    isDone ? "bg-brand text-white" : "bg-brand-soft text-brand",
                  ].join(" ")}
                >
                  <NavIcon id={step.icon} className="h-5 w-5" />
                </span>
                <button
                  type="button"
                  onClick={() => toggle(step.id)}
                  aria-pressed={isDone}
                  aria-label={
                    isDone
                      ? `Mark “${step.label}” incomplete`
                      : `Mark “${step.label}” complete`
                  }
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition",
                    isDone
                      ? "border-brand bg-brand text-white"
                      : "border-border-strong bg-surface text-transparent hover:border-brand",
                  ].join(" ")}
                >
                  <CheckIcon />
                </button>
              </div>

              <div className="mt-3 flex min-h-0 flex-1 flex-col">
                <span className="font-mono text-[11px] font-semibold text-ink-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p
                  className={[
                    "mt-1 text-sm font-semibold leading-snug text-ink",
                    isDone ? "line-through decoration-ink-muted/60" : "",
                  ].join(" ")}
                >
                  {step.label}
                </p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                  {step.why}
                </p>
                {!isDone ? (
                  <Link
                    href={step.href}
                    className="mt-3 inline-flex text-sm font-semibold text-brand transition hover:text-brand-deep"
                  >
                    {step.cta} →
                  </Link>
                ) : (
                  <p className="mt-3 text-sm font-medium text-ink-muted">Done</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.2 6.4 11l6.1-6.5" />
    </svg>
  );
}
