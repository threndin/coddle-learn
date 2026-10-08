"use client";

import { useState } from "react";
import {
  EXERCISE_KINDS,
  EXERCISE_KIND_META,
  EXERCISE_LIMITS,
  exerciseIssues,
  formatMinutes,
  type ExerciseKind,
  type QuizQuestion,
} from "@coddle/shared";
import { EXERCISE_KIND_ICONS } from "@/components/courses/lesson-exercises";
import { Icon } from "@/components/ui/icon";
import type { ExercisePatch, StudioExercise } from "@/lib/studio";
import { MarkdownEditor } from "./markdown-editor";

const INSTRUCTION_TEMPLATES: Record<Exclude<ExerciseKind, "quiz">, string> = {
  task: `Build a small thing that uses what this lesson taught.

1. First step
2. Second step
3. Check your result in the browser
`,
  link: `Build it, push it to GitHub (or deploy it), and submit the link.

**What to build**

- Describe the finished result
- Point out anything learners often miss
`,
  text: `In a short paragraph, explain the idea from this lesson in your own words.

Cover:

- What it is
- When you would use it
- One mistake to avoid
`,
};

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:opacity-70";

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function blankQuestion(): QuizQuestion {
  return {
    id: newId(),
    prompt: "",
    options: [
      { id: newId(), text: "" },
      { id: newId(), text: "" },
    ],
    correctOptionId: null,
    explanation: "",
  };
}

export function LessonExercisesEditor({
  exercises,
  readOnly,
  busy,
  focusExerciseId,
  onAdd,
  onPatch,
  onDelete,
  onMove,
  onUploadImage,
  onError,
}: {
  exercises: StudioExercise[];
  readOnly: boolean;
  busy: boolean;
  focusExerciseId: string | null;
  onAdd: (kind: ExerciseKind) => void;
  onPatch: (exerciseId: string, patch: ExercisePatch) => void;
  onDelete: (exerciseId: string) => void;
  onMove: (exerciseId: string, direction: -1 | 1) => void;
  onUploadImage?: (file: File) => Promise<string>;
  onError: (message: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const atLimit = exercises.length >= EXERCISE_LIMITS.perLessonMax;

  return (
    <section className="mt-6 shrink-0" aria-labelledby="studio-exercises">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="studio-exercises"
            className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-ink"
          >
            <Icon name="target" className="h-5 w-5 text-brand" />
            Exercises
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Shown under the lesson. Learners must finish every exercise to complete the course,
            and each module needs at least one.
          </p>
        </div>
      </div>

      {exercises.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {exercises.map((exercise, index) => (
            <ExerciseItem
              key={exercise.id}
              exercise={exercise}
              index={index}
              total={exercises.length}
              readOnly={readOnly}
              busy={busy}
              defaultOpen={focusExerciseId === exercise.id}
              onPatch={(patch) => onPatch(exercise.id, patch)}
              onDelete={() => onDelete(exercise.id)}
              onMove={(direction) => onMove(exercise.id, direction)}
              onUploadImage={onUploadImage}
              onError={onError}
            />
          ))}
        </ol>
      ) : null}

      {!readOnly ? (
        picking ? (
          <div className="mt-3 rounded-2xl border border-brand/40 bg-surface p-3 ring-4 ring-brand/5">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-xs font-semibold text-ink">Choose an exercise type</p>
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => setPicking(false)}
                className="rounded p-1 text-ink-muted hover:text-ink"
              >
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {EXERCISE_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPicking(false);
                    onAdd(kind);
                  }}
                  className="flex items-start gap-3 rounded-xl border border-border px-3 py-2.5 text-left transition hover:border-brand hover:bg-brand-soft/30 disabled:opacity-60"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-brand/20 dark:text-blue-200">
                    <Icon name={EXERCISE_KIND_ICONS[kind]} className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      {EXERCISE_KIND_META[kind].label}
                    </span>
                    <span className="block text-xs leading-snug text-ink-muted">
                      {EXERCISE_KIND_META[kind].description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy || atLimit}
            onClick={() => setPicking(true)}
            title={atLimit ? `Lessons can have up to ${EXERCISE_LIMITS.perLessonMax} exercises` : undefined}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm font-semibold text-ink-muted transition hover:border-brand hover:text-brand disabled:opacity-50"
          >
            <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
            Add exercise
          </button>
        )
      ) : exercises.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No exercises on this lesson.</p>
      ) : null}
    </section>
  );
}

function ExerciseItem({
  exercise,
  index,
  total,
  readOnly,
  busy,
  defaultOpen,
  onPatch,
  onDelete,
  onMove,
  onUploadImage,
  onError,
}: {
  exercise: StudioExercise;
  index: number;
  total: number;
  readOnly: boolean;
  busy: boolean;
  defaultOpen: boolean;
  onPatch: (patch: ExercisePatch) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onUploadImage?: (file: File) => Promise<string>;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const issues = exerciseIssues(exercise);
  const kind = exercise.kind;
  const meta = EXERCISE_KIND_META[kind];

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-brand/20 dark:text-blue-200">
            <Icon name={EXERCISE_KIND_ICONS[kind]} className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">
              {exercise.title || "Untitled exercise"}
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              {meta.label} · {formatMinutes(exercise.estimatedMinutes)}
            </span>
          </span>
        </button>
        {issues.length > 0 ? (
          <span
            title={issues.join("\n")}
            className="hidden shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 sm:inline dark:bg-amber-500/10 dark:text-amber-300"
          >
            Needs work
          </span>
        ) : (
          <Icon name="checkCircle" className="h-4 w-4 shrink-0 text-emerald-500" />
        )}
        {!readOnly ? (
          <div className="flex shrink-0 items-center">
            <IconButton
              label="Move up"
              icon="chevronUp"
              disabled={busy || index === 0}
              onClick={() => onMove(-1)}
            />
            <IconButton
              label="Move down"
              icon="chevronDown"
              disabled={busy || index === total - 1}
              onClick={() => onMove(1)}
            />
            <IconButton label="Delete exercise" icon="trash" danger disabled={busy} onClick={onDelete} />
          </div>
        ) : null}
        <button
          type="button"
          aria-label={open ? "Collapse exercise" : "Expand exercise"}
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
        >
          <Icon name="chevronRight" className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
      </div>

      {open ? (
        <div className="space-y-5 border-t border-border bg-surface-subtle/40 px-4 py-4 sm:px-5">
          {issues.length > 0 ? (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              <Icon name="info" className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>Before you can submit the course, this exercise {issues.join("; ")}.</span>
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Title">
              <input
                value={exercise.title}
                disabled={readOnly}
                maxLength={EXERCISE_LIMITS.titleMax}
                onChange={(event) => onPatch({ title: event.target.value })}
                placeholder="What will learners do?"
                className={inputClass}
              />
            </Field>
            <Field label="Time">
              <span className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={EXERCISE_LIMITS.minutesMin}
                  max={EXERCISE_LIMITS.minutesMax}
                  value={exercise.estimatedMinutes}
                  disabled={readOnly}
                  onChange={(event) => {
                    const value = Math.round(Number(event.target.value));
                    if (Number.isFinite(value)) {
                      onPatch({
                        estimatedMinutes: Math.max(
                          EXERCISE_LIMITS.minutesMin,
                          Math.min(EXERCISE_LIMITS.minutesMax, value),
                        ),
                      });
                    }
                  }}
                  className={`${inputClass} w-20 text-right font-mono tabular-nums`}
                />
                <span className="text-xs text-ink-muted">min</span>
              </span>
            </Field>
          </div>

          <Field
            label={kind === "quiz" ? "Intro (optional)" : "Instructions"}
            hint={
              kind === "quiz"
                ? "A sentence or two shown above the questions."
                : `What should learners do? At least ${EXERCISE_LIMITS.instructionsMin} characters.`
            }
          >
            <div className="h-72">
              <MarkdownEditor
                key={exercise.id}
                initialValue={exercise.instructions}
                readOnly={readOnly}
                onChange={(instructions) => onPatch({ instructions })}
                onUploadImage={onUploadImage}
                onError={onError}
                placeholder="Write the exercise instructions in markdown."
                emptyAction={
                  kind === "quiz"
                    ? undefined
                    : { label: "Start from a template", content: INSTRUCTION_TEMPLATES[kind] }
                }
              />
            </div>
          </Field>

          {kind === "quiz" ? (
            <QuizEditor exercise={exercise} readOnly={readOnly} onPatch={onPatch} />
          ) : (
            <RequirementsEditor
              requirements={exercise.requirements}
              readOnly={readOnly}
              onChange={(requirements) => onPatch({ requirements })}
            />
          )}

          <Field label="Hint (optional)" hint="Collapsed under the exercise until a learner opens it. Markdown works.">
            <textarea
              value={exercise.hint}
              rows={2}
              disabled={readOnly}
              maxLength={EXERCISE_LIMITS.hintMax}
              onChange={(event) => onPatch({ hint: event.target.value })}
              placeholder="A nudge in the right direction, without giving the answer away."
              className={`${inputClass} resize-y`}
            />
          </Field>

          {kind !== "quiz" ? (
            <Field
              label="Reference solution (optional)"
              hint="Shown only after a learner finishes. Markdown and code blocks work."
            >
              <textarea
                value={exercise.solution}
                rows={4}
                disabled={readOnly}
                maxLength={EXERCISE_LIMITS.solutionMax}
                onChange={(event) => onPatch({ solution: event.target.value })}
                placeholder={"One way to solve it:\n\n```html\n…\n```"}
                className={`${inputClass} resize-y font-mono text-[13px]`}
              />
            </Field>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function RequirementsEditor({
  requirements,
  readOnly,
  onChange,
}: {
  requirements: string[];
  readOnly: boolean;
  onChange: (next: string[]) => void;
}) {
  return (
    <Field
      label="Requirements (optional)"
      hint="Learners tick each one before they can mark the exercise done. Good for acceptance criteria."
    >
      <ul className="space-y-2">
        {requirements.map((requirement, index) => (
          <li key={index} className="flex items-center gap-2">
            <Icon name="check" className="h-4 w-4 shrink-0 text-ink-muted" />
            <input
              value={requirement}
              disabled={readOnly}
              maxLength={EXERCISE_LIMITS.requirementMax}
              onChange={(event) =>
                onChange(requirements.map((item, i) => (i === index ? event.target.value : item)))
              }
              placeholder="e.g. Every form control has a label"
              className={inputClass}
            />
            {!readOnly ? (
              <IconButton
                label="Remove requirement"
                icon="x"
                onClick={() => onChange(requirements.filter((_, i) => i !== index))}
              />
            ) : null}
          </li>
        ))}
      </ul>
      {!readOnly && requirements.length < EXERCISE_LIMITS.requirementsMax ? (
        <button
          type="button"
          onClick={() => onChange([...requirements, ""])}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:brightness-110"
        >
          <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.2} />
          Add requirement
        </button>
      ) : null}
    </Field>
  );
}

function QuizEditor({
  exercise,
  readOnly,
  onPatch,
}: {
  exercise: StudioExercise;
  readOnly: boolean;
  onPatch: (patch: ExercisePatch) => void;
}) {
  const questions = exercise.questions;

  function setQuestions(next: QuizQuestion[]) {
    onPatch({ questions: next });
  }

  function updateQuestion(id: string, patch: Partial<QuizQuestion>) {
    setQuestions(questions.map((question) => (question.id === id ? { ...question, ...patch } : question)));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-ink">
          Questions <span className="font-normal text-ink-muted">({questions.length})</span>
        </p>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          Pass mark
          <select
            value={exercise.passPercent}
            disabled={readOnly}
            onChange={(event) => onPatch({ passPercent: Number(event.target.value) })}
            className="rounded-lg border border-border bg-surface px-2 py-1 font-mono text-xs text-ink focus:border-brand focus:outline-none"
          >
            {[50, 60, 70, 80, 90, 100].map((value) => (
              <option key={value} value={value}>
                {value}%
              </option>
            ))}
          </select>
        </label>
      </div>

      <ol className="space-y-3">
        {questions.map((question, index) => (
          <li key={question.id} className="rounded-xl border border-border bg-surface p-3.5">
            <div className="flex items-start gap-2">
              <span className="mt-2 font-mono text-xs font-semibold text-ink-muted">{index + 1}.</span>
              <textarea
                value={question.prompt}
                rows={2}
                disabled={readOnly}
                maxLength={EXERCISE_LIMITS.questionPromptMax}
                onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
                placeholder="Ask a question about the lesson"
                className={`${inputClass} resize-y`}
              />
              {!readOnly ? (
                <IconButton
                  label="Delete question"
                  icon="trash"
                  danger
                  onClick={() => setQuestions(questions.filter((item) => item.id !== question.id))}
                />
              ) : null}
            </div>

            <div className="mt-3 space-y-1.5 pl-5">
              <p className="text-[11px] text-ink-muted">Answers · select the correct one</p>
              {question.options.map((option) => (
                <div key={option.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={question.correctOptionId === option.id}
                    disabled={readOnly}
                    onChange={() => updateQuestion(question.id, { correctOptionId: option.id })}
                    aria-label="Correct answer"
                    className="h-4 w-4 shrink-0 accent-emerald-600"
                  />
                  <input
                    value={option.text}
                    disabled={readOnly}
                    maxLength={EXERCISE_LIMITS.optionTextMax}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        options: question.options.map((item) =>
                          item.id === option.id ? { ...item, text: event.target.value } : item,
                        ),
                      })
                    }
                    placeholder="Answer"
                    className={[
                      inputClass,
                      question.correctOptionId === option.id
                        ? "border-emerald-300 dark:border-emerald-500/40"
                        : "",
                    ].join(" ")}
                  />
                  {!readOnly && question.options.length > EXERCISE_LIMITS.optionsMin ? (
                    <IconButton
                      label="Remove answer"
                      icon="x"
                      onClick={() =>
                        updateQuestion(question.id, {
                          options: question.options.filter((item) => item.id !== option.id),
                          correctOptionId:
                            question.correctOptionId === option.id ? null : question.correctOptionId,
                        })
                      }
                    />
                  ) : null}
                </div>
              ))}
              {!readOnly && question.options.length < EXERCISE_LIMITS.optionsMax ? (
                <button
                  type="button"
                  onClick={() =>
                    updateQuestion(question.id, {
                      options: [...question.options, { id: newId(), text: "" }],
                    })
                  }
                  className="inline-flex items-center gap-1.5 pl-6 text-xs font-semibold text-brand hover:brightness-110"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Add answer
                </button>
              ) : null}
            </div>

            <div className="mt-3 pl-5">
              <input
                value={question.explanation}
                disabled={readOnly}
                maxLength={EXERCISE_LIMITS.explanationMax}
                onChange={(event) => updateQuestion(question.id, { explanation: event.target.value })}
                placeholder="Why is that the answer? (optional, shown after passing)"
                className={`${inputClass} text-xs`}
              />
            </div>
          </li>
        ))}
      </ol>

      {!readOnly && questions.length < EXERCISE_LIMITS.questionsMax ? (
        <button
          type="button"
          onClick={() => setQuestions([...questions, blankQuestion()])}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:brightness-110"
        >
          <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.2} />
          Add question
        </button>
      ) : null}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink">{label}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: "chevronUp" | "chevronDown" | "trash" | "x";
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition disabled:opacity-30",
        danger
          ? "hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
          : "hover:bg-surface-subtle hover:text-ink",
      ].join(" ")}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}
