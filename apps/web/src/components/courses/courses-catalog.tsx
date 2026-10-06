"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { levelById } from "@coddle/shared";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import type { CourseCatalogItem } from "@/lib/courses";

type LevelFilter = "all" | "beginner" | "intermediate" | "advanced";
type ScopeFilter = "all" | "mine";

export function CoursesCatalog({
  initialCourses,
}: {
  initialCourses: CourseCatalogItem[] | null;
}) {
  const [courses] = useState<CourseCatalogItem[] | null>(initialCourses);
  const [level, setLevel] = useState<LevelFilter>("all");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [error] = useState<string | null>(
    initialCourses ? null : "Could not load courses",
  );

  const filtered = useMemo(() => {
    if (!courses) return [];
    return courses.filter((course) => {
      if (level !== "all" && course.level !== level) return false;
      if (scope === "mine" && !course.enrolled) return false;
      return true;
    });
  }, [courses, level, scope]);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <div className="max-w-2xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Courses
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Learn by module
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          Contributor-built courses with modules, markdown lessons, and skills you
          can grow — start one and pick up where you left off.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "All levels"],
            ["beginner", "Beginner"],
            ["intermediate", "Intermediate"],
            ["advanced", "Advanced"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setLevel(id)}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              level === id
                ? "bg-brand text-white"
                : "border border-border bg-surface text-ink-muted hover:border-border-strong",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        {(
          [
            ["all", "All courses"],
            ["mine", "My courses"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setScope(id)}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              scope === id
                ? "bg-brand text-white"
                : "border border-border bg-surface text-ink-muted hover:border-border-strong",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm text-ink-muted">
          {error}
        </p>
      ) : null}

      {courses && filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-8">
          <h2 className="font-display text-xl font-bold text-ink">No matching courses</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {scope === "mine"
              ? "You have not started a course in this filter yet."
              : "Try another level filter to see more courses."}
          </p>
          {scope === "mine" ? (
            <button
              type="button"
              onClick={() => setScope("all")}
              className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
            >
              Show all courses
            </button>
          ) : null}
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => {
            const levelLabel = levelById(String(course.level));
            return (
              <article
                key={course.slug}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-border-strong"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-surface-subtle">
                  {/* R2 SVG thumbnails; hosts vary with CDN config. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={course.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      {levelLabel?.label ?? course.level}
                    </p>
                    {course.enrolled ? (
                      <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand">
                        {course.completedAt ? "Completed" : "In progress"}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-3 font-display text-xl font-bold tracking-tight text-ink">
                    {course.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                    {course.summary}
                  </p>

                  {course.skills.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {course.skills.map((skill) => (
                        <span
                          key={skill.slug}
                          className="rounded-md bg-surface-subtle px-2 py-1 text-[11px] font-medium text-ink-muted"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center gap-2.5">
                    <ProfileAvatar
                      name={course.createdBy.name}
                      avatarUrl={course.createdBy.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-ink">
                        {course.createdBy.name}
                      </p>
                      <p className="text-[11px] text-ink-muted">Created by</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                    <span>~{course.estimatedHours}h</span>
                    <span aria-hidden>·</span>
                    <span>{course.moduleCount} modules</span>
                    <span aria-hidden>·</span>
                    <span>{course.lessonCount} lessons</span>
                    {course.enrolled ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="font-semibold tabular-nums text-brand">
                          {course.progressPercent}%
                        </span>
                      </>
                    ) : null}
                  </div>

                  {course.enrolled ? (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-subtle">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${course.progressPercent}%` }}
                      />
                    </div>
                  ) : null}

                  <Link
                    href={`/courses/${course.slug}`}
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    {course.enrolled
                      ? course.completedAt
                        ? "Review course"
                        : "Continue"
                      : "View course"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
