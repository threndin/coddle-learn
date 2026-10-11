"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  EXPERIENCE_LEVELS,
  PROJECT_PATH_FILTERS,
  levelById,
} from "@coddle/shared";
import { Icon } from "@/components/ui/icon";
import type { ProjectCatalogItem } from "@/lib/projects";

type LevelFilter = "all" | "beginner" | "intermediate" | "advanced";
type ScopeFilter = "all" | "started" | "submitted";

const selectClass =
  "rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none";

export function ProjectsCatalog({
  initialProjects,
}: {
  initialProjects: ProjectCatalogItem[] | null;
}) {
  const [projects] = useState(initialProjects);
  const [path, setPath] = useState<string>("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [query, setQuery] = useState("");
  const [error] = useState(initialProjects ? null : "Could not load projects");

  const availablePaths = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of projects ?? []) {
      counts.set(item.path.roadmapSlug, (counts.get(item.path.roadmapSlug) ?? 0) + 1);
    }
    return PROJECT_PATH_FILTERS.filter(
      (item) => (counts.get(item.roadmapSlug) ?? 0) > 0 || path === item.roadmapSlug,
    ).map((item) => ({
      ...item,
      count: counts.get(item.roadmapSlug) ?? 0,
    }));
  }, [projects, path]);

  const filtered = useMemo(() => {
    if (!projects) return [];
    const needle = query.trim().toLowerCase();
    return projects.filter((item) => {
      if (path !== "all" && item.path.roadmapSlug !== path) return false;
      if (level !== "all" && item.level !== level) return false;
      if (scope === "started" && item.mySubmission?.status !== "started") return false;
      if (scope === "submitted" && item.mySubmission?.status !== "submitted") return false;
      if (!needle) return true;
      const haystack = [
        item.title,
        item.summary,
        item.primarySkillName,
        item.path.label,
        ...item.skills.map((skill) => skill.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [projects, path, level, scope, query]);

  const filtersActive = path !== "all" || level !== "all" || scope !== "all" || query.trim();

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Projects
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Build along your path
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">
            Guided projects from beginner to advanced. Start a project, ship a repo or live URL,
            and keep a trail of what you built.
          </p>
        </div>
        <Link
          href="/studio/projects/new"
          className="group inline-flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 transition hover:border-brand/40 hover:bg-brand-soft/40"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
            <Icon name="plus" className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink">Contribute a project</span>
            <span className="block text-xs text-ink-muted">Create projects in Studio</span>
          </span>
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1 sm:max-w-xs">
          <span className="sr-only">Search projects</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </label>

        <label className="sr-only" htmlFor="project-path">
          Path
        </label>
        <select
          id="project-path"
          value={path}
          onChange={(event) => setPath(event.target.value)}
          className={selectClass}
        >
          <option value="all">All paths</option>
          {availablePaths.map((item) => (
            <option key={item.roadmapSlug} value={item.roadmapSlug}>
              {item.label} ({item.count})
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="project-level">
          Level
        </label>
        <select
          id="project-level"
          value={level}
          onChange={(event) => setLevel(event.target.value as LevelFilter)}
          className={selectClass}
        >
          <option value="all">All levels</option>
          {EXPERIENCE_LEVELS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="project-scope">
          Progress
        </label>
        <select
          id="project-scope"
          value={scope}
          onChange={(event) => setScope(event.target.value as ScopeFilter)}
          className={selectClass}
        >
          <option value="all">All progress</option>
          <option value="started">In progress</option>
          <option value="submitted">Submitted</option>
        </select>

        {filtersActive ? (
          <button
            type="button"
            onClick={() => {
              setPath("all");
              setLevel("all");
              setScope("all");
              setQuery("");
            }}
            className="rounded-xl px-3 py-2.5 text-xs font-semibold text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
          >
            Clear
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm text-ink-muted">
          {error}
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm text-ink-muted">
          No projects match these filters.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <ProjectCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ item }: { item: ProjectCatalogItem }) {
  const level = levelById(item.level);
  return (
    <Link
      href={`/projects/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-brand/40 hover:shadow-md hover:shadow-brand/5"
    >
      {item.exampleImageUrl ? (
        <div className="aspect-[16/9] overflow-hidden border-b border-border bg-surface-subtle">
          {/* eslint-disable-next-line @next/next/no-img-element -- local seed photos or arbitrary URLs */}
          <img
            src={item.exampleImageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
            {level?.label ?? item.level}
          </span>
          <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
            {item.primarySkillName}
          </span>
        </div>
        <h2 className="mt-3 font-display text-xl font-bold tracking-tight text-ink group-hover:text-brand">
          {item.title}
        </h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{item.summary}</p>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="users" className="h-3.5 w-3.5" />
            {item.startedCount.toLocaleString()} started
          </span>
          <span className="font-semibold text-ink">{item.path.label}</span>
        </div>
        {item.mySubmission ? (
          <p className="mt-3 text-xs font-semibold text-brand">
            {item.mySubmission.status === "submitted" ? "Submitted" : "In progress"}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
