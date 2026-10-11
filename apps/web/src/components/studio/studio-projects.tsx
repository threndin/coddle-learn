"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { levelById, type ProjectStatus } from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { StatusBadge } from "@/components/studio/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { errorMessage } from "@/lib/api-client";
import { pluralize, timeAgo } from "@/lib/format";
import {
  deleteStudioProject,
  runProjectLifecycle,
  type StudioProjectList,
  type StudioProjectListItem,
} from "@/lib/studio-projects";

type Tab = "all" | "drafts" | "in_review" | "published" | "archived";

const TABS: { id: Tab; label: string; statuses: ProjectStatus[] }[] = [
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

export function StudioProjects({ initial }: { initial: StudioProjectList | null }) {
  const { pushToast } = useToast();
  const [projects, setProjects] = useState<StudioProjectListItem[]>(initial?.projects ?? []);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<StudioProjectListItem | null>(null);
  const reviewMode = initial?.reviewMode ?? "auto";

  const counts = useMemo(() => {
    const map = new Map<Tab, number>();
    for (const item of TABS) {
      map.set(item.id, projects.filter((project) => item.statuses.includes(project.status)).length);
    }
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    const statuses = TABS.find((item) => item.id === tab)!.statuses;
    const q = query.trim().toLowerCase();
    return projects.filter(
      (project) =>
        statuses.includes(project.status) &&
        (!q ||
          project.title.toLowerCase().includes(q) ||
          project.summary.toLowerCase().includes(q)),
    );
  }, [projects, query, tab]);

  async function lifecycle(project: StudioProjectListItem, action: "archive" | "restore") {
    try {
      const { project: updated } = await runProjectLifecycle(project.id, action);
      setProjects((prev) =>
        prev.map((item) =>
          item.id === project.id
            ? { ...item, status: updated.status, updatedAt: updated.updatedAt }
            : item,
        ),
      );
      pushToast(action === "archive" ? "Project archived" : "Project restored", "success");
    } catch (error) {
      pushToast(errorMessage(error), "error");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteStudioProject(pendingDelete.id);
      setProjects((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      pushToast("Project deleted", "success");
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
            Your projects
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">
            Author guided projects for a learning path. Learners start them, build offline, and
            submit repo or live links.
          </p>
        </div>
        <Link
          href="/studio/projects/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:brightness-110"
        >
          <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
          New project
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href="/studio" className="text-ink-muted hover:text-ink">
          Studio home
        </Link>
        <span className="text-ink-muted">/</span>
        <span className="font-semibold text-ink">Projects</span>
        <span className="text-ink-muted">·</span>
        <Link href="/studio/courses" className="text-brand hover:underline">
          Courses
        </Link>
      </div>

      {initial === null ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm text-ink-muted">
          Could not load your projects. Refresh to try again.
        </p>
      ) : projects.length === 0 ? (
        <EmptyStudio reviewMode={reviewMode} />
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    tab === item.id
                      ? "bg-brand text-white"
                      : "border border-border bg-surface text-ink-muted hover:border-border-strong",
                  ].join(" ")}
                >
                  {item.label}
                  <span className="ml-1.5 opacity-70">{counts.get(item.id) ?? 0}</span>
                </button>
              ))}
            </div>
            <label className="relative min-w-56">
              <span className="sr-only">Search</span>
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your projects"
                className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm focus:border-brand focus:outline-none"
              />
            </label>
          </div>

          <ul className="mt-6 space-y-3">
            {filtered.map((project) => {
              const level = levelById(project.level);
              const menu: MenuItem[] = [
                {
                  label: "Open editor",
                  href: `/studio/projects/${project.id}`,
                },
                ...(project.status === "published"
                  ? [
                      {
                        label: "View in catalog",
                        href: `/projects/${project.slug}`,
                      } satisfies MenuItem,
                      {
                        label: "Archive",
                        onSelect: () => lifecycle(project, "archive"),
                      } satisfies MenuItem,
                    ]
                  : []),
                ...(project.status === "archived"
                  ? [
                      {
                        label: "Restore",
                        onSelect: () => lifecycle(project, "restore"),
                      } satisfies MenuItem,
                    ]
                  : []),
                ...(project.status === "draft" ||
                project.status === "changes_requested" ||
                project.status === "archived"
                  ? [
                      {
                        label: "Delete",
                        tone: "danger" as const,
                        onSelect: () => setPendingDelete(project),
                      } satisfies MenuItem,
                    ]
                  : []),
              ];

              return (
                <li
                  key={project.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/studio/projects/${project.id}`}
                        className="font-display text-lg font-bold tracking-tight text-ink hover:text-brand"
                      >
                        {project.title}
                      </Link>
                      <StatusBadge status={project.status} />
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-ink-muted">{project.summary}</p>
                    <p className="mt-2 text-xs text-ink-muted">
                      {project.path.label}
                      {" · "}
                      {level?.label ?? project.level}
                      {" · "}
                      {pluralize(project.startedCount, "start")}
                      {" · "}
                      updated {timeAgo(project.updatedAt)}
                    </p>
                  </div>
                  <Menu items={menu} label="Project actions" />
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this project?"
        description="This permanently removes the draft. Learner submissions on published projects are blocked until you archive instead."
        confirmLabel="Delete project"
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

function EmptyStudio({ reviewMode }: { reviewMode: "auto" | "manual" }) {
  return (
    <div className="mt-10 rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <p className="font-display text-2xl font-bold tracking-tight text-ink">
        No projects yet
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
        Start with a title, path, and primary skill. Then write requirements, a done checklist,
        and an example image.
        {reviewMode === "auto"
          ? " Submitting publishes immediately while moderator review is off."
          : " Submitting sends the project to review."}
      </p>
      <Link
        href="/studio/projects/new"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
      >
        <Icon name="plus" className="h-4 w-4" />
        New project
      </Link>
    </div>
  );
}
