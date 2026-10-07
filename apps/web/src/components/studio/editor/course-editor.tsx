"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  COURSE_LIMITS,
  COURSE_STATUS_META,
  EDITABLE_COURSE_STATUSES,
  SKILL_CATALOG,
  courseChecklist,
  estimatedHoursFromMinutes,
} from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { StatusBadge } from "@/components/studio/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { errorMessage } from "@/lib/api-client";
import { timeAgo } from "@/lib/format";
import {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  deleteStudioCourse,
  resetThumbnail,
  runLifecycleAction,
  saveOutline,
  updateLesson,
  updateModule,
  updateStudioCourse,
  uploadLessonImage,
  uploadThumbnail,
  type LifecycleAction,
  type StudioCourse,
  type StudioModule,
} from "@/lib/studio";
import { LessonPane, type LessonPatch } from "./lesson-pane";
import { ModulePane } from "./module-pane";
import { OutlinePanel } from "./outline-panel";
import { useSaveQueue, type SaveSnapshot } from "./save-queue";
import { SettingsPane, type CoursePatch } from "./settings-pane";
import type { EditorSelection } from "./types";

type Confirm =
  | { kind: "submit" }
  | { kind: "archive" }
  | { kind: "delete-course" }
  | { kind: "delete-module"; moduleId: string }
  | { kind: "delete-lesson"; lessonId: string };

function applyCoursePatch(course: StudioCourse, patch: Record<string, unknown>): StudioCourse {
  const { skillSlugs, ...rest } = patch as CoursePatch;
  const next = { ...course, ...rest };
  if (skillSlugs) {
    next.skills = skillSlugs
      .map((slug) => SKILL_CATALOG.find((skill) => skill.slug === slug))
      .filter((skill): skill is (typeof SKILL_CATALOG)[number] => Boolean(skill))
      .map((skill) => ({ slug: skill.slug, name: skill.name, category: skill.category }));
  }
  return next;
}

function initialSelection(
  course: StudioCourse,
  lessonId: string | null,
  moduleId: string | null,
): EditorSelection {
  if (lessonId && course.modules.some((m) => m.lessons.some((l) => l.id === lessonId))) {
    return { kind: "lesson", id: lessonId };
  }
  if (moduleId && course.modules.some((m) => m.id === moduleId)) {
    return { kind: "module", id: moduleId };
  }
  return { kind: "course" };
}

export function CourseEditor({
  initialCourse,
  initialLessonId,
  initialModuleId,
}: {
  initialCourse: StudioCourse;
  initialLessonId: string | null;
  initialModuleId: string | null;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const { queue, snapshot } = useSaveQueue();
  const [course, setCourse] = useState(initialCourse);
  const [selection, setSelection] = useState<EditorSelection>(() =>
    initialSelection(initialCourse, initialLessonId, initialModuleId),
  );
  const [focusLessonId, setFocusLessonId] = useState<string | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const courseId = course.id;

  const readOnly = !EDITABLE_COURSE_STATUSES.includes(course.status);
  const checklist = useMemo(
    () =>
      courseChecklist({
        title: course.title,
        summary: course.summary,
        skillCount: course.skills.length,
        modules: course.modules,
      }),
    [course.title, course.summary, course.skills.length, course.modules],
  );
  const ready = checklist.every((item) => item.done);
  const totalMinutes = course.modules.reduce(
    (sum, m) => sum + m.lessons.reduce((inner, l) => inner + l.estimatedMinutes, 0),
    0,
  );
  const canSubmit = course.status === "draft" || course.status === "changes_requested";
  const submitLabel = canSubmit
    ? course.reviewMode === "auto"
      ? "Publish course"
      : course.status === "changes_requested"
        ? "Resubmit for review"
        : "Submit for review"
    : null;

  /* ------------------------------ URL + unload ------------------------------ */

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("lesson");
    url.searchParams.delete("module");
    if (selection.kind === "lesson") url.searchParams.set("lesson", selection.id);
    if (selection.kind === "module") url.searchParams.set("module", selection.id);
    window.history.replaceState(null, "", url);
  }, [selection]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!queue.hasUnsaved()) return;
      void queue.flush();
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void queue.flush();
    };
  }, [queue]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void queue.flush();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [queue]);

  /* --------------------------- Server state merging -------------------------- */

  const overlayPending = useCallback(
    (next: StudioCourse): StudioCourse => {
      const coursePatch = queue.pending("course");
      const base = coursePatch ? applyCoursePatch(next, coursePatch) : next;
      return {
        ...base,
        modules: base.modules.map((m) => ({
          ...m,
          ...(queue.pending(`module:${m.id}`) ?? {}),
          lessons: m.lessons.map((l) => ({ ...l, ...(queue.pending(`lesson:${l.id}`) ?? {}) })),
        })),
      };
    },
    [queue],
  );

  const applyServer = useCallback(
    (next: StudioCourse) => setCourse(overlayPending(next)),
    [overlayPending],
  );

  /** Flush autosaves, then run a structural change and adopt the server result. */
  async function structural<T extends { course: StudioCourse }>(
    run: () => Promise<T>,
    success?: string,
  ): Promise<T | null> {
    setBusy(true);
    try {
      const flushed = await queue.flush();
      if (!flushed) {
        pushToast("Some changes could not be saved. Try again.", "error");
        return null;
      }
      const result = await run();
      applyServer(result.course);
      if (success) pushToast(success, "success");
      return result;
    } catch (error) {
      pushToast(errorMessage(error), "error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------- Field edits ------------------------------ */

  function patchCourse(patch: CoursePatch) {
    setCourse((prev) => applyCoursePatch(prev, patch));
    const toSave: CoursePatch = { ...patch };
    if (toSave.title !== undefined && toSave.title.trim().length < COURSE_LIMITS.titleMin) {
      delete toSave.title;
    }
    if (Object.keys(toSave).length === 0) return;
    queue.schedule("course", toSave, async (pending) => {
      const { course: saved } = await updateStudioCourse(courseId, pending as CoursePatch);
      setCourse((prev) => ({
        ...prev,
        slug: saved.slug,
        thumbnailUrl: saved.thumbnailUrl,
        customThumbnail: saved.customThumbnail,
        updatedAt: saved.updatedAt,
      }));
    });
  }

  function patchModule(moduleId: string, patch: Partial<{ title: string; summary: string }>) {
    setCourse((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => (m.id === moduleId ? { ...m, ...patch } : m)),
    }));
    const toSave = { ...patch };
    if (toSave.title !== undefined && !toSave.title.trim()) delete toSave.title;
    if (Object.keys(toSave).length === 0) return;
    queue.schedule(`module:${moduleId}`, toSave, async (pending) => {
      const { course: saved } = await updateModule(courseId, moduleId, pending);
      const savedModule = saved.modules.find((m) => m.id === moduleId);
      if (savedModule) {
        setCourse((prev) => ({
          ...prev,
          modules: prev.modules.map((m) =>
            m.id === moduleId ? { ...m, slug: savedModule.slug } : m,
          ),
        }));
      }
    });
  }

  function patchLesson(lessonId: string, patch: LessonPatch) {
    setCourse((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)),
      })),
    }));
    const toSave = { ...patch };
    if (toSave.title !== undefined && !toSave.title.trim()) delete toSave.title;
    if (Object.keys(toSave).length === 0) return;
    queue.schedule(
      `lesson:${lessonId}`,
      toSave,
      async (pending) => {
        const { lesson } = await updateLesson(courseId, lessonId, pending);
        setCourse((prev) => ({
          ...prev,
          modules: prev.modules.map((m) => ({
            ...m,
            lessons: m.lessons.map((l) =>
              l.id === lessonId ? { ...l, slug: lesson.slug, updatedAt: lesson.updatedAt } : l,
            ),
          })),
        }));
      },
      patch.content !== undefined ? 900 : 600,
    );
  }

  /* ------------------------------ Structure ------------------------------ */

  async function addModule(title: string) {
    const result = await structural(() => createModule(courseId, { title }));
    if (!result) return false;
    setSelection({ kind: "module", id: result.createdId });
    return true;
  }

  async function addLesson(moduleId: string, title: string) {
    const result = await structural(() => createLesson(courseId, moduleId, { title }));
    if (!result) return false;
    setSelection({ kind: "lesson", id: result.createdId });
    setOutlineOpen(false);
    return true;
  }

  async function addUntitledLesson(moduleId: string) {
    const result = await structural(() =>
      createLesson(courseId, moduleId, { title: "Untitled lesson" }),
    );
    if (!result) return;
    setFocusLessonId(result.createdId);
    setSelection({ kind: "lesson", id: result.createdId });
  }

  function reorder(next: StudioModule[]) {
    const previous = course.modules;
    setCourse((prev) => ({ ...prev, modules: next }));
    void (async () => {
      const result = await structural(() =>
        saveOutline(
          courseId,
          next.map((m) => ({ id: m.id, lessonIds: m.lessons.map((l) => l.id) })),
        ),
      );
      if (!result) setCourse((prev) => ({ ...prev, modules: previous }));
    })();
  }

  async function removeModule(moduleId: string) {
    const target = course.modules.find((m) => m.id === moduleId);
    queue.discard(`module:${moduleId}`);
    target?.lessons.forEach((l) => queue.discard(`lesson:${l.id}`));
    const result = await structural(() => deleteModule(courseId, moduleId), "Module deleted");
    if (result) setSelection({ kind: "course" });
  }

  async function removeLesson(lessonId: string) {
    const parent = course.modules.find((m) => m.lessons.some((l) => l.id === lessonId));
    queue.discard(`lesson:${lessonId}`);
    const result = await structural(() => deleteLesson(courseId, lessonId), "Lesson deleted");
    if (result && parent) setSelection({ kind: "module", id: parent.id });
  }

  /* ------------------------------ Lifecycle ------------------------------ */

  async function lifecycle(action: LifecycleAction) {
    const messages: Record<LifecycleAction, string> = {
      submit: course.reviewMode === "auto" ? "Course published" : "Submitted for review",
      withdraw: "Submission withdrawn. You can edit again.",
      archive: "Course archived",
      restore: "Course restored to the catalog",
    };
    await structural(() => runLifecycleAction(courseId, action), messages[action]);
  }

  async function removeCourse() {
    setBusy(true);
    try {
      await deleteStudioCourse(courseId);
      pushToast("Course deleted", "success");
      router.push("/studio/courses");
    } catch (error) {
      pushToast(errorMessage(error), "error");
      setBusy(false);
    }
  }

  async function openPreview() {
    await queue.flush();
    window.open(`/courses/${course.slug}`, "_blank", "noopener");
  }

  function requestSubmit() {
    if (!ready) {
      setSelection({ kind: "course" });
      pushToast("Finish the checklist before submitting.", "info");
      return;
    }
    setConfirm({ kind: "submit" });
  }

  const uploadImage = course.uploadsEnabled
    ? async (file: File) => (await uploadLessonImage(courseId, file)).url
    : undefined;

  /* --------------------------------- Panes --------------------------------- */

  const flatLessons = course.modules.flatMap((m) => m.lessons.map((l) => ({ module: m, lesson: l })));
  let pane: React.ReactNode = null;

  if (selection.kind === "lesson") {
    const index = flatLessons.findIndex((item) => item.lesson.id === selection.id);
    const current = flatLessons[index];
    if (current) {
      pane = (
        <LessonPane
          key={current.lesson.id}
          lesson={current.lesson}
          courseModule={current.module}
          lessonIndex={current.module.lessons.findIndex((l) => l.id === current.lesson.id)}
          readOnly={readOnly}
          autoFocusTitle={focusLessonId === current.lesson.id}
          previous={flatLessons[index - 1]?.lesson ?? null}
          next={flatLessons[index + 1]?.lesson ?? null}
          onNavigate={(id) => setSelection({ kind: "lesson", id })}
          onPatch={(patch) => patchLesson(current.lesson.id, patch)}
          onDelete={() => setConfirm({ kind: "delete-lesson", lessonId: current.lesson.id })}
          onUploadImage={uploadImage}
          onError={(message) => pushToast(message, "error")}
        />
      );
    }
  } else if (selection.kind === "module") {
    const index = course.modules.findIndex((m) => m.id === selection.id);
    const courseModule = course.modules[index];
    if (courseModule) {
      pane = (
        <ModulePane
          key={courseModule.id}
          courseModule={courseModule}
          index={index}
          total={course.modules.length}
          readOnly={readOnly}
          onPatch={(patch) => patchModule(courseModule.id, patch)}
          onOpenLesson={(id) => setSelection({ kind: "lesson", id })}
          onAddLesson={() => void addUntitledLesson(courseModule.id)}
          onDelete={() => setConfirm({ kind: "delete-module", moduleId: courseModule.id })}
        />
      );
    }
  }

  if (!pane) {
    pane = (
      <SettingsPane
        course={{ ...course, estimatedHours: estimatedHoursFromMinutes(totalMinutes) }}
        readOnly={readOnly}
        checklist={checklist}
        submitLabel={submitLabel}
        onPatch={patchCourse}
        onSubmit={requestSubmit}
        onUploadThumbnail={async (file) => {
          await structural(() => uploadThumbnail(courseId, file), "Cover updated");
        }}
        onResetThumbnail={async () => {
          await structural(() => resetThumbnail(courseId), "Using generated cover");
        }}
        onArchive={() => setConfirm({ kind: "archive" })}
        onRestore={() => void lifecycle("restore")}
        onDelete={() => setConfirm({ kind: "delete-course" })}
      />
    );
  }

  const moreItems: MenuItem[] = [
    { label: "Course details", icon: "settings", onSelect: () => setSelection({ kind: "course" }) },
    { label: "All courses", icon: "book", href: "/studio/courses" },
  ];
  if (course.permissions.canArchive) {
    moreItems.push("divider", { label: "Archive", icon: "archive", onSelect: () => setConfirm({ kind: "archive" }) });
  }
  if (course.permissions.canDelete) {
    moreItems.push("divider", {
      label: "Delete course",
      icon: "trash",
      tone: "danger",
      onSelect: () => setConfirm({ kind: "delete-course" }),
    });
  }

  const confirmModule =
    confirm?.kind === "delete-module" ? course.modules.find((m) => m.id === confirm.moduleId) : null;
  const confirmLesson =
    confirm?.kind === "delete-lesson"
      ? flatLessons.find((item) => item.lesson.id === confirm.lessonId)?.lesson
      : null;

  return (
    <div className="flex h-[calc(100svh-4rem)] flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-3 py-2.5 sm:px-5">
        <Link
          href="/studio/courses"
          aria-label="Back to Studio"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
        >
          <Icon name="arrowLeft" className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => setOutlineOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-ink lg:hidden"
        >
          <Icon name="layers" className="h-4 w-4" />
          Outline
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate font-display text-base font-bold tracking-tight text-ink">
              {course.title || "Untitled course"}
            </h1>
            <StatusBadge status={course.status} />
          </div>
          <SaveIndicator snapshot={snapshot} onRetry={() => void queue.flush()} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void openPreview()}
            className="hidden items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-surface-subtle sm:inline-flex"
          >
            <Icon name="eye" className="h-4 w-4" />
            {course.status === "published" ? "View live" : "Preview"}
          </button>
          {submitLabel ? (
            <button
              type="button"
              disabled={busy}
              onClick={requestSubmit}
              title={ready ? undefined : "Finish the checklist first"}
              className={[
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60",
                ready
                  ? "bg-brand text-white shadow-lg shadow-brand/20 hover:brightness-110"
                  : "bg-brand/60 text-white",
              ].join(" ")}
            >
              <Icon name="send" className="h-4 w-4" />
              <span className="hidden sm:inline">{submitLabel}</span>
              <span className="sm:hidden">{course.reviewMode === "auto" ? "Publish" : "Submit"}</span>
            </button>
          ) : null}
          {course.permissions.canWithdraw ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void lifecycle("withdraw")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:opacity-60"
            >
              <Icon name="undo" className="h-4 w-4" />
              Withdraw
            </button>
          ) : null}
          {course.permissions.canRestore ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void lifecycle("restore")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              <Icon name="undo" className="h-4 w-4" />
              Restore
            </button>
          ) : null}
          <Menu items={moreItems} />
        </div>
      </header>

      <StatusBanner course={course} />

      <div className="relative flex min-h-0 flex-1">
        <button
          type="button"
          aria-label="Close outline"
          aria-hidden={!outlineOpen}
          tabIndex={outlineOpen ? 0 : -1}
          onClick={() => setOutlineOpen(false)}
          className={[
            "absolute inset-0 z-20 bg-ink/30 backdrop-blur-[1px] transition-opacity lg:hidden",
            outlineOpen ? "opacity-100" : "pointer-events-none opacity-0",
          ].join(" ")}
        />
        <aside
          className={[
            "z-30 w-[19rem] shrink-0 border-r border-border bg-surface transition-transform duration-200",
            "max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:shadow-2xl",
            outlineOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
          ].join(" ")}
        >
          <OutlinePanel
            modules={course.modules}
            selection={selection}
            onSelect={(next) => {
              setSelection(next);
              setOutlineOpen(false);
            }}
            readOnly={readOnly || busy}
            checklistDone={checklist.filter((item) => item.done).length}
            checklistTotal={checklist.length}
            onReorder={reorder}
            onAddModule={addModule}
            onAddLesson={addLesson}
          />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto bg-surface-subtle">{pane}</main>
      </div>

      <ConfirmDialog
        open={confirm?.kind === "submit"}
        title={course.reviewMode === "auto" ? "Publish this course?" : "Submit for review?"}
        description={
          course.reviewMode === "auto"
            ? "It will appear in the course catalog for every learner right away. You can keep improving it after it's live."
            : "A moderator will check the course before it's published. Editing is paused while it's in review, and you can withdraw anytime."
        }
        confirmLabel={submitLabel ?? "Submit"}
        pendingLabel={course.reviewMode === "auto" ? "Publishing…" : "Submitting…"}
        onConfirm={async () => {
          await lifecycle("submit");
          setConfirm(null);
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === "archive"}
        title="Archive this course?"
        description="It will be hidden from the catalog. Learners who already started keep access and their progress. You can restore it anytime."
        confirmLabel="Archive"
        pendingLabel="Archiving…"
        onConfirm={async () => {
          await lifecycle("archive");
          setConfirm(null);
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === "delete-course"}
        title="Delete this course?"
        description="The draft and all of its modules and lessons will be permanently removed."
        confirmLabel="Delete course"
        pendingLabel="Deleting…"
        tone="danger"
        onConfirm={removeCourse}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === "delete-module"}
        title="Delete this module?"
        description={
          confirmModule ? (
            <>
              <span className="font-semibold text-ink">{confirmModule.title}</span>
              {confirmModule.lessons.length > 0
                ? ` and its ${confirmModule.lessons.length} lesson${confirmModule.lessons.length === 1 ? "" : "s"} will be removed.`
                : " will be removed."}
              {course.publishedAt ? " Learner progress on these lessons is lost." : ""}
            </>
          ) : null
        }
        confirmLabel="Delete module"
        pendingLabel="Deleting…"
        tone="danger"
        onConfirm={async () => {
          if (confirm?.kind === "delete-module") await removeModule(confirm.moduleId);
          setConfirm(null);
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === "delete-lesson"}
        title="Delete this lesson?"
        description={
          confirmLesson ? (
            <>
              <span className="font-semibold text-ink">{confirmLesson.title}</span> will be removed.
              {course.publishedAt ? " Learner progress on it is lost." : ""}
            </>
          ) : null
        }
        confirmLabel="Delete lesson"
        pendingLabel="Deleting…"
        tone="danger"
        onConfirm={async () => {
          if (confirm?.kind === "delete-lesson") await removeLesson(confirm.lessonId);
          setConfirm(null);
        }}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function SaveIndicator({ snapshot, onRetry }: { snapshot: SaveSnapshot; onRetry: () => void }) {
  const [, tick] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => tick((n) => n + 1), 30_000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  if (snapshot.status === "error") {
    return (
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
        <Icon name="alert" className="h-3 w-3" />
        <span className="truncate">{snapshot.error ?? "Could not save"}</span>
        <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
          Retry
        </button>
      </p>
    );
  }
  if (snapshot.status === "saving" || snapshot.status === "pending") {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
        <span className="h-2.5 w-2.5 animate-spin rounded-full border border-ink-muted border-t-transparent" />
        {snapshot.status === "saving" ? "Saving…" : "Unsaved changes"}
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
      <Icon name="checkCircle" className="h-3 w-3 text-emerald-500" />
      {snapshot.lastSavedAt ? `Saved ${timeAgo(new Date(snapshot.lastSavedAt))}` : "All changes saved"}
    </p>
  );
}

function StatusBanner({ course }: { course: StudioCourse }) {
  const meta = COURSE_STATUS_META[course.status];
  if (course.status === "draft") return null;

  const tone =
    course.status === "in_review"
      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
      : course.status === "changes_requested"
        ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
        : course.status === "published"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
          : "border-border bg-surface-subtle text-ink-muted";

  const message =
    course.status === "published"
      ? "This course is live. Changes save straight to what learners see."
      : course.status === "in_review" && course.submittedAt
        ? `${meta.description} Submitted ${timeAgo(course.submittedAt)}.`
        : meta.description;

  return (
    <div className={`shrink-0 border-b px-4 py-2 text-xs sm:px-6 ${tone}`}>
      <p className="flex items-start gap-2">
        <Icon
          name={course.status === "published" ? "checkCircle" : course.status === "archived" ? "archive" : "info"}
          className="mt-px h-3.5 w-3.5 shrink-0"
        />
        <span>
          <span className="font-semibold">{meta.label}. </span>
          {message}
          {course.status === "changes_requested" && course.reviewNote ? (
            <span className="mt-1 block rounded-lg bg-white/60 px-3 py-2 text-[13px] dark:bg-black/20">
              <span className="font-semibold">Reviewer note: </span>
              {course.reviewNote}
            </span>
          ) : null}
        </span>
      </p>
    </div>
  );
}
