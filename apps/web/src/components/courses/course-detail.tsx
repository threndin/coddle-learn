"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import {
  COURSE_COMPLETE_POINTS,
  LESSON_COMPLETE_POINTS,
  formatMinutes,
  isExerciseDone,
  levelById,
} from "@coddle/shared";
import { COURSE_STATUS_META, type CourseStatus } from "@coddle/shared";
import { useAppUserActions } from "@/components/app/app-user-context";
import { useToast } from "@/components/app/toast";
import { CourseReviews } from "@/components/courses/course-reviews";
import { LessonExercises, type ExerciseAccess } from "@/components/courses/lesson-exercises";
import { LessonMarkdown } from "@/components/courses/lesson-markdown";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { Icon } from "@/components/ui/icon";
import { Stars } from "@/components/ui/stars";
import { errorMessage } from "@/lib/api-client";
import {
  resetExercise,
  startCourse,
  submitExercise,
  updateCourseProgress,
  type CourseDetail,
  type CourseExerciseDetail,
  type CourseLessonDetail,
  type ExerciseSubmissionInput,
} from "@/lib/courses";

type SelectedLesson = {
  moduleSlug: string;
  lesson: CourseLessonDetail;
};

export function CourseDetailView({
  slug,
  initialModuleSlug,
  initialLessonSlug,
  initialCourse,
}: {
  slug: string;
  initialModuleSlug: string | null;
  initialLessonSlug: string | null;
  initialCourse: CourseDetail | null;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const { refreshUser } = useAppUserActions();
  const reduceMotion = useReducedMotion();
  const [course, setCourse] = useState<CourseDetail | null>(initialCourse);
  const [error, setError] = useState<string | null>(
    initialCourse ? null : "That course could not be found.",
  );
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const flatLessons = useMemo(() => {
    if (!course) return [] as SelectedLesson[];
    return course.modules.flatMap((courseModule) =>
      courseModule.lessons.map((lesson) => ({
        moduleSlug: courseModule.slug,
        lesson,
      })),
    );
  }, [course]);

  const initialSelected = useMemo(() => {
    if (!course) return null;
    if (initialModuleSlug && initialLessonSlug) {
      const hit = flatLessons.find(
        (item) =>
          item.moduleSlug === initialModuleSlug &&
          item.lesson.slug === initialLessonSlug,
      );
      if (hit) return hit;
    }
    if (course.nextLesson) {
      const hit = flatLessons.find(
        (item) =>
          item.lesson.slug === course.nextLesson!.slug &&
          (!course.nextLesson!.moduleSlug ||
            item.moduleSlug === course.nextLesson!.moduleSlug),
      );
      if (hit) return hit;
    }
    return flatLessons[0] ?? null;
  }, [course, flatLessons, initialLessonSlug, initialModuleSlug]);

  const [selected, setSelected] = useState<SelectedLesson | null>(initialSelected);

  function selectLesson(moduleSlug: string, lesson: CourseLessonDetail) {
    const next = { moduleSlug, lesson };
    setSelected(next);
    startTransition(() => {
      router.replace(
        `/courses/${slug}?module=${encodeURIComponent(moduleSlug)}&lesson=${encodeURIComponent(lesson.slug)}`,
        { scroll: false },
      );
    });
  }

  const applyDetail = useCallback(
    (detail: CourseDetail, toast?: string) => {
      setCourse(detail);
      setError(null);
      if (toast) pushToast(toast, "success");
      void refreshUser();
      setSelected((current) => {
        if (!current) return current;
        const module = detail.modules.find((item) => item.slug === current.moduleSlug);
        const lesson = module?.lessons.find((item) => item.slug === current.lesson.slug);
        if (!module || !lesson) return current;
        return { moduleSlug: module.slug, lesson };
      });
    },
    [pushToast, refreshUser],
  );

  async function handleStart() {
    setBusy(true);
    try {
      const detail = await startCourse(slug);
      applyDetail(detail, "Course started");
      if (detail.nextLesson) {
        const hit = detail.modules
          .flatMap((courseModule) =>
            courseModule.lessons.map((lesson) => ({
              moduleSlug: courseModule.slug,
              lesson,
            })),
          )
          .find((item) => item.lesson.slug === detail.nextLesson!.slug);
        if (hit) selectLesson(hit.moduleSlug, hit.lesson);
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Could not start course", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleProgress(status: "completed" | "skipped" | "incomplete") {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await updateCourseProgress(
        slug,
        selected.moduleSlug,
        selected.lesson.slug,
        status,
      );
      const toast =
        status === "completed"
          ? `Lesson complete (+${LESSON_COMPLETE_POINTS} pts)`
          : status === "skipped"
            ? "Lesson skipped"
            : "Lesson marked incomplete";
      applyDetail(result.course, toast);
      if (result.courseCompleteBonus > 0) {
        pushToast(`Course complete (+${COURSE_COMPLETE_POINTS} pts)`, "success");
      }
      if (status === "completed" || status === "skipped") {
        const next = result.course.nextLesson;
        if (next?.moduleSlug) {
          const module = result.course.modules.find(
            (item) => item.slug === next.moduleSlug,
          );
          const lesson = module?.lessons.find((item) => item.slug === next.slug);
          if (module && lesson) {
            const moved =
              module.slug !== selected.moduleSlug || lesson.slug !== selected.lesson.slug;
            selectLesson(module.slug, lesson);
            if (moved) {
              window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
            }
          }
        }
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Could not update progress", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleExerciseSubmit(
    exercise: CourseExerciseDetail,
    input: ExerciseSubmissionInput,
  ) {
    try {
      const result = await submitExercise(slug, exercise.id, input);
      const points = result.pointsAwarded > 0 ? ` (+${result.pointsAwarded} pts)` : "";
      if (result.result.status === "attempted") {
        applyDetail(result.course);
        pushToast(`You scored ${result.result.score ?? 0}%. Review and try again.`, "info");
      } else {
        const label =
          exercise.kind === "quiz"
            ? "Quiz passed"
            : exercise.kind === "task"
              ? "Exercise complete"
              : exercise.submission
                ? "Submission updated"
                : "Submission saved";
        applyDetail(result.course, `${label}${points}`);
      }
      if (result.courseCompleteBonus > 0) {
        pushToast(`Course complete (+${COURSE_COMPLETE_POINTS} pts)`, "success");
      }
      return result;
    } catch (err) {
      pushToast(errorMessage(err, "Could not submit exercise"), "error");
      return null;
    }
  }

  async function handleExerciseReset(exercise: CourseExerciseDetail) {
    try {
      const { course: detail } = await resetExercise(slug, exercise.id);
      applyDetail(
        detail,
        exercise.kind === "quiz" ? "Quiz reset. Give it another go." : "Exercise reopened",
      );
      return true;
    } catch (err) {
      pushToast(errorMessage(err, "Could not reset exercise"), "error");
      return false;
    }
  }

  if (!course) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
        <p className="text-sm text-ink-muted">{error}</p>
        <Link href="/courses" className="mt-4 inline-flex text-sm font-semibold text-brand">
          Back to courses
        </Link>
      </div>
    );
  }

  const levelLabel = levelById(String(course.level));
  const selectedStatus = selected?.lesson.status;
  const isPreview = course.status !== "published" && course.status !== "archived";
  const editHref = course.viewer.studioCourseId
    ? `/studio/courses/${course.viewer.studioCourseId}`
    : null;
  const exerciseAccess: ExerciseAccess = isPreview
    ? "preview"
    : !course.enrolled
      ? "not-enrolled"
      : selectedStatus === "locked"
        ? "locked"
        : "active";

  const modulesPanel = (
    <aside className="flex max-h-[min(32rem,calc(100vh-8rem))] flex-col rounded-2xl border border-border bg-surface p-4 lg:sticky lg:top-24">
      <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        Modules
      </p>
      <div className="mt-3 min-h-0 space-y-4 overflow-y-auto overscroll-contain pr-1">
        {course.modules.map((courseModule) => (
          <div key={courseModule.slug}>
            <p className="text-sm font-semibold text-ink">{courseModule.title}</p>
            <ul className="mt-2 space-y-1">
              {courseModule.lessons.map((lesson) => {
                const active =
                  selected?.moduleSlug === courseModule.slug &&
                  selected.lesson.slug === lesson.slug;
                const exercisesDone = lesson.exercises.filter((exercise) =>
                  isExerciseDone(exercise.submission?.status),
                ).length;
                return (
                  <li key={lesson.slug}>
                    <button
                      type="button"
                      onClick={() => selectLesson(courseModule.slug, lesson)}
                      className={[
                        "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
                        active
                          ? "bg-brand text-white"
                          : "text-ink-muted hover:bg-surface-subtle hover:text-ink",
                      ].join(" ")}
                    >
                      <span className="truncate">{lesson.title}</span>
                      {lesson.exercises.length > 0 ? (
                        <span
                          title={`${exercisesDone} of ${lesson.exercises.length} exercises done`}
                          className={[
                            "ml-auto inline-flex shrink-0 items-center gap-0.5 font-mono text-[10px] tabular-nums",
                            active
                              ? "text-white/80"
                              : course.enrolled && exercisesDone === lesson.exercises.length
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-ink-muted",
                          ].join(" ")}
                        >
                          <Icon name="target" className="h-3 w-3" />
                          {course.enrolled
                            ? `${exercisesDone}/${lesson.exercises.length}`
                            : lesson.exercises.length}
                        </span>
                      ) : null}
                      <span
                        className={[
                          "inline-flex shrink-0 items-center justify-center text-[10px] font-semibold uppercase",
                          active ? "text-white/80" : "text-ink-muted",
                        ].join(" ")}
                      >
                        {lesson.status === "completed"
                          ? "Done"
                          : lesson.status === "skipped"
                            ? "Skip"
                            : lesson.status === "current"
                              ? "Now"
                              : (
                                <LockIcon
                                  className={
                                    active ? "text-white/80" : "text-ink-muted"
                                  }
                                />
                              )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      {isPreview ? (
        <PreviewBanner status={course.status} editHref={editHref} />
      ) : null}
      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="relative aspect-[21/9] max-h-[280px] w-full overflow-hidden bg-surface-subtle sm:aspect-[3/1]">
          {/* R2 SVG thumbnails; hosts vary with CDN config. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={course.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        <div className="p-6 sm:p-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            {levelLabel?.label ?? course.level}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {course.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
            {course.summary}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5">
              <ProfileAvatar
                name={course.createdBy.name}
                avatarUrl={course.createdBy.avatarUrl}
                size="sm"
              />
              <div>
                <p className="text-sm font-semibold text-ink">{course.createdBy.name}</p>
                <p className="text-xs text-ink-muted">Created by</p>
              </div>
            </div>
            <span className="text-xs text-ink-muted">
              ~{course.estimatedHours} {course.estimatedHours === 1 ? "hour" : "hours"}
            </span>
            {course.rating.count > 0 ? (
              <a
                href="#reviews"
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-2.5 py-1 text-xs transition hover:bg-brand-soft"
              >
                <Stars value={course.rating.average} size="xs" />
                <span className="font-bold tabular-nums text-ink">
                  {course.rating.average.toFixed(1)}
                </span>
                <span className="text-ink-muted">({course.rating.count})</span>
              </a>
            ) : null}
            {course.enrolled ? (
              <span className="text-xs font-semibold tabular-nums text-brand">
                {course.progressPercent}% complete
                {course.exerciseCount > 0
                  ? ` · ${course.exercisesDone}/${course.exerciseCount} exercises`
                  : ""}
              </span>
            ) : course.exerciseCount > 0 ? (
              <span className="text-xs text-ink-muted">
                {course.exerciseCount} {course.exerciseCount === 1 ? "exercise" : "exercises"}
              </span>
            ) : null}
          </div>

          {course.skills.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {course.skills.map((skill) => (
                <span
                  key={skill.slug}
                  className="rounded-md bg-surface-subtle px-2.5 py-1 text-xs font-medium text-ink-muted"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!course.enrolled && course.viewer.canStart ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleStart()}
                className="inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Start course
              </button>
            ) : null}
            {editHref ? (
              <Link
                href={editHref}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle"
              >
                <Icon name="pencil" className="h-4 w-4" />
                Edit in Studio
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        {selected ? (
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Lesson
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
                  {selected.lesson.title}
                </h2>
                <p className="mt-2 text-sm text-ink-muted">
                  {selected.lesson.summary} ·{" "}
                  {formatMinutes(selected.lesson.estimatedMinutes)}
                </p>
              </div>
              {course.enrolled ? (
                <div className="flex flex-wrap gap-2">
                  {selectedStatus === "completed" || selectedStatus === "skipped" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleProgress("incomplete")}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink-muted disabled:opacity-60"
                    >
                      Mark incomplete
                    </button>
                  ) : selectedStatus !== "locked" ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleProgress("skipped")}
                        className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink-muted disabled:opacity-60"
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleProgress("completed")}
                        className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Mark complete
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-ink-muted">Finish earlier lessons first.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  {isPreview ? "Preview mode" : "Start the course to track progress."}
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-border pt-6">
              <LessonMarkdown content={selected.lesson.content} />
            </div>

            <LessonExercises
              key={`${selected.moduleSlug}/${selected.lesson.slug}`}
              exercises={selected.lesson.exercises}
              access={exerciseAccess}
              onSubmit={handleExerciseSubmit}
              onReset={handleExerciseReset}
            />

            {course.enrolled &&
            selected.lesson.exercises.length > 0 &&
            selectedStatus === "current" ? (
              <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
                <p className="mr-auto text-xs text-ink-muted">
                  Lessons and exercises are tracked separately. Mark the lesson done when you&apos;ve
                  read it.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleProgress("completed")}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Mark lesson complete
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-surface p-6 text-sm text-ink-muted sm:p-8">
            Pick a lesson from the modules list to start reading.
          </div>
        )}

        {modulesPanel}
      </div>

      {!isPreview ? (
        <div className="mt-6">
          <CourseReviews
            slug={slug}
            onSummaryChange={(rating) =>
              setCourse((prev) => (prev ? { ...prev, rating } : prev))
            }
            onStartCourse={
              !course.enrolled && course.viewer.canStart ? () => void handleStart() : undefined
            }
          />
        </div>
      ) : null}

      <div className="mt-6">
        <Link href="/courses" className="text-sm font-semibold text-brand">
          ← All courses
        </Link>
      </div>
    </div>
  );
}

function PreviewBanner({
  status,
  editHref,
}: {
  status: CourseStatus;
  editHref: string | null;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
      <p className="flex items-center gap-2">
        <Icon name="eye" className="h-4 w-4 shrink-0" />
        <span>
          <span className="font-semibold">Preview.</span> This course is{" "}
          {COURSE_STATUS_META[status].label.toLowerCase()}, so only you can see it. Progress
          tracking and reviews turn on once it&apos;s published.
        </span>
      </p>
      {editHref ? (
        <Link
          href={editHref}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold transition hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30"
        >
          <Icon name="pencil" className="h-3.5 w-3.5" />
          Back to editor
        </Link>
      ) : null}
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={["h-3.5 w-3.5", className].filter(Boolean).join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Locked"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
