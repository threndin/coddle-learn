"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ASSESSMENT_PASS_POINTS, COURSE_COMPLETE_POINTS } from "@coddle/shared";
import { useAppUserActions } from "@/components/app/app-user-context";
import { useToast } from "@/components/app/toast";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import {
  startAssessmentAttempt,
  submitAssessmentAttempt,
  type AssessmentAttemptDetail,
  type AssessmentMeta,
  type AssessmentQuestion,
} from "@/lib/assessments";

function isAnswered(value: string | undefined) {
  return Boolean(value?.trim());
}

export function AssessmentAttemptView({
  assessmentId,
  initialAssessment,
  initialAttempt,
}: {
  assessmentId: string;
  initialAssessment: AssessmentMeta | null;
  initialAttempt: AssessmentAttemptDetail | null;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const { refreshUser } = useAppUserActions();
  const reduceMotion = useReducedMotion();
  const tileRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [assessment] = useState(initialAssessment);
  const [attempt, setAttempt] = useState(initialAttempt);
  const submitted = attempt?.status === "submitted";
  const questions = attempt?.questions ?? [];
  const overviewIndex = questions.length;

  const [index, setIndex] = useState(() =>
    initialAttempt?.status === "submitted" ? (initialAttempt.questions.length ?? 0) : 0,
  );
  const [direction, setDirection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (!initialAttempt || initialAttempt.status !== "in_progress") return {};
    const raw = initialAttempt.answers;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === "string") next[key] = value;
    }
    return next;
  });
  const [busy, setBusy] = useState(false);

  const showingOverview = Boolean(submitted && index >= overviewIndex);
  const current = showingOverview ? null : (questions[index] ?? null);
  const maxIndex = submitted ? overviewIndex : Math.max(questions.length - 1, 0);

  const answeredCount = useMemo(() => {
    if (!attempt) return 0;
    const source = submitted
      ? (attempt.answers as Record<string, string> | undefined) ?? {}
      : answers;
    return attempt.questions.filter((question) => isAnswered(source[question.id])).length;
  }, [answers, attempt, submitted]);

  const progress = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const resultStats = useMemo(() => {
    if (!attempt?.results) return { correct: 0, wrong: 0 };
    let correct = 0;
    let wrong = 0;
    for (const question of questions) {
      if (attempt.results[question.id]) correct += 1;
      else wrong += 1;
    }
    return { correct, wrong };
  }, [attempt, questions]);

  function goTo(nextIndex: number, dir: number) {
    if (nextIndex === index || nextIndex < 0 || nextIndex > maxIndex) return;
    setDirection(dir);
    setIndex(nextIndex);
  }

  useEffect(() => {
    tileRefs.current.get(index)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [index, reduceMotion]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (busy || !attempt) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        if (index < maxIndex) {
          setDirection(1);
          setIndex(index + 1);
        }
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        if (index > 0) {
          setDirection(-1);
          setIndex(index - 1);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attempt, busy, index, maxIndex]);

  if (!assessment || !attempt) {
    return (
      <div className="w-full px-4 py-12 sm:px-8">
        <p className="text-sm text-rose-600">That attempt could not be found.</p>
        <Link href="/assessments" className="mt-4 inline-block text-sm font-semibold text-brand">
          ← All assessments
        </Link>
      </div>
    );
  }

  async function handleSubmit() {
    if (!assessment || !attempt) return;
    setBusy(true);
    try {
      const data = await submitAssessmentAttempt(assessment.id, attempt.id, answers);
      setAttempt(data.attempt);
      setDirection(1);
      setIndex(data.attempt.questions.length);
      await refreshUser();
      const bits: string[] = [];
      if (data.pointsAwarded) bits.push(`+${data.pointsAwarded} pts`);
      if (data.courseCompleteBonus) {
        bits.push(`course complete +${COURSE_COMPLETE_POINTS}`);
      }
      pushToast(
        [
          data.attempt.passed
            ? `Passed with ${data.attempt.score}%`
            : `Scored ${data.attempt.score}% — keep studying`,
          ...bits,
        ].join(" · "),
        data.attempt.passed ? "success" : "error",
      );
    } catch (err) {
      pushToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleRetry() {
    setBusy(true);
    try {
      const data = await startAssessmentAttempt(assessmentId);
      router.replace(`/assessments/${assessmentId}/attempts/${data.attempt.id}`);
    } catch (err) {
      pushToast(errorMessage(err), "error");
      setBusy(false);
    }
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  const value =
    current && submitted
      ? String((attempt.answers as Record<string, string> | undefined)?.[current.id] ?? "")
      : current
        ? answers[current.id] ?? ""
        : "";
  const correct = current ? attempt.results?.[current.id] : undefined;
  const isLastQuestion = !submitted && index === questions.length - 1;
  const allAnswered = answeredCount >= questions.length;

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] w-full max-w-[100vw] flex-col overflow-x-hidden sm:min-h-[calc(100svh-4rem)]">
      <div className="border-b border-border bg-surface/90 px-4 py-3 backdrop-blur sm:px-8 sm:py-4 lg:px-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`/assessments/${assessment.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand"
            >
              <Icon name="arrowLeft" className="h-3.5 w-3.5" />
              Overview
            </Link>
            <h1 className="mt-1 truncate font-display text-lg font-extrabold tracking-tight text-ink sm:text-2xl">
              {assessment.title}
            </h1>
            <p className="mt-1 truncate text-xs text-ink-muted sm:text-sm">
              <span className="hidden sm:inline">{assessment.course.title} · </span>
              Pass {assessment.passPercent}%
              {assessment.timeLimitMinutes ? ` · ${assessment.timeLimitMinutes} min` : ""}
            </p>
          </div>

          {submitted ? (
            <div
              className={[
                "shrink-0 rounded-xl px-3 py-2 text-right sm:rounded-2xl sm:px-4 sm:py-2.5",
                attempt.passed
                  ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100"
                  : "bg-rose-500/15 text-rose-900 dark:text-rose-100",
              ].join(" ")}
            >
              <p className="font-display text-xl font-extrabold tabular-nums sm:text-2xl">
                {attempt.score}%
              </p>
              <p className="text-[11px] font-semibold sm:text-xs">
                {attempt.passed ? "Passed" : "Not passed"}
              </p>
            </div>
          ) : (
            <div className="w-24 shrink-0 text-right sm:w-40">
              <p className="text-[11px] font-semibold text-ink-muted sm:text-xs">
                {answeredCount}/{questions.length}
                <span className="hidden sm:inline"> answered</span>
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-subtle sm:mt-2 sm:h-2">
                <motion.div
                  className="h-full rounded-full bg-brand"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: reduceMotion ? 0 : 0.25 }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="-mx-4 mt-3 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-0 sm:mt-4 sm:overflow-visible sm:px-0 sm:pb-0">
          <div className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap sm:gap-2">
            {questions.map((question, questionIndex) => {
              const answered = submitted
                ? isAnswered(
                    (attempt.answers as Record<string, string> | undefined)?.[question.id],
                  )
                : isAnswered(answers[question.id]);
              const result = attempt.results?.[question.id];
              const active = !showingOverview && questionIndex === index;
              return (
                <button
                  key={question.id}
                  type="button"
                  ref={(node) => {
                    if (node) tileRefs.current.set(questionIndex, node);
                    else tileRefs.current.delete(questionIndex);
                  }}
                  onClick={() => goTo(questionIndex, questionIndex > index ? 1 : -1)}
                  aria-label={`Question ${questionIndex + 1}${answered ? ", answered" : ""}`}
                  aria-current={active ? "step" : undefined}
                  className={[
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold tabular-nums transition sm:h-10 sm:w-10 sm:rounded-xl sm:text-sm",
                    active
                      ? "scale-105 border-brand bg-brand text-white shadow-[0_10px_24px_-12px_var(--brand)]"
                      : submitted && result === true
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                        : submitted && result === false
                          ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                          : answered
                            ? "border-brand/40 bg-brand-soft text-brand"
                            : "border-border bg-surface text-ink-muted hover:border-brand/30 hover:text-ink",
                  ].join(" ")}
                >
                  {questionIndex + 1}
                  {answered && !active && !submitted ? (
                    <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-brand sm:h-2 sm:w-2" />
                  ) : null}
                </button>
              );
            })}
            {submitted ? (
              <button
                type="button"
                ref={(node) => {
                  if (node) tileRefs.current.set(overviewIndex, node);
                  else tileRefs.current.delete(overviewIndex);
                }}
                onClick={() => goTo(overviewIndex, 1)}
                aria-label="Results overview"
                aria-current={showingOverview ? "step" : undefined}
                className={[
                  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition sm:h-10 sm:w-10 sm:rounded-xl",
                  showingOverview
                    ? "scale-105 border-brand bg-brand text-white shadow-[0_10px_24px_-12px_var(--brand)]"
                    : "border-border bg-surface text-ink-muted hover:border-brand/30 hover:text-ink",
                ].join(" ")}
              >
                <Icon name="checkCircle" className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 py-4 sm:px-8 sm:py-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={showingOverview ? "overview" : current?.id ?? "empty"}
              custom={direction}
              variants={{
                enter: (dir: number) => ({
                  x: reduceMotion ? 0 : dir >= 0 ? 24 : -24,
                  opacity: 0,
                }),
                center: { x: 0, opacity: 1 },
                exit: (dir: number) => ({
                  x: reduceMotion ? 0 : dir >= 0 ? -24 : 24,
                  opacity: 0,
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
              className="flex flex-1 flex-col"
            >
              {showingOverview ? (
                <ResultsOverview
                  assessment={assessment}
                  attempt={attempt}
                  correctCount={resultStats.correct}
                  wrongCount={resultStats.wrong}
                  busy={busy}
                  onReviewQuestion={(questionIndex) => goTo(questionIndex, -1)}
                  onRetry={() => void handleRetry()}
                />
              ) : current ? (
                <QuestionCard
                  question={current}
                  index={index}
                  total={questions.length}
                  value={value}
                  submitted={Boolean(submitted)}
                  correct={correct}
                  busy={busy}
                  onChange={(next) => setAnswer(current.id, next)}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-border bg-surface/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-8 sm:py-4 lg:px-10">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:justify-between sm:gap-3">
          <button
            type="button"
            disabled={index === 0 || busy}
            onClick={() => goTo(index - 1, -1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:opacity-40 sm:px-4"
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <p className="text-center text-[11px] font-medium text-ink-muted sm:text-xs">
            {showingOverview
              ? "Results"
              : `${index + 1} / ${questions.length}`}
          </p>

          {showingOverview ? (
            <Link
              href={`/assessments/${assessment.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white sm:px-5"
            >
              <span className="sm:hidden">Done</span>
              <span className="hidden sm:inline">Back to assessment</span>
            </Link>
          ) : isLastQuestion ? (
            <button
              type="button"
              disabled={busy || !allAnswered}
              onClick={() => void handleSubmit()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:px-5"
            >
              {busy ? (
                "Submitting…"
              ) : (
                <>
                  <span className="sm:hidden">Submit</span>
                  <span className="hidden sm:inline">Submit assessment</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={index >= maxIndex || busy}
              onClick={() => goTo(index + 1, 1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40 sm:px-5"
            >
              {submitted && index === questions.length - 1 ? (
                <>
                  <span className="sm:hidden">Results</span>
                  <span className="hidden sm:inline">View results</span>
                </>
              ) : (
                <span className="hidden sm:inline">Next</span>
              )}
              <Icon name="chevronRight" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultsOverview({
  assessment,
  attempt,
  correctCount,
  wrongCount,
  busy,
  onReviewQuestion,
  onRetry,
}: {
  assessment: AssessmentMeta;
  attempt: AssessmentAttemptDetail;
  correctCount: number;
  wrongCount: number;
  busy: boolean;
  onReviewQuestion: (index: number) => void;
  onRetry: () => void;
}) {
  const passed = Boolean(attempt.passed);

  return (
    <article className="flex flex-1 flex-col rounded-2xl border border-border bg-surface p-4 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.35)] sm:p-6">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-brand sm:text-[11px]">
        Results overview
      </p>

      <div
        className={[
          "mt-4 rounded-2xl border px-4 py-5 text-center sm:px-6 sm:py-6",
          passed
            ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-50"
            : "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-50",
        ].join(" ")}
      >
        <p className="font-display text-4xl font-extrabold tabular-nums sm:text-5xl">
          {attempt.score}%
        </p>
        <p className="mt-2 text-base font-semibold sm:text-lg">
          {passed ? "You passed" : "Not passed yet"}
        </p>
        <p className="mt-1 text-sm opacity-80">
          {passed
            ? `Nice work — passing awards ${ASSESSMENT_PASS_POINTS} points.`
            : `You need ${assessment.passPercent}% to pass. Review and try again.`}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <OverviewStat label="Correct" value={String(correctCount)} />
        <OverviewStat label="Missed" value={String(wrongCount)} />
        <OverviewStat label="Questions" value={String(attempt.questions.length)} />
      </dl>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Question breakdown
        </p>
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {attempt.questions.map((question, questionIndex) => {
            const ok = attempt.results?.[question.id];
            return (
              <li key={question.id}>
                <button
                  type="button"
                  onClick={() => onReviewQuestion(questionIndex)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-surface-subtle sm:px-4"
                >
                  <span
                    className={[
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                      ok
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                    ].join(" ")}
                  >
                    {questionIndex + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {question.prompt}
                  </span>
                  <span
                    className={[
                      "shrink-0 text-xs font-semibold",
                      ok
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-rose-700 dark:text-rose-300",
                    ].join(" ")}
                  >
                    {ok ? "Correct" : "Missed"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={`/assessments/${assessment.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
        >
          Back to assessment
        </Link>
        <Link
          href={`/courses/${assessment.course.slug}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle"
        >
          Back to course
        </Link>
        {!passed ? (
          <button
            type="button"
            disabled={busy}
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:opacity-60"
          >
            Try again
          </button>
        ) : null}
        <Link
          href="/assessments"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-brand"
        >
          All assessments
        </Link>
      </div>
    </article>
  );
}

function OverviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-center">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-0.5 font-display text-xl font-extrabold tabular-nums text-ink">
        {value}
      </dd>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  total,
  value,
  submitted,
  correct,
  busy,
  onChange,
}: {
  question: AssessmentQuestion;
  index: number;
  total: number;
  value: string;
  submitted: boolean;
  correct: boolean | undefined;
  busy: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <article className="flex flex-1 flex-col rounded-2xl border border-border bg-surface p-3.5 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-brand sm:text-[11px]">
          Question {index + 1}
          <span className="text-ink-muted"> / {total}</span>
        </p>
        <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-semibold text-ink-muted sm:px-2.5 sm:py-1 sm:text-[11px]">
          {question.points} pt{question.points === 1 ? "" : "s"}
          <span className="hidden sm:inline">
            {" · "}
            {question.kind === "short_answer"
              ? "Short answer"
              : question.kind === "true_false"
                ? "True / false"
                : "Multiple choice"}
          </span>
        </span>
      </div>

      <h2 className="mt-3 font-display text-lg font-bold leading-snug tracking-tight text-ink sm:mt-3.5 sm:text-2xl">
        {question.prompt}
      </h2>

      {question.kind === "short_answer" ? (
        <div className="mt-4 sm:mt-5">
          {submitted ? (
            <p className="rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-sm text-ink">
              Your answer: <span className="font-semibold">{value || "—"}</span>
            </p>
          ) : (
            <input
              autoFocus
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Type a short answer"
              className="w-full rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface sm:px-3.5 sm:py-3"
            />
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:mt-5 sm:gap-2.5">
          {question.options.map((option, optionIndex) => {
            const selected = value === option.id;
            const isCorrect = submitted && question.correctOptionId === option.id;
            const isWrong = submitted && selected && !correct;
            const letter = String.fromCharCode(65 + optionIndex);
            return (
              <button
                key={option.id}
                type="button"
                disabled={submitted || busy}
                onClick={() => onChange(option.id)}
                className={[
                  "group flex w-full min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition sm:gap-3 sm:px-3.5",
                  isCorrect
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                    : isWrong
                      ? "border-rose-300 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10"
                      : selected
                        ? "border-brand bg-brand-soft shadow-[0_12px_28px_-18px_var(--brand)]"
                        : "border-border hover:border-brand/35 hover:bg-surface-subtle",
                  submitted ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition sm:h-8 sm:w-8",
                    selected || isCorrect
                      ? "border-transparent bg-brand text-white"
                      : "border-border bg-surface text-ink-muted group-hover:border-brand/40 group-hover:text-ink",
                    isWrong ? "bg-rose-500 text-white" : "",
                    isCorrect ? "bg-emerald-600 text-white" : "",
                  ].join(" ")}
                >
                  {letter}
                </span>
                <span className="min-w-0 break-words text-sm font-medium text-ink sm:text-[15px]">
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {submitted && question.explanation ? (
        <p className="mt-4 flex gap-2 rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-xs text-ink-muted sm:mt-5 sm:text-sm">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <span className="min-w-0 break-words">{question.explanation}</span>
        </p>
      ) : null}
      {submitted && question.kind === "short_answer" && question.acceptedAnswers ? (
        <p className="mt-2 break-words text-xs text-ink-muted sm:mt-3">
          Accepted: {question.acceptedAnswers.join(", ")}
        </p>
      ) : null}
    </article>
  );
}
