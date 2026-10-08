"use client";

import { useEffect, useRef } from "react";
import { COURSE_LIMITS, suggestedLessonMinutes, type ExerciseKind } from "@coddle/shared";
import { Icon } from "@/components/ui/icon";
import type { ExercisePatch, StudioLesson, StudioModule } from "@/lib/studio";
import { LessonExercisesEditor } from "./exercise-editor";
import { MarkdownEditor } from "./markdown-editor";

export type ExerciseHandlers = {
  busy: boolean;
  focusExerciseId: string | null;
  onAdd: (kind: ExerciseKind) => void;
  onPatch: (exerciseId: string, patch: ExercisePatch) => void;
  onDelete: (exerciseId: string) => void;
  onMove: (exerciseId: string, direction: -1 | 1) => void;
};

export type LessonPatch = Partial<{
  title: string;
  summary: string;
  content: string;
  estimatedMinutes: number;
}>;

const LESSON_TEMPLATE = `## Overview

In one or two sentences: what will the learner understand or be able to do after this lesson?

## Walkthrough

Explain the idea step by step. Keep paragraphs short and show real code:

\`\`\`js
// A small, runnable example
\`\`\`

## Common mistakes

- Something learners often get wrong, and how to spot it

## Practice

1. A small task that uses what this lesson taught
2. A stretch goal for learners who want more
`;

export function LessonPane({
  lesson,
  courseModule,
  lessonIndex,
  readOnly,
  autoFocusTitle,
  previous,
  next,
  onNavigate,
  onPatch,
  onDelete,
  onUploadImage,
  onError,
  exercises,
}: {
  lesson: StudioLesson;
  courseModule: StudioModule;
  lessonIndex: number;
  readOnly: boolean;
  autoFocusTitle: boolean;
  previous: StudioLesson | null;
  next: StudioLesson | null;
  onNavigate: (lessonId: string) => void;
  onPatch: (patch: LessonPatch) => void;
  onDelete: () => void;
  onUploadImage?: (file: File) => Promise<string>;
  onError: (message: string) => void;
  exercises: ExerciseHandlers;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const suggested = suggestedLessonMinutes(lesson.content);
  const showSuggestion =
    lesson.content.trim().length >= COURSE_LIMITS.lessonContentMin &&
    Math.abs(suggested - lesson.estimatedMinutes) >= 5;
  const emptyTitle = lesson.title.trim().length === 0;

  useEffect(() => {
    if (autoFocusTitle) {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
  }, [autoFocusTitle]);

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-5 pb-5 pt-6 sm:px-8">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs text-ink-muted">
          <span className="font-semibold text-ink">{courseModule.title}</span>
          <span className="mx-1.5" aria-hidden>
            /
          </span>
          Lesson {lessonIndex + 1} of {courseModule.lessons.length}
        </p>
        <div className="flex items-center gap-1">
          <NavButton
            label="Previous lesson"
            icon="arrowLeft"
            disabled={!previous}
            onClick={() => previous && onNavigate(previous.id)}
          />
          <NavButton
            label="Next lesson"
            icon="chevronRight"
            disabled={!next}
            onClick={() => next && onNavigate(next.id)}
          />
          {!readOnly ? (
            <>
              <span className="mx-1 h-5 w-px bg-border" aria-hidden />
              <button
                type="button"
                onClick={onDelete}
                title="Delete lesson"
                aria-label="Delete lesson"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-3 shrink-0">
        <input
          ref={titleRef}
          value={lesson.title}
          disabled={readOnly}
          maxLength={COURSE_LIMITS.lessonTitleMax}
          onChange={(event) => onPatch({ title: event.target.value })}
          placeholder="Lesson title"
          aria-label="Lesson title"
          className="w-full border-0 bg-transparent p-0 font-display text-3xl font-extrabold tracking-tight text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-0 disabled:opacity-80"
        />
        {emptyTitle ? (
          <p className="mt-1 text-xs text-rose-600">Lessons need a title. Not saved yet.</p>
        ) : null}
        <input
          value={lesson.summary}
          disabled={readOnly}
          maxLength={COURSE_LIMITS.lessonSummaryMax}
          onChange={(event) => onPatch({ summary: event.target.value })}
          placeholder="One-line summary shown under the title"
          aria-label="Lesson summary"
          className="mt-2 w-full border-0 bg-transparent p-0 text-base text-ink-muted placeholder:text-ink-muted/50 focus:outline-none focus:ring-0"
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-ink-muted focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
            <Icon name="clock" className="h-3.5 w-3.5" />
            <input
              type="number"
              min={COURSE_LIMITS.lessonMinutesMin}
              max={COURSE_LIMITS.lessonMinutesMax}
              value={lesson.estimatedMinutes}
              disabled={readOnly}
              onChange={(event) => {
                const value = Math.round(Number(event.target.value));
                if (Number.isFinite(value)) {
                  onPatch({
                    estimatedMinutes: Math.max(
                      COURSE_LIMITS.lessonMinutesMin,
                      Math.min(COURSE_LIMITS.lessonMinutesMax, value),
                    ),
                  });
                }
              }}
              aria-label="Estimated minutes"
              className="w-12 border-0 bg-transparent p-0 text-right font-mono text-xs font-semibold tabular-nums text-ink focus:outline-none focus:ring-0"
            />
            <span>min</span>
          </label>
          {showSuggestion && !readOnly ? (
            <button
              type="button"
              onClick={() => onPatch({ estimatedMinutes: suggested })}
              title="Based on the lesson's word count and code blocks"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand transition hover:brightness-95 dark:bg-brand/20 dark:text-blue-200"
            >
              <Icon name="sparkle" className="h-3.5 w-3.5" />
              Use suggested {suggested} min
            </button>
          ) : null}
          {lesson.content.trim().length < COURSE_LIMITS.lessonContentMin ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <Icon name="info" className="h-3.5 w-3.5" />
              Needs at least {COURSE_LIMITS.lessonContentMin} characters to submit
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 min-h-[28rem] flex-1">
        <MarkdownEditor
          key={lesson.id}
          initialValue={lesson.content}
          readOnly={readOnly}
          onChange={(content) => onPatch({ content })}
          onUploadImage={onUploadImage}
          onError={onError}
          placeholder={
            "Write the lesson in markdown.\n\n## Use headings for sections\n\n- Lists, **bold**, `code`, tables, and images all work.\n- Paste or drop an image to upload it."
          }
          emptyAction={{ label: "Start from the lesson template", content: LESSON_TEMPLATE }}
        />
      </div>

      <LessonExercisesEditor
        exercises={lesson.exercises}
        readOnly={readOnly}
        busy={exercises.busy}
        focusExerciseId={exercises.focusExerciseId}
        onAdd={exercises.onAdd}
        onPatch={exercises.onPatch}
        onDelete={exercises.onDelete}
        onMove={exercises.onMove}
        onUploadImage={onUploadImage}
        onError={onError}
      />
      <div className="h-5 shrink-0" aria-hidden />
    </div>
  );
}

function NavButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: "arrowLeft" | "chevronRight";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-subtle hover:text-ink disabled:opacity-30"
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}
