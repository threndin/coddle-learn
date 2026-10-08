"use client";

import { useState } from "react";
import {
  EXERCISE_KIND_META,
  EXERCISE_LIMITS,
  formatMinutes,
  isExerciseDone,
  isHttpUrl,
  type ExerciseKind,
} from "@coddle/shared";
import { LessonMarkdown } from "@/components/courses/lesson-markdown";
import { Icon, type IconName } from "@/components/ui/icon";
import type {
  CourseExerciseDetail,
  ExerciseSubmissionInput,
  ExerciseSubmitResult,
} from "@/lib/courses";

export type ExerciseAccess = "active" | "locked" | "not-enrolled" | "preview";

export const EXERCISE_KIND_ICONS: Record<ExerciseKind, IconName> = {
  task: "listTask",
  link: "link",
  text: "pencil",
  quiz: "question",
};

const SUBMIT_LABELS: Record<ExerciseKind, string> = {
  task: "Mark complete",
  link: "Submit link",
  text: "Submit answer",
  quiz: "Check answers",
};

const BLOCKED_MESSAGES: Record<Exclude<ExerciseAccess, "active">, string> = {
  locked: "Finish the earlier lessons to unlock this exercise.",
  "not-enrolled": "Start the course to submit exercises.",
  preview: "Exercises can be submitted once the course is published.",
};

export function LessonExercises({
  exercises,
  access,
  onSubmit,
  onReset,
}: {
  exercises: CourseExerciseDetail[];
  access: ExerciseAccess;
  onSubmit: (
    exercise: CourseExerciseDetail,
    input: ExerciseSubmissionInput,
  ) => Promise<ExerciseSubmitResult | null>;
  onReset: (exercise: CourseExerciseDetail) => Promise<boolean>;
}) {
  if (exercises.length === 0) return null;
  const done = exercises.filter((exercise) => isExerciseDone(exercise.submission?.status)).length;

  return (
    <section className="mt-8 border-t border-border pt-6" aria-labelledby="lesson-exercises">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3
          id="lesson-exercises"
          className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-ink"
        >
          <Icon name="target" className="h-5 w-5 text-brand" />
          {exercises.length === 1 ? "Exercise" : "Exercises"}
        </h3>
        {access === "active" ? (
          <p className="font-mono text-xs tabular-nums text-ink-muted">
            {done}/{exercises.length} done · needed to complete the course
          </p>
        ) : null}
      </div>
      <div className="mt-4 space-y-4">
        {exercises.map((exercise, index) => (
          <ExerciseCard
            key={`${exercise.id}:${exercise.submission?.updatedAt ?? "new"}`}
            exercise={exercise}
            index={index}
            access={access}
            onSubmit={onSubmit}
            onReset={onReset}
          />
        ))}
      </div>
    </section>
  );
}

function ExerciseCard({
  exercise,
  index,
  access,
  onSubmit,
  onReset,
}: {
  exercise: CourseExerciseDetail;
  index: number;
  access: ExerciseAccess;
  onSubmit: (
    exercise: CourseExerciseDetail,
    input: ExerciseSubmissionInput,
  ) => Promise<ExerciseSubmitResult | null>;
  onReset: (exercise: CourseExerciseDetail) => Promise<boolean>;
}) {
  const submission = exercise.submission;
  const response = submission?.response ?? {};
  const done = isExerciseDone(submission?.status);
  const kind = exercise.kind;
  const meta = EXERCISE_KIND_META[kind];

  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(done ? exercise.requirements.map((_, i) => i) : (response.checked ?? [])),
  );
  const [url, setUrl] = useState(response.url ?? "");
  const [note, setNote] = useState(response.note ?? "");
  const [answer, setAnswer] = useState(response.answer ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>(response.answers ?? {});
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);

  const canAct = access === "active";
  const showForm = !done || editing;
  const inputsDisabled = !canAct || pending || !showForm;

  const allChecked = exercise.requirements.every((_, i) => checked.has(i));
  const questions = exercise.quiz?.questions ?? [];
  const ready =
    kind === "quiz"
      ? questions.length > 0 && questions.every((question) => answers[question.id])
      : allChecked &&
        (kind === "link"
          ? isHttpUrl(url.trim())
          : kind === "text"
            ? answer.trim().length >= EXERCISE_LIMITS.answerMin
            : true);

  async function submit() {
    if (!ready || pending) return;
    setPending(true);
    const input: ExerciseSubmissionInput = { checked: [...checked] };
    if (kind === "link") Object.assign(input, { url: url.trim(), note: note.trim() });
    if (kind === "text") input.answer = answer.trim();
    if (kind === "quiz") input.answers = answers;
    const result = await onSubmit(exercise, input);
    // On success the card remounts with the saved submission.
    if (!result) setPending(false);
  }

  async function reset() {
    setPending(true);
    const ok = await onReset(exercise);
    if (!ok) setPending(false);
  }

  return (
    <article
      className={[
        "rounded-2xl border p-5 transition",
        done
          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5"
          : "border-border bg-surface-subtle/50",
      ].join(" ")}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand/20 dark:text-blue-200">
            <Icon name={EXERCISE_KIND_ICONS[kind]} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Exercise {index + 1} · {meta.label} · {formatMinutes(exercise.estimatedMinutes)}
            </p>
            <h4 className="mt-0.5 text-base font-bold text-ink">{exercise.title}</h4>
          </div>
        </div>
        <StatusChip exercise={exercise} />
      </header>

      {exercise.instructions.trim() ? (
        <div className="mt-4">
          <LessonMarkdown content={exercise.instructions} />
        </div>
      ) : null}

      {kind === "quiz" ? (
        <QuizQuestions
          exercise={exercise}
          answers={answers}
          disabled={inputsDisabled}
          onAnswer={(questionId, optionId) =>
            setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
          }
        />
      ) : null}

      {exercise.requirements.length > 0 ? (
        <fieldset className="mt-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Requirements
          </legend>
          <ul className="mt-2 space-y-1.5">
            {exercise.requirements.map((requirement, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink has-[:disabled]:cursor-default">
                  <input
                    type="checkbox"
                    checked={checked.has(i)}
                    disabled={inputsDisabled}
                    onChange={(event) =>
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (event.target.checked) next.add(i);
                        else next.delete(i);
                        return next;
                      })
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
                  />
                  <span className={checked.has(i) ? "text-ink-muted line-through decoration-ink-muted/40" : ""}>
                    {requirement}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      {kind === "link" && showForm ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-ink">Link to your work</span>
            <input
              type="url"
              inputMode="url"
              value={url}
              disabled={inputsDisabled}
              maxLength={EXERCISE_LIMITS.urlMax}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://github.com/you/project"
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink">
              Note <span className="font-normal text-ink-muted">(optional)</span>
            </span>
            <textarea
              value={note}
              rows={2}
              disabled={inputsDisabled}
              maxLength={EXERCISE_LIMITS.noteMax}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What was tricky? What did you learn?"
              className="mt-1.5 w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:opacity-60"
            />
          </label>
        </div>
      ) : null}

      {kind === "link" && !showForm && response.url ? (
        <div className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <a
            href={response.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex max-w-full items-center gap-1.5 font-semibold text-brand hover:underline"
          >
            <Icon name="external" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{response.url}</span>
          </a>
          {response.note ? (
            <p className="mt-1.5 whitespace-pre-wrap text-ink-muted">{response.note}</p>
          ) : null}
        </div>
      ) : null}

      {kind === "text" && showForm ? (
        <label className="mt-4 block">
          <span className="text-xs font-semibold text-ink">Your answer</span>
          <textarea
            value={answer}
            rows={5}
            disabled={inputsDisabled}
            maxLength={EXERCISE_LIMITS.answerMax}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Write your answer in your own words…"
            className="mt-1.5 w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-ink placeholder:text-ink-muted/60 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:opacity-60"
          />
          {answer.trim().length < EXERCISE_LIMITS.answerMin && canAct ? (
            <span className="mt-1 block text-[11px] text-ink-muted">
              At least {EXERCISE_LIMITS.answerMin} characters ({answer.trim().length} so far)
            </span>
          ) : null}
        </label>
      ) : null}

      {kind === "text" && !showForm && response.answer ? (
        <p className="mt-4 whitespace-pre-wrap rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-ink">
          {response.answer}
        </p>
      ) : null}

      {exercise.hint.trim() && !done ? (
        <Reveal icon="lightbulb" label="Need a hint?">
          <LessonMarkdown content={exercise.hint} />
        </Reveal>
      ) : null}

      {done && exercise.solution?.trim() ? (
        <Reveal icon="eye" label="Reference solution">
          <LessonMarkdown content={exercise.solution} />
        </Reveal>
      ) : null}

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {access !== "active"
            ? BLOCKED_MESSAGES[access]
            : !done && exercise.hasSolution
              ? "A reference solution unlocks after you finish."
              : !done && kind === "quiz" && exercise.quiz
                ? `Score ${exercise.quiz.passPercent}% or more to pass. You can retry.`
                : null}
        </p>
        {canAct ? (
          <div className="flex flex-wrap items-center gap-2">
            {done && !editing ? (
              <>
                {kind === "link" || kind === "text" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setEditing(true)}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink disabled:opacity-60"
                  >
                    Edit submission
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void reset()}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink disabled:opacity-60"
                >
                  {kind === "quiz" ? "Retake quiz" : kind === "task" ? "Mark incomplete" : "Remove submission"}
                </button>
              </>
            ) : (
              <>
                {editing ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setEditing(false);
                      setUrl(response.url ?? "");
                      setNote(response.note ?? "");
                      setAnswer(response.answer ?? "");
                    }}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink disabled:opacity-60"
                  >
                    Cancel
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!ready || pending}
                  onClick={() => void submit()}
                  title={
                    ready
                      ? undefined
                      : kind === "quiz"
                        ? "Answer every question first"
                        : !allChecked
                          ? "Tick every requirement first"
                          : undefined
                  }
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {pending
                    ? "Saving…"
                    : editing
                      ? "Update submission"
                      : submission?.status === "attempted"
                        ? "Check again"
                        : SUBMIT_LABELS[kind]}
                </button>
              </>
            )}
          </div>
        ) : null}
      </footer>
    </article>
  );
}

function StatusChip({ exercise }: { exercise: CourseExerciseDetail }) {
  const submission = exercise.submission;
  if (!submission) return null;
  if (submission.status === "attempted") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
        Scored {submission.score ?? 0}% · try again
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
      <Icon name="check" className="h-3 w-3" strokeWidth={2.6} />
      {EXERCISE_KIND_META[exercise.kind].doneLabel}
      {exercise.kind === "quiz" && submission.score !== null ? ` · ${submission.score}%` : ""}
    </span>
  );
}

function QuizQuestions({
  exercise,
  answers,
  disabled,
  onAnswer,
}: {
  exercise: CourseExerciseDetail;
  answers: Record<string, string>;
  disabled: boolean;
  onAnswer: (questionId: string, optionId: string) => void;
}) {
  const submission = exercise.submission;
  const passed = submission?.status === "completed";
  const lastAnswers = submission?.response.answers ?? {};
  const lastResults = submission?.response.results ?? {};

  return (
    <ol className="mt-4 space-y-4">
      {(exercise.quiz?.questions ?? []).map((question, index) => {
        const picked = answers[question.id];
        const graded = picked !== undefined && lastAnswers[question.id] === picked;
        const wrong = graded && lastResults[question.id] === false;
        return (
          <li
            key={question.id}
            className={[
              "rounded-xl border bg-surface p-4",
              wrong && !passed ? "border-rose-300 dark:border-rose-500/40" : "border-border",
            ].join(" ")}
          >
            <p className="flex items-start gap-2 text-sm font-semibold text-ink">
              <span className="font-mono text-xs text-ink-muted">{index + 1}.</span>
              <span className="whitespace-pre-wrap">{question.prompt}</span>
            </p>
            <div className="mt-3 space-y-1.5" role="radiogroup" aria-label={question.prompt}>
              {question.options.map((option) => {
                const isPicked = picked === option.id;
                const isCorrect = passed && question.correctOptionId === option.id;
                return (
                  <label
                    key={option.id}
                    className={[
                      "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition has-[:disabled]:cursor-default",
                      isCorrect
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100"
                        : isPicked
                          ? "border-brand bg-brand-soft/50 text-ink dark:bg-brand/10"
                          : "border-transparent text-ink-muted hover:bg-surface-subtle",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name={`${exercise.id}:${question.id}`}
                      checked={isPicked}
                      disabled={disabled}
                      onChange={() => onAnswer(question.id, option.id)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
                    />
                    <span className="whitespace-pre-wrap">{option.text}</span>
                  </label>
                );
              })}
            </div>
            {wrong && !passed ? (
              <p className="mt-2 text-xs font-semibold text-rose-600">Not quite. Try another answer.</p>
            ) : null}
            {passed && question.explanation?.trim() ? (
              <p className="mt-3 rounded-lg bg-surface-subtle px-3 py-2 text-xs leading-relaxed text-ink-muted">
                <span className="font-semibold text-ink">Why: </span>
                {question.explanation}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Reveal({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group mt-4 rounded-xl border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <Icon name={icon} className="h-4 w-4 text-brand" />
        {label}
        <Icon
          name="chevronRight"
          className="ml-auto h-4 w-4 text-ink-muted transition-transform group-open:rotate-90"
        />
      </summary>
      <div className="border-t border-border px-4 py-3">{children}</div>
    </details>
  );
}
