"use client";

import { COURSE_LIMITS, formatMinutes } from "@coddle/shared";
import { Icon } from "@/components/ui/icon";
import { pluralize } from "@/lib/format";
import type { StudioModule } from "@/lib/studio";

export function ModulePane({
  courseModule,
  index,
  total,
  readOnly,
  onPatch,
  onOpenLesson,
  onAddLesson,
  onDelete,
}: {
  courseModule: StudioModule;
  index: number;
  total: number;
  readOnly: boolean;
  onPatch: (patch: Partial<{ title: string; summary: string }>) => void;
  onOpenLesson: (lessonId: string) => void;
  onAddLesson: () => void;
  onDelete: () => void;
}) {
  const minutes = courseModule.lessons.reduce(
    (sum, lesson) =>
      sum +
      lesson.estimatedMinutes +
      lesson.exercises.reduce((inner, exercise) => inner + exercise.estimatedMinutes, 0),
    0,
  );
  const exerciseCount = courseModule.lessons.reduce(
    (sum, lesson) => sum + lesson.exercises.length,
    0,
  );
  const empty = courseModule.title.trim().length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Module {String(index + 1).padStart(2, "0")} of {String(total).padStart(2, "0")}
        </p>
        {!readOnly ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
          >
            <Icon name="trash" className="h-3.5 w-3.5" />
            Delete module
          </button>
        ) : null}
      </div>

      <input
        value={courseModule.title}
        disabled={readOnly}
        maxLength={COURSE_LIMITS.moduleTitleMax}
        onChange={(event) => onPatch({ title: event.target.value })}
        placeholder="Module title"
        aria-label="Module title"
        className="mt-3 w-full border-0 bg-transparent p-0 font-display text-3xl font-extrabold tracking-tight text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-0 disabled:opacity-80"
      />
      {empty ? <p className="mt-1 text-xs text-rose-600">Modules need a title. Not saved yet.</p> : null}
      <textarea
        value={courseModule.summary}
        disabled={readOnly}
        rows={2}
        maxLength={COURSE_LIMITS.moduleSummaryMax}
        onChange={(event) => onPatch({ summary: event.target.value })}
        placeholder="What does this module cover? (optional)"
        aria-label="Module summary"
        className="mt-3 w-full resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-ink-muted placeholder:text-ink-muted/50 focus:outline-none focus:ring-0"
      />

      <div className="mt-6 flex items-center gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <Icon name="file" className="h-3.5 w-3.5" />
          {pluralize(courseModule.lessons.length, "lesson")}
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="target" className="h-3.5 w-3.5" />
          {pluralize(exerciseCount, "exercise")}
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="clock" className="h-3.5 w-3.5" />
          {formatMinutes(minutes || 0)}
        </span>
      </div>

      {exerciseCount === 0 && courseModule.lessons.length > 0 ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <Icon name="info" className="mt-px h-3.5 w-3.5 shrink-0" />
          Every module needs at least one exercise. Open a lesson and add one under its content.
        </p>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        {courseModule.lessons.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Icon name="file" className="mx-auto h-7 w-7 text-ink-muted" />
            <p className="mt-3 text-sm font-semibold text-ink">No lessons in this module</p>
            <p className="mt-1 text-xs text-ink-muted">
              Lessons are markdown pages learners read and then practice.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {courseModule.lessons.map((lesson, lessonIndex) => {
              const thin = lesson.content.trim().length < COURSE_LIMITS.lessonContentMin;
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    onClick={() => onOpenLesson(lesson.id)}
                    className="group flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-surface-subtle"
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-subtle font-mono text-[11px] font-semibold text-ink-muted group-hover:bg-brand-soft group-hover:text-brand">
                      {lessonIndex + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {lesson.title}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        {lesson.summary || "No summary"}
                      </span>
                    </span>
                    {lesson.exercises.length > 0 ? (
                      <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-ink-muted">
                        <Icon name="target" className="h-3 w-3" />
                        {lesson.exercises.length}
                      </span>
                    ) : null}
                    {thin ? (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                        Needs content
                      </span>
                    ) : (
                      <span className="shrink-0 font-mono text-[11px] text-ink-muted">
                        {lesson.estimatedMinutes} min
                      </span>
                    )}
                    <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-ink-muted" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {!readOnly ? (
          <div className="border-t border-border bg-surface-subtle/60 px-5 py-3">
            <button
              type="button"
              onClick={onAddLesson}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:brightness-110"
            >
              <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
              Add lesson
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
