"use client";

import { useRef, useState } from "react";
import { COURSE_LIMITS, type CourseChecklistItem } from "@coddle/shared";
import {
  AccentPicker,
  CoverPreview,
  FieldLabel,
  LevelPicker,
  SkillPicker,
  inputClass,
} from "@/components/studio/course-fields";
import { Icon } from "@/components/ui/icon";
import { Stars } from "@/components/ui/stars";
import { formatDate } from "@/lib/format";
import type { StudioCourse } from "@/lib/studio";

export type CoursePatch = Partial<{
  title: string;
  summary: string;
  level: string;
  accent: string;
  skillSlugs: string[];
}>;

export function SettingsPane({
  course,
  readOnly,
  checklist,
  submitLabel,
  onPatch,
  onSubmit,
  onUploadThumbnail,
  onResetThumbnail,
  onArchive,
  onRestore,
  onDelete,
}: {
  course: StudioCourse;
  readOnly: boolean;
  checklist: CourseChecklistItem[];
  submitLabel: string | null;
  onPatch: (patch: CoursePatch) => void;
  onSubmit: () => void;
  onUploadThumbnail: (file: File) => Promise<void>;
  onResetThumbnail: () => Promise<void>;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const titleTooShort = course.title.trim().length < COURSE_LIMITS.titleMin;
  const done = checklist.filter((item) => item.done).length;
  const ready = done === checklist.length;
  const live = course.status === "published" || course.status === "archived";
  const completion = course.stats.enrolledCount
    ? Math.round((course.stats.completedCount / course.stats.enrolledCount) * 100)
    : 0;

  async function withCover(run: () => Promise<void>) {
    setCoverBusy(true);
    try {
      await run();
    } finally {
      setCoverBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <div className="max-w-2xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Course details
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
          How learners discover this course
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          The title, summary, level, and skills show on the catalog card and course page.
        </p>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <FieldLabel
              htmlFor="settings-title"
              label="Title"
              count={course.title.length}
              max={COURSE_LIMITS.titleMax}
            />
            <input
              id="settings-title"
              value={course.title}
              disabled={readOnly}
              maxLength={COURSE_LIMITS.titleMax}
              onChange={(event) => onPatch({ title: event.target.value })}
              className={`${inputClass} text-base font-semibold ${titleTooShort ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10" : ""}`}
            />
            {titleTooShort ? (
              <p className="mt-1.5 text-xs text-rose-600">
                Titles need at least {COURSE_LIMITS.titleMin} characters. This change is not saved
                yet.
              </p>
            ) : !course.publishedAt ? (
              <p className="mt-1.5 font-mono text-[11px] text-ink-muted">
                learn.coddle.dev/courses/{course.slug}
              </p>
            ) : null}

            <div className="mt-5">
              <FieldLabel
                htmlFor="settings-summary"
                label="Summary"
                hint={`At least ${COURSE_LIMITS.summaryMin} characters before submitting.`}
                count={course.summary.length}
                max={COURSE_LIMITS.summaryMax}
              />
              <textarea
                id="settings-summary"
                rows={3}
                value={course.summary}
                disabled={readOnly}
                maxLength={COURSE_LIMITS.summaryMax}
                onChange={(event) => onPatch({ summary: event.target.value })}
                className={`${inputClass} resize-none leading-relaxed`}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <FieldLabel label="Level" />
            <LevelPicker
              value={String(course.level)}
              disabled={readOnly}
              onChange={(level) => onPatch({ level })}
            />
            <div className="mt-6">
              <FieldLabel label="Skills" />
              <SkillPicker
                value={course.skills.map((skill) => skill.slug)}
                disabled={readOnly}
                onChange={(skillSlugs) => onPatch({ skillSlugs })}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <FieldLabel
              label="Cover"
              hint="Shown on the catalog card and course header. 1200×630 works best."
            />
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start">
              <div className="relative">
                <CoverPreview
                  title={course.title}
                  level={String(course.level)}
                  accent={course.accent}
                  imageUrl={course.customThumbnail ? course.thumbnailUrl : null}
                  className="border border-border"
                />
                {coverBusy ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/70 backdrop-blur-sm">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                  </div>
                ) : null}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-ink">
                    {course.customThumbnail ? "Custom image" : "Generated cover"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {course.customThumbnail
                      ? "Switch back to a generated cover anytime."
                      : "Updates automatically with your title, level, and accent."}
                  </p>
                </div>
                {!course.customThumbnail ? (
                  <AccentPicker
                    value={course.accent}
                    disabled={readOnly}
                    onChange={(accent) => onPatch({ accent })}
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={readOnly || coverBusy || !course.uploadsEnabled}
                    title={course.uploadsEnabled ? undefined : "Uploads are not configured on this server"}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink transition hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name="upload" className="h-3.5 w-3.5" />
                    Upload image
                  </button>
                  {course.customThumbnail ? (
                    <button
                      type="button"
                      disabled={readOnly || coverBusy}
                      onClick={() => void withCover(onResetThumbnail)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-ink-muted transition hover:bg-surface-subtle hover:text-ink disabled:opacity-50"
                    >
                      <Icon name="sparkle" className="h-3.5 w-3.5" />
                      Use generated
                    </button>
                  ) : null}
                </div>
                <p className="text-[11px] text-ink-muted">PNG, JPEG, WebP, or GIF up to 3 MB.</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void withCover(() => onUploadThumbnail(file));
                  }}
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">
                {live ? "Content checklist" : "Ready to submit?"}
              </p>
              <span
                className={[
                  "rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums",
                  ready
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "bg-surface-subtle text-ink-muted",
                ].join(" ")}
              >
                {done}/{checklist.length}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-subtle">
              <div
                className={`h-full rounded-full transition-all duration-500 ${ready ? "bg-emerald-500" : "bg-brand"}`}
                style={{ width: `${(done / checklist.length) * 100}%` }}
              />
            </div>
            <ul className="mt-4 space-y-2.5">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-start gap-2.5 text-[13px]">
                  <Icon
                    name={item.done ? "checkCircle" : "circle"}
                    className={`mt-px h-4 w-4 shrink-0 ${item.done ? "text-emerald-500" : "text-border-strong"}`}
                  />
                  <span className={item.done ? "text-ink-muted line-through decoration-ink-muted/40" : "text-ink"}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
            {submitLabel ? (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!ready || readOnly}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="send" className="h-4 w-4" />
                {submitLabel}
              </button>
            ) : null}
          </section>

          {live ? (
            <section className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-sm font-semibold text-ink">Insights</p>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <Stat label="Learners" value={course.stats.enrolledCount.toLocaleString()} />
                <Stat label="Completion" value={`${completion}%`} />
                <div className="col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                    Rating
                  </dt>
                  <dd className="mt-1 flex items-center gap-2">
                    {course.stats.ratingCount ? (
                      <>
                        <span className="font-display text-xl font-extrabold tabular-nums text-ink">
                          {course.stats.ratingAverage.toFixed(1)}
                        </span>
                        <Stars value={course.stats.ratingAverage} />
                        <span className="text-xs text-ink-muted">
                          ({course.stats.ratingCount})
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-ink-muted">No reviews yet</span>
                    )}
                  </dd>
                </div>
              </dl>
              {course.publishedAt ? (
                <p className="mt-4 border-t border-border pt-3 text-xs text-ink-muted">
                  Published {formatDate(course.publishedAt)}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm font-semibold text-ink">Manage course</p>
            <div className="mt-3 space-y-2">
              {course.permissions.canArchive ? (
                <DangerRow
                  icon="archive"
                  title="Archive course"
                  body="Hide it from the catalog. Enrolled learners keep access."
                  action="Archive"
                  onClick={onArchive}
                />
              ) : null}
              {course.permissions.canRestore ? (
                <DangerRow
                  icon="undo"
                  title="Restore to catalog"
                  body="Make this course discoverable again."
                  action="Restore"
                  onClick={onRestore}
                  tone="default"
                />
              ) : null}
              {course.permissions.canDelete ? (
                <DangerRow
                  icon="trash"
                  title="Delete course"
                  body="Permanently remove the draft and all of its lessons."
                  action="Delete"
                  onClick={onDelete}
                />
              ) : null}
              {!course.permissions.canArchive &&
              !course.permissions.canRestore &&
              !course.permissions.canDelete ? (
                <p className="text-xs text-ink-muted">No actions available while in review.</p>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</dt>
      <dd className="mt-1 font-display text-xl font-extrabold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function DangerRow({
  icon,
  title,
  body,
  action,
  onClick,
  tone = "danger",
}: {
  icon: "archive" | "trash" | "undo";
  title: string;
  body: string;
  action: string;
  onClick: () => void;
  tone?: "danger" | "default";
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-3">
      <Icon
        name={icon}
        className={`mt-0.5 h-4 w-4 shrink-0 ${tone === "danger" ? "text-rose-500" : "text-brand"}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{body}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={[
          "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
          tone === "danger"
            ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            : "text-brand hover:bg-brand-soft",
        ].join(" ")}
      >
        {action}
      </button>
    </div>
  );
}
