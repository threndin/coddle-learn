"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { levelById, type CourseStatus } from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { StatusBadge } from "@/components/studio/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon, type IconName } from "@/components/ui/icon";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { Stars } from "@/components/ui/stars";
import { errorMessage } from "@/lib/api-client";
import { pluralize, timeAgo } from "@/lib/format";
import {
  deleteStudioCourse,
  runLifecycleAction,
  type StudioCourseList,
  type StudioCourseListItem,
} from "@/lib/studio";

type Tab = "all" | "drafts" | "in_review" | "published" | "archived";

const TABS: { id: Tab; label: string; statuses: CourseStatus[] }[] = [
  {
    id: "all",
    label: "All",
    statuses: ["draft", "changes_requested", "in_review", "published", "archived"],
  },
  { id: "drafts", label: "Drafts", statuses: ["draft", "changes_requested"] },
  { id: "in_review", label: "In review", statuses: ["in_review"] },
  { id: "published", label: "Published", statuses: ["published"] },
  { id: "archived", label: "Archived", statuses: ["archived"] },
];

export function StudioCourses({ initial }: { initial: StudioCourseList | null }) {
  const { pushToast } = useToast();
  const [courses, setCourses] = useState<StudioCourseListItem[]>(initial?.courses ?? []);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<StudioCourseListItem | null>(null);
  const reviewMode = initial?.reviewMode ?? "auto";

  const counts = useMemo(() => {
    const map = new Map<Tab, number>();
    for (const item of TABS) {
      map.set(item.id, courses.filter((course) => item.statuses.includes(course.status)).length);
    }
    return map;
  }, [courses]);

  const filtered = useMemo(() => {
    const statuses = TABS.find((item) => item.id === tab)!.statuses;
    const q = query.trim().toLowerCase();
    return courses.filter(
      (course) =>
        statuses.includes(course.status) &&
        (!q || course.title.toLowerCase().includes(q) || course.summary.toLowerCase().includes(q)),
    );
  }, [courses, query, tab]);

  const totals = useMemo(() => {
    const learners = courses.reduce((sum, course) => sum + course.enrolledCount, 0);
    const completions = courses.reduce((sum, course) => sum + course.completedCount, 0);
    const ratingCount = courses.reduce((sum, course) => sum + course.ratingCount, 0);
    const ratingSum = courses.reduce(
      (sum, course) => sum + course.ratingAverage * course.ratingCount,
      0,
    );
    return {
      published: courses.filter((course) => course.status === "published").length,
      learners,
      completions,
      rating: ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0,
      ratingCount,
    };
  }, [courses]);

  async function lifecycle(course: StudioCourseListItem, action: "archive" | "restore") {
    try {
      const { course: updated } = await runLifecycleAction(course.id, action);
      setCourses((prev) =>
        prev.map((item) =>
          item.id === course.id
            ? { ...item, status: updated.status, updatedAt: updated.updatedAt }
            : item,
        ),
      );
      pushToast(action === "archive" ? "Course archived" : "Course restored", "success");
    } catch (error) {
      pushToast(errorMessage(error), "error");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteStudioCourse(pendingDelete.id);
      setCourses((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      pushToast("Course deleted", "success");
      setPendingDelete(null);
    } catch (error) {
      pushToast(errorMessage(error), "error");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Studio
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Your courses
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">
            Draft courses, structure modules and lessons, and ship them to learners. Everything
            you write is saved as you go.
          </p>
        </div>
        <Link
          href="/studio/courses/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:brightness-110"
        >
          <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
          New course
        </Link>
      </div>

      {initial === null ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm text-ink-muted">
          Could not load your courses. Refresh to try again.
        </p>
      ) : courses.length === 0 ? (
        <EmptyStudio reviewMode={reviewMode} />
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon="book" label="Courses" value={courses.length.toLocaleString()} sub={`${totals.published} published`} />
            <StatTile icon="users" label="Learners" value={totals.learners.toLocaleString()} sub="enrolled across courses" />
            <StatTile icon="checkCircle" label="Completions" value={totals.completions.toLocaleString()} sub="learners finished" />
            <StatTile
              icon="star"
              label="Avg rating"
              value={totals.ratingCount ? totals.rating.toFixed(1) : "—"}
              sub={totals.ratingCount ? pluralize(totals.ratingCount, "review") : "No reviews yet"}
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    tab === item.id
                      ? "bg-brand text-white"
                      : "text-ink-muted hover:bg-surface-subtle hover:text-ink",
                  ].join(" ")}
                >
                  {item.label}
                  <span
                    className={[
                      "rounded-md px-1.5 font-mono text-[10px] tabular-nums",
                      tab === item.id ? "bg-white/20" : "bg-surface-subtle",
                    ].join(" ")}
                  >
                    {counts.get(item.id) ?? 0}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your courses"
                className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {filtered.map((course) => (
              <CourseRow
                key={course.id}
                course={course}
                onArchive={() => void lifecycle(course, "archive")}
                onRestore={() => void lifecycle(course, "restore")}
                onDelete={() => setPendingDelete(course)}
              />
            ))}
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted">
                No courses match this view.
              </div>
            ) : null}
          </div>

          <ReviewModeNote reviewMode={reviewMode} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this course?"
        description={
          <>
            <span className="font-semibold text-ink">{pendingDelete?.title}</span> and all of its
            modules and lessons will be permanently removed. This cannot be undone.
          </>
        }
        confirmLabel="Delete course"
        pendingLabel="Deleting…"
        tone="danger"
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: IconName;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-ink-muted">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold tabular-nums tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>
    </div>
  );
}

function CourseRow({
  course,
  onArchive,
  onRestore,
  onDelete,
}: {
  course: StudioCourseListItem;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const editHref = `/studio/courses/${course.id}`;
  const level = levelById(String(course.level))?.label ?? course.level;
  const live = course.status === "published" || course.status === "archived";
  const completion = course.enrolledCount
    ? Math.round((course.completedCount / course.enrolledCount) * 100)
    : 0;

  const items: MenuItem[] = [
    { label: "Edit course", icon: "pencil", href: editHref },
    {
      label: live ? "View as learner" : "Preview",
      icon: "eye",
      href: `/courses/${course.slug}`,
    },
  ];
  if (course.status === "published") {
    items.push("divider", { label: "Archive", icon: "archive", onSelect: onArchive });
  }
  if (course.status === "archived") {
    items.push("divider", { label: "Restore to catalog", icon: "undo", onSelect: onRestore });
  }
  if (!course.publishedAt) {
    items.push("divider", { label: "Delete", icon: "trash", tone: "danger", onSelect: onDelete });
  }

  return (
    <article className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-surface p-3 transition hover:border-border-strong hover:shadow-lg hover:shadow-ink/[0.03] sm:flex-row sm:items-center sm:p-4">
      <Link
        href={editHref}
        className="relative aspect-[1200/630] w-full shrink-0 overflow-hidden rounded-xl bg-surface-subtle sm:w-44"
      >
        {/* R2 thumbnails; hosts vary with CDN config. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={course.status} />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {level}
          </span>
        </div>
        <Link href={editHref} className="mt-1.5 block">
          <h2 className="truncate font-display text-lg font-bold tracking-tight text-ink group-hover:text-brand">
            {course.title}
          </h2>
        </Link>
        <p className="mt-0.5 line-clamp-1 text-sm text-ink-muted">
          {course.summary || "No summary yet."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="layers" className="h-3.5 w-3.5" />
            {pluralize(course.moduleCount, "module")}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="file" className="h-3.5 w-3.5" />
            {pluralize(course.lessonCount, "lesson")}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" className="h-3.5 w-3.5" />~{course.estimatedHours}h
          </span>
          <span>Edited {timeAgo(course.updatedAt)}</span>
        </div>
        {course.status === "changes_requested" && course.reviewNote ? (
          <p className="mt-2 line-clamp-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            <span className="font-semibold">Reviewer: </span>
            {course.reviewNote}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-5 border-t border-border pt-3 sm:border-0 sm:pt-0">
        {live ? (
          <div className="grid grid-cols-3 gap-5 text-center sm:text-right">
            <Metric label="Learners" value={course.enrolledCount.toLocaleString()} />
            <Metric label="Finished" value={`${completion}%`} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                Rating
              </p>
              {course.ratingCount ? (
                <div className="mt-1 flex items-center justify-center gap-1 sm:justify-end">
                  <Stars value={course.ratingAverage} size="xs" />
                  <span className="text-sm font-bold tabular-nums text-ink">
                    {course.ratingAverage.toFixed(1)}
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-sm font-bold text-ink-muted">—</p>
              )}
            </div>
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-border-strong hover:bg-surface-subtle"
          >
            <Icon name="pencil" className="h-3.5 w-3.5" />
            {course.status === "in_review" ? "Open" : "Edit"}
          </Link>
          <Menu items={items} />
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</p>
      <p className="mt-1 text-sm font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}

const FLOW: { icon: IconName; title: string; body: string }[] = [
  { icon: "pencil", title: "Draft", body: "Set the basics, then add modules and markdown lessons." },
  { icon: "eye", title: "Preview", body: "See exactly what learners will see before you ship." },
  { icon: "send", title: "Submit", body: "Run the checklist and send it for review." },
  { icon: "sparkle", title: "Publish", body: "Approved courses land in the catalog for everyone." },
];

function EmptyStudio({ reviewMode }: { reviewMode: "auto" | "manual" }) {
  return (
    <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="grid-bg relative px-6 py-12 text-center sm:px-10">
        <div className="brand-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-xl">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-xl shadow-brand/30">
            <Icon name="book" className="h-7 w-7" />
          </span>
          <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink">
            Teach what you know
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Courses on Coddle Learn are written by developers like you. Start with a title; you can
            shape the rest in the editor.
          </p>
          <Link
            href="/studio/courses/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:brightness-110"
          >
            <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
            Create your first course
          </Link>
        </div>
      </div>
      <ol className="grid border-t border-border sm:grid-cols-4">
        {FLOW.map((step, index) => (
          <li
            key={step.title}
            className="border-b border-border p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-semibold text-ink-muted">0{index + 1}</span>
              <Icon name={step.icon} className="h-4 w-4 text-brand" />
              <span className="text-sm font-semibold text-ink">{step.title}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
              {step.title === "Publish" && reviewMode === "auto"
                ? "Submitted courses publish right away while admin review is being built."
                : step.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReviewModeNote({ reviewMode }: { reviewMode: "auto" | "manual" }) {
  return (
    <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
      <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {reviewMode === "auto"
        ? "Submitted courses are published automatically for now. Moderator review is coming soon, and your published courses will stay live."
        : "Submitted courses are reviewed by a moderator before they appear in the catalog. You can withdraw a submission to keep editing."}
    </p>
  );
}
