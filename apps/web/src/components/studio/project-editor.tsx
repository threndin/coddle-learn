"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PROJECT_LIMITS, SKILL_CATALOG } from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { LessonMarkdown } from "@/components/courses/lesson-markdown";
import {
  FieldLabel,
  LevelPicker,
  SkillPicker,
  inputClass,
} from "@/components/studio/course-fields";
import { StatusBadge } from "@/components/studio/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import {
  deleteStudioProject,
  runProjectLifecycle,
  updateStudioProject,
  type StudioProject,
  type StudioProjectOptions,
} from "@/lib/studio-projects";

export function ProjectEditor({
  initial,
  options,
}: {
  initial: StudioProject;
  options: StudioProjectOptions | null;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [project, setProject] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [body, setBody] = useState(initial.body);
  const [level, setLevel] = useState(initial.level);
  const [estimatedHours, setEstimatedHours] = useState(String(initial.estimatedHours));
  const [exampleImageUrl, setExampleImageUrl] = useState(initial.exampleImageUrl ?? "");
  const [checklist, setChecklist] = useState(
    initial.checklist.length > 0 ? initial.checklist : ["", "", ""],
  );
  const [skillSlugs, setSkillSlugs] = useState(initial.skills.map((skill) => skill.slug));
  const [primarySkillSlug, setPrimarySkillSlug] = useState(initial.primarySkillSlug);
  const [roadmapSlug, setRoadmapSlug] = useState(initial.path.roadmapSlug);
  const [roadmapStepSlug, setRoadmapStepSlug] = useState(initial.path.stepSlug ?? "");
  const [courseSlug, setCourseSlug] = useState(initial.course?.slug ?? "");
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preview, setPreview] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const canEdit = project.permissions.canEdit;

  const steps = useMemo(
    () => options?.roadmaps.find((item) => item.slug === roadmapSlug)?.steps ?? [],
    [options, roadmapSlug],
  );
  const skills = SKILL_CATALOG.filter((skill) => skillSlugs.includes(skill.slug));

  useEffect(() => {
    if (!canEdit) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persist();
    }, 700);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on field edits
  }, [
    title,
    summary,
    body,
    level,
    estimatedHours,
    exampleImageUrl,
    checklist,
    skillSlugs,
    primarySkillSlug,
    roadmapSlug,
    roadmapStepSlug,
    courseSlug,
    canEdit,
  ]);

  async function persist() {
    if (!canEdit) return;
    const trimmedTitle = title.trim();
    const trimmedSummary = summary.trim();
    if (
      trimmedTitle.length < PROJECT_LIMITS.titleMin ||
      trimmedSummary.length < PROJECT_LIMITS.summaryMin ||
      !primarySkillSlug ||
      skillSlugs.length === 0
    ) {
      return;
    }
    const hours = Number.parseInt(estimatedHours, 10);
    setSaving(true);
    try {
      const { project: next } = await updateStudioProject(project.id, {
        title: trimmedTitle,
        summary: trimmedSummary,
        body,
        level,
        estimatedHours: Number.isFinite(hours) ? hours : project.estimatedHours,
        exampleImageUrl: exampleImageUrl.trim() || null,
        checklist: checklist.map((item) => item.trim()).filter(Boolean),
        skillSlugs,
        primarySkillSlug,
        roadmapSlug,
        roadmapStepSlug: roadmapStepSlug || null,
        courseSlug: courseSlug || null,
      });
      setProject(next);
    } catch (error) {
      pushToast(errorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  async function lifecycle(action: "submit" | "withdraw" | "archive" | "restore") {
    setPendingAction(true);
    try {
      await persist();
      const { project: next } = await runProjectLifecycle(project.id, action);
      setProject(next);
      pushToast(
        action === "submit"
          ? next.status === "published"
            ? "Published to the catalog"
            : "Submitted for review"
          : action === "withdraw"
            ? "Withdrawn to draft"
            : action === "archive"
              ? "Archived"
              : "Restored",
        "success",
      );
      router.refresh();
    } catch (error) {
      pushToast(errorMessage(error), "error");
    } finally {
      setPendingAction(false);
    }
  }

  async function onDelete() {
    try {
      await deleteStudioProject(project.id);
      pushToast("Project deleted", "success");
      router.push("/studio/projects");
    } catch (error) {
      pushToast(errorMessage(error), "error");
    }
  }

  function onSkillsChange(next: string[]) {
    setSkillSlugs(next);
    if (!next.includes(primarySkillSlug)) setPrimarySkillSlug(next[0] ?? "");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/studio/projects"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            Studio projects
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {project.title}
            </h1>
            <StatusBadge status={project.status} size="md" />
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            {saving ? "Saving…" : "Saved"}
            {" · "}
            <span className="font-mono text-xs">{project.slug}</span>
            {project.status === "published" ? (
              <>
                {" · "}
                <Link href={`/projects/${project.slug}`} className="font-semibold text-brand">
                  View catalog
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {project.permissions.canSubmit ? (
            <button
              type="button"
              disabled={pendingAction}
              onClick={() => lifecycle("submit")}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {project.reviewMode === "auto" ? "Publish" : "Submit for review"}
            </button>
          ) : null}
          {project.permissions.canWithdraw ? (
            <button
              type="button"
              disabled={pendingAction}
              onClick={() => lifecycle("withdraw")}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink"
            >
              Withdraw
            </button>
          ) : null}
          {project.permissions.canArchive ? (
            <button
              type="button"
              disabled={pendingAction}
              onClick={() => lifecycle("archive")}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink"
            >
              Archive
            </button>
          ) : null}
          {project.permissions.canRestore ? (
            <button
              type="button"
              disabled={pendingAction}
              onClick={() => lifecycle("restore")}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink"
            >
              Restore
            </button>
          ) : null}
          {project.permissions.canDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 dark:border-rose-500/40 dark:text-rose-300"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>

      {project.reviewNote ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          Reviewer note: {project.reviewNote}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <FieldLabel htmlFor="edit-title" label="Title" count={title.length} max={PROJECT_LIMITS.titleMax} />
            <input
              id="edit-title"
              disabled={!canEdit}
              value={title}
              maxLength={PROJECT_LIMITS.titleMax}
              onChange={(event) => setTitle(event.target.value)}
              className={`${inputClass} font-semibold`}
            />
            <div className="mt-5">
              <FieldLabel
                htmlFor="edit-summary"
                label="Summary"
                count={summary.length}
                max={PROJECT_LIMITS.summaryMax}
              />
              <textarea
                id="edit-summary"
                disabled={!canEdit}
                value={summary}
                maxLength={PROJECT_LIMITS.summaryMax}
                rows={3}
                onChange={(event) => setSummary(event.target.value)}
                className={inputClass}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel
                htmlFor="edit-body"
                label="Requirements"
                hint="Markdown supported"
                count={body.length}
                max={PROJECT_LIMITS.bodyMax}
              />
              <button
                type="button"
                onClick={() => setPreview((prev) => !prev)}
                className="text-xs font-semibold text-brand"
              >
                {preview ? "Edit" : "Preview"}
              </button>
            </div>
            {preview ? (
              <div className="mt-2 min-h-64 rounded-xl border border-border bg-canvas p-4">
                <LessonMarkdown content={body || "_Nothing written yet._"} />
              </div>
            ) : (
              <textarea
                id="edit-body"
                disabled={!canEdit}
                value={body}
                maxLength={PROJECT_LIMITS.bodyMax}
                rows={18}
                onChange={(event) => setBody(event.target.value)}
                className={`${inputClass} mt-2 font-mono text-[13px] leading-relaxed`}
              />
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <FieldLabel
              label="Done checklist"
              hint="What learners will have after finishing"
            />
            <ul className="mt-3 space-y-2">
              {checklist.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <input
                    disabled={!canEdit}
                    value={item}
                    maxLength={PROJECT_LIMITS.checklistItemMax}
                    onChange={(event) => {
                      const next = [...checklist];
                      next[index] = event.target.value;
                      setChecklist(next);
                    }}
                    placeholder={`Checklist item ${index + 1}`}
                    className={inputClass}
                  />
                  {canEdit && checklist.length > 1 ? (
                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() => setChecklist(checklist.filter((_, i) => i !== index))}
                      className="rounded-xl border border-border px-3 text-ink-muted hover:text-ink"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            {canEdit && checklist.length < PROJECT_LIMITS.checklistMax ? (
              <button
                type="button"
                onClick={() => setChecklist([...checklist, ""])}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
              >
                <Icon name="plus" className="h-4 w-4" />
                Add item
              </button>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Ready to publish
            </p>
            <ul className="mt-3 space-y-2">
              {project.checklistReady.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-xs text-ink-muted">
                  <Icon
                    name={item.done ? "checkCircle" : "circle"}
                    className={`mt-0.5 h-3.5 w-3.5 ${item.done ? "text-brand" : ""}`}
                  />
                  <span className={item.done ? "text-ink" : ""}>{item.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4">
            <FieldLabel label="Level" />
            <LevelPicker
              value={level}
              onChange={setLevel}
              disabled={!canEdit}
              stacked
            />

            <label className="mt-4 block">
              <span className="text-xs font-semibold text-ink-muted">Estimated hours</span>
              <input
                disabled={!canEdit}
                type="number"
                min={PROJECT_LIMITS.estimatedHoursMin}
                max={PROJECT_LIMITS.estimatedHoursMax}
                value={estimatedHours}
                onChange={(event) => setEstimatedHours(event.target.value)}
                className={`${inputClass} mt-1.5`}
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-semibold text-ink-muted">Path</span>
              <select
                disabled={!canEdit}
                value={roadmapSlug}
                onChange={(event) => {
                  setRoadmapSlug(event.target.value);
                  setRoadmapStepSlug("");
                }}
                className={`${inputClass} mt-1.5`}
              >
                {(options?.roadmaps ?? []).map((roadmap) => (
                  <option key={roadmap.slug} value={roadmap.slug}>
                    {roadmap.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className="text-xs font-semibold text-ink-muted">Roadmap step (optional)</span>
              <select
                disabled={!canEdit}
                value={roadmapStepSlug}
                onChange={(event) => setRoadmapStepSlug(event.target.value)}
                className={`${inputClass} mt-1.5`}
              >
                <option value="">None</option>
                {steps.map((step) => (
                  <option key={step.slug} value={step.slug}>
                    {step.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className="text-xs font-semibold text-ink-muted">Related course (optional)</span>
              <select
                disabled={!canEdit}
                value={courseSlug}
                onChange={(event) => setCourseSlug(event.target.value)}
                className={`${inputClass} mt-1.5`}
              >
                <option value="">None</option>
                {(options?.courses ?? []).map((course) => (
                  <option key={course.slug} value={course.slug}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4">
            <FieldLabel label="Skills" />
            <SkillPicker
              value={skillSlugs}
              onChange={onSkillsChange}
              disabled={!canEdit}
              max={PROJECT_LIMITS.skillMax}
              footnote="Primary skill appears on the catalog card."
            />
            {skills.length > 0 ? (
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-ink-muted">Primary skill</span>
                <select
                  disabled={!canEdit}
                  value={primarySkillSlug}
                  onChange={(event) => setPrimarySkillSlug(event.target.value)}
                  className={`${inputClass} mt-1.5`}
                >
                  {skills.map((skill) => (
                    <option key={skill.slug} value={skill.slug}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4">
            <FieldLabel
              htmlFor="example-image"
              label="Example image"
              hint="Site path or https URL"
            />
            <input
              id="example-image"
              disabled={!canEdit}
              value={exampleImageUrl}
              onChange={(event) => setExampleImageUrl(event.target.value)}
              placeholder="/projects/single-page-cv.jpg"
              className={inputClass}
            />
            {exampleImageUrl ? (
              <div className="mt-3 aspect-[16/9] overflow-hidden rounded-xl border border-border bg-surface-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element -- seed/static SVG or arbitrary URL */}
                <img src={exampleImageUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : null}
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this project?"
        description="This cannot be undone."
        confirmLabel="Delete project"
        onConfirm={onDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
