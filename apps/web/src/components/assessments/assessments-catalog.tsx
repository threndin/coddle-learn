"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { levelById } from "@coddle/shared";
import { Icon } from "@/components/ui/icon";
import type { AssessmentCatalogItem } from "@/lib/assessments";

type Scope = "all" | "ready" | "passed";

function primaryAction(item: AssessmentCatalogItem) {
  if (item.inProgressAttemptId) {
    return {
      label: "Continue",
      href: `/assessments/${item.id}/attempts/${item.inProgressAttemptId}`,
    };
  }
  if (item.passed) {
    return { label: "View results", href: `/assessments/${item.id}` };
  }
  if (item.canStart) {
    return { label: "Start", href: `/assessments/${item.id}` };
  }
  if (item.enrolled) {
    return { label: "Open course", href: `/courses/${item.course.slug}` };
  }
  return { label: "View course", href: `/courses/${item.course.slug}` };
}

export function AssessmentsCatalog({
  initialAssessments,
}: {
  initialAssessments: AssessmentCatalogItem[] | null;
}) {
  const [items] = useState(initialAssessments);
  const [scope, setScope] = useState<Scope>("all");
  const [query, setQuery] = useState("");
  const [error] = useState(initialAssessments ? null : "Could not load assessments");

  const filtered = useMemo(() => {
    if (!items) return [];
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (scope === "ready" && !item.canStart && !item.inProgressAttemptId) return false;
      if (scope === "passed" && !item.passed) return false;
      if (!needle) return true;
      const haystack = [item.title, item.summary, item.course.title].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [items, query, scope]);

  return (
    <div className="w-full max-w-[100vw] overflow-x-hidden px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="max-w-2xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Assessments
        </p>
        <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Prove what you learned
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
          Final checks for each course. Finish the lessons and exercises first, then take the
          assessment in one sitting.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative w-full flex-1 sm:min-w-56 sm:max-w-sm">
          <span className="sr-only">Search assessments</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by course or title"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </label>
        <div className="flex w-full rounded-xl border border-border bg-surface p-1 sm:w-auto">
          {(
            [
              ["all", "All"],
              ["ready", "Ready"],
              ["passed", "Passed"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setScope(id)}
              className={[
                "flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:flex-none",
                scope === id ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="mt-10 text-sm text-rose-600">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-sm text-ink-muted">
          No assessments match. Enroll in a course and finish its lessons to unlock one.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((item) => {
            const action = primaryAction(item);
            return (
              <li key={item.id} className="min-w-0">
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-brand/40 sm:rounded-3xl">
                  <Link
                    href={`/assessments/${item.id}`}
                    className="relative block h-32 overflow-hidden bg-surface-subtle sm:h-36"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.course.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <p className="truncate text-xs font-medium text-ink-muted">
                      {item.course.title}
                      {" · "}
                      {levelById(item.course.level)?.label ?? item.course.level}
                    </p>
                    <Link href={`/assessments/${item.id}`} className="min-w-0">
                      <h2 className="mt-2 line-clamp-2 font-display text-base font-bold tracking-tight text-ink transition group-hover:text-brand sm:text-lg">
                        {item.title}
                      </h2>
                    </Link>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                      {item.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <span>
                        {item.questionCount} questions · pass {item.passPercent}%
                      </span>
                      {item.passed ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          Passed{item.bestScore != null ? ` · ${item.bestScore}%` : ""}
                        </span>
                      ) : item.inProgressAttemptId ? (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                          In progress
                        </span>
                      ) : item.canStart ? (
                        <span className="rounded-md bg-brand-soft px-2 py-0.5 font-semibold text-brand">
                          Ready
                        </span>
                      ) : item.enrolled ? (
                        <span>Finish course content first</span>
                      ) : (
                        <span>Enroll to unlock</span>
                      )}
                    </div>

                    <div className="mt-auto flex gap-2 pt-4 sm:pt-5">
                      <Link
                        href={action.href}
                        className="inline-flex min-w-0 flex-1 items-center justify-center rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                      >
                        <span className="truncate">{action.label}</span>
                      </Link>
                      <Link
                        href={`/assessments/${item.id}`}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
