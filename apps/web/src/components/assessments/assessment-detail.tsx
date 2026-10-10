"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { levelById } from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import { startAssessmentAttempt, type AssessmentDetail } from "@/lib/assessments";

export function AssessmentDetailView({
  initialAssessment,
}: {
  initialAssessment: AssessmentDetail | null;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const reduceMotion = useReducedMotion();
  const [assessment] = useState(initialAssessment);
  const [busy, setBusy] = useState(false);
  const [error] = useState(initialAssessment ? null : "That assessment could not be found.");

  if (!assessment) {
    return (
      <div className="w-full px-4 py-12 sm:px-8">
        <p className="text-sm text-rose-600">{error}</p>
        <Link href="/assessments" className="mt-4 inline-block text-sm font-semibold text-brand">
          ← All assessments
        </Link>
      </div>
    );
  }

  async function handleStart() {
    if (!assessment) return;
    setBusy(true);
    try {
      const data = await startAssessmentAttempt(assessment.id);
      router.push(`/assessments/${assessment.id}/attempts/${data.attempt.id}`);
    } catch (err) {
      pushToast(errorMessage(err), "error");
      setBusy(false);
    }
  }

  const level = levelById(assessment.course.level)?.label ?? assessment.course.level;
  const cta =
    assessment.inProgressAttemptId
      ? {
          label: "Continue attempt",
          action: () =>
            router.push(
              `/assessments/${assessment.id}/attempts/${assessment.inProgressAttemptId}`,
            ),
        }
      : assessment.passed
        ? null
        : assessment.canStart
          ? { label: "Start assessment", action: () => void handleStart() }
          : null;

  return (
    <div className="w-full max-w-[100vw] overflow-x-hidden px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
      <Link
        href="/assessments"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        All assessments
      </Link>

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-surface sm:mt-5 sm:rounded-[1.75rem]"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${assessment.course.thumbnailUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/90 via-ink/80 to-ink/70 sm:bg-gradient-to-r sm:from-ink sm:via-ink/85 sm:to-ink/40" />
        <div className="relative grid gap-6 p-5 text-white sm:gap-8 sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(14rem,0.8fr)] lg:items-end lg:p-10">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65 sm:text-xs sm:tracking-[0.18em]">
              <span className="line-clamp-1">
                {assessment.course.title} · {level}
              </span>
            </p>
            <h1 className="mt-2 break-words font-display text-2xl font-extrabold tracking-tight sm:mt-3 sm:text-4xl lg:text-5xl">
              {assessment.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:mt-4 sm:text-lg">
              {assessment.summary}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {cta ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={cta.action}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
                >
                  {busy ? "Starting…" : cta.label}
                  <Icon name="chevronRight" className="h-4 w-4" />
                </button>
              ) : null}
              <Link
                href={`/courses/${assessment.course.slug}`}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15 sm:w-auto"
              >
                <Icon name="book" className="h-4 w-4" />
                Open course
              </Link>
            </div>

            {!assessment.enrolled ? (
              <p className="mt-4 text-sm text-white/70">
                Enroll in the course and finish its lessons and exercises before taking this
                assessment.
              </p>
            ) : !assessment.lessonsReady && !assessment.passed ? (
              <p className="mt-4 text-sm text-white/70">
                Finish every lesson and exercise in the course to unlock this assessment.
              </p>
            ) : assessment.passed ? (
              <p className="mt-4 text-sm font-medium text-emerald-300">
                You passed
                {assessment.bestScore != null
                  ? ` with a best score of ${assessment.bestScore}%`
                  : ""}
                .
              </p>
            ) : null}
          </div>

          <dl className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-1">
            <HeroStat label="Questions" value={String(assessment.questionCount)} />
            <HeroStat label="Pass mark" value={`${assessment.passPercent}%`} />
            <HeroStat
              label="Time limit"
              value={
                assessment.timeLimitMinutes ? `${assessment.timeLimitMinutes} min` : "None"
              }
            />
          </dl>
        </div>
      </motion.section>

      {assessment.attempts.length > 0 ? (
        <section className="mt-6 sm:mt-8">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-ink sm:text-xl">Attempt history</h2>
            <p className="text-xs text-ink-muted">{assessment.attempts.length} total</p>
          </div>
          <ul className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {assessment.attempts.map((attempt) => {
              const label =
                attempt.status === "in_progress"
                  ? "In progress"
                  : attempt.passed
                    ? "Passed"
                    : "Not passed";
              return (
                <li key={attempt.id}>
                  <Link
                    href={`/assessments/${assessment.id}/attempts/${attempt.id}`}
                    className="flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/40 hover:bg-brand-soft/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={[
                          "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                          attempt.status === "in_progress"
                            ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                            : attempt.passed
                              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                              : "bg-rose-500/15 text-rose-800 dark:text-rose-200",
                        ].join(" ")}
                      >
                        {label}
                      </span>
                      {attempt.score != null ? (
                        <span className="font-display text-lg font-extrabold tabular-nums text-ink">
                          {attempt.score}%
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs text-ink-muted">
                      {new Date(attempt.startedAt).toLocaleString()}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2.5 backdrop-blur sm:rounded-2xl sm:px-4 sm:py-3">
      <dt className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60 sm:text-[10px] sm:tracking-[0.14em]">
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-display text-base font-extrabold text-white sm:mt-1 sm:text-xl">
        {value}
      </dd>
    </div>
  );
}
