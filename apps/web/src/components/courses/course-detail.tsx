"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  COURSE_COMPLETE_POINTS,
  LESSON_COMPLETE_POINTS,
  formatMinutes,
  levelById,
} from "@coddle/shared";
import { useAppUserActions } from "@/components/app/app-user-context";
import { useToast } from "@/components/app/toast";
import { LessonMarkdown } from "@/components/courses/lesson-markdown";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import {
  startCourse,
  updateCourseProgress,
  type CourseDetail,
  type CourseLessonDetail,
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
          if (module && lesson) selectLesson(module.slug, lesson);
        }
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Could not update progress", "error");
    } finally {
      setBusy(false);
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
            <span className="text-xs text-ink-muted">~{course.estimatedHours} hours</span>
            {course.enrolled ? (
              <span className="text-xs font-semibold tabular-nums text-brand">
                {course.progressPercent}% complete
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

          {!course.enrolled ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleStart()}
              className="mt-6 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Start course
            </button>
          ) : null}
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
                <p className="text-sm text-ink-muted">Start the course to track progress.</p>
              )}
            </div>

            <div className="mt-6 border-t border-border pt-6">
              <LessonMarkdown content={selected.lesson.content} />
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-surface p-6 text-sm text-ink-muted sm:p-8">
            Pick a lesson from the modules list to start reading.
          </div>
        )}

        {modulesPanel}
      </div>

      <div className="mt-6">
        <Link href="/courses" className="text-sm font-semibold text-brand">
          ← All courses
        </Link>
      </div>
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
