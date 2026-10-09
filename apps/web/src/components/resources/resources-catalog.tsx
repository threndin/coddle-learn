"use client";

import { useEffect, useRef, useState } from "react";
import {
  EXPERIENCE_LEVELS,
  RESOURCE_LIMITS,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  type ExperienceLevel,
  type ResourceScope,
  type ResourceSort,
} from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { ResourceCard } from "@/components/resources/resource-card";
import { SubmitResourceDialog } from "@/components/resources/submit-resource-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import {
  DEFAULT_RESOURCE_FILTERS,
  deleteResource,
  fetchResources,
  resourceQueryString,
  setResourceBookmark,
  type ResourceCatalog,
  type ResourceFilters,
  type ResourceItem,
} from "@/lib/resources";

const SEARCH_DEBOUNCE_MS = 250;

const selectClass =
  "rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none";

function chipClass(active: boolean) {
  return [
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
    active
      ? "bg-brand text-white"
      : "border border-border bg-surface text-ink-muted hover:border-border-strong",
  ].join(" ");
}

export function ResourcesCatalog({
  initialFilters,
  initialCatalog,
}: {
  initialFilters: ResourceFilters;
  initialCatalog: ResourceCatalog | null;
}) {
  const { pushToast } = useToast();
  const [filters, setFilters] = useState<ResourceFilters>(initialFilters);
  const [queryInput, setQueryInput] = useState(initialFilters.q);
  const [catalog, setCatalog] = useState<ResourceCatalog | null>(initialCatalog);
  const [items, setItems] = useState<ResourceItem[]>(initialCatalog?.resources ?? []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(
    initialCatalog ? null : "Could not load resources",
  );
  const [submitOpen, setSubmitOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ResourceItem | null>(null);
  const loadedKey = useRef(resourceQueryString(initialFilters));

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((prev) => (prev.q === queryInput ? prev : { ...prev, q: queryInput }));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [queryInput]);

  useEffect(() => {
    const key = resourceQueryString(filters);
    if (key === loadedKey.current) return;
    window.history.replaceState(null, "", key ? `/resources?${key}` : "/resources");

    const controller = new AbortController();
    setLoading(true);
    fetchResources(filters, 1, controller.signal)
      .then((next) => {
        loadedKey.current = key;
        setCatalog(next);
        setItems(next.resources);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(err, "Could not load resources"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters]);

  function update(patch: Partial<ResourceFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function clearFilters() {
    setQueryInput("");
    setFilters((prev) => ({ ...DEFAULT_RESOURCE_FILTERS, scope: prev.scope, sort: prev.sort }));
  }

  function clearFacets() {
    setFilters((prev) => ({ ...prev, type: null, level: null, skill: null }));
  }

  async function loadMore() {
    if (!catalog || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchResources(filters, catalog.page + 1);
      setCatalog(next);
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...next.resources.filter((item) => !seen.has(item.id))];
      });
    } catch (err) {
      pushToast(errorMessage(err, "Could not load more resources"), "error");
    } finally {
      setLoadingMore(false);
    }
  }

  function patchItem(id: string, patch: Partial<ResourceItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function adjustSaved(delta: number) {
    setCatalog((prev) =>
      prev ? { ...prev, counts: { ...prev.counts, saved: Math.max(0, prev.counts.saved + delta) } } : prev,
    );
  }

  async function toggleBookmark(resource: ResourceItem) {
    const next = !resource.bookmarked;
    patchItem(resource.id, {
      bookmarked: next,
      bookmarkCount: Math.max(0, resource.bookmarkCount + (next ? 1 : -1)),
    });
    adjustSaved(next ? 1 : -1);
    try {
      const result = await setResourceBookmark(resource.id, next);
      patchItem(resource.id, result);
      pushToast(next ? "Saved to your resources" : "Removed from saved", "success");
    } catch (err) {
      patchItem(resource.id, {
        bookmarked: resource.bookmarked,
        bookmarkCount: resource.bookmarkCount,
      });
      adjustSaved(next ? -1 : 1);
      pushToast(errorMessage(err, "Could not update bookmark"), "error");
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    try {
      await deleteResource(removeTarget.id);
      const removed = removeTarget;
      setItems((prev) => prev.filter((item) => item.id !== removed.id));
      setCatalog((prev) =>
        prev
          ? {
              ...prev,
              total: Math.max(0, prev.total - 1),
              counts: {
                saved: Math.max(0, prev.counts.saved - (removed.bookmarked ? 1 : 0)),
                mine: Math.max(0, prev.counts.mine - 1),
              },
            }
          : prev,
      );
      setRemoveTarget(null);
      pushToast("Resource removed", "success");
    } catch (err) {
      pushToast(errorMessage(err, "Could not remove resource"), "error");
    }
  }

  function handleSubmitted(resource: ResourceItem) {
    setSubmitOpen(false);
    pushToast(
      resource.status === "published"
        ? "Thanks! Your resource is live."
        : "Thanks! Your resource is waiting for review.",
      "success",
    );
    setQueryInput("");
    loadedKey.current = "";
    setFilters({ ...DEFAULT_RESOURCE_FILTERS, scope: "mine", sort: "newest" });
  }

  const hasFilters = Boolean(filters.q || filters.type || filters.level || filters.skill);
  const facetCount = [filters.type, filters.level, filters.skill].filter(Boolean).length;
  const typeTotal = catalog
    ? RESOURCE_TYPES.reduce((sum, type) => sum + (catalog.typeCounts[type] ?? 0), 0)
    : 0;

  const scopes: [ResourceScope, string, number | null][] = [
    ["all", "All", null],
    ["saved", "Saved", catalog?.counts.saved ?? null],
    ["mine", "Mine", catalog?.counts.mine ?? null],
  ];

  const activeFacets: { key: "type" | "level" | "skill"; label: string }[] = [];
  if (filters.type) {
    activeFacets.push({ key: "type", label: RESOURCE_TYPE_LABELS[filters.type] });
  }
  if (filters.level) {
    const levelLabel =
      EXPERIENCE_LEVELS.find((level) => level.id === filters.level)?.label ?? filters.level;
    activeFacets.push({ key: "level", label: levelLabel });
  }
  if (filters.skill) {
    const skillLabel =
      catalog?.skills.find((skill) => skill.slug === filters.skill)?.name ?? filters.skill;
    activeFacets.push({ key: "skill", label: skillLabel });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Resources
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Docs, articles, videos, courses, and tools picked by the community and wired into
            roadmap steps. Save what you&apos;ll come back to.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSubmitOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          <Icon name="plus" className="h-4 w-4" />
          Share
        </button>
      </div>

      <div className="relative mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-xl border border-border bg-surface p-0.5"
            role="tablist"
            aria-label="Resource lists"
          >
            {scopes.map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filters.scope === id}
                onClick={() => update({ scope: id })}
                className={[
                  "inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition",
                  filters.scope === id
                    ? "bg-brand text-white"
                    : "text-ink-muted hover:text-ink",
                ].join(" ")}
              >
                {label}
                {count !== null ? (
                  <span className="tabular-nums opacity-80">{count}</span>
                ) : null}
              </button>
            ))}
          </div>

          <label className="relative min-w-48 flex-1 sm:min-w-56">
            <span className="sr-only">Search resources</span>
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={queryInput}
              maxLength={RESOURCE_LIMITS.queryMax}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Search resources"
              className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted/80 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
            />
          </label>

          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className={[
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
              filtersOpen || facetCount > 0
                ? "border-brand/40 bg-brand-soft text-brand"
                : "border-border bg-surface text-ink hover:border-border-strong",
            ].join(" ")}
          >
            <Icon name="filter" className="h-4 w-4" />
            Filters
            {facetCount > 0 ? (
              <span className="rounded-md bg-brand px-1.5 py-0.5 text-[11px] tabular-nums text-white">
                {facetCount}
              </span>
            ) : null}
          </button>
        </div>

        {!filtersOpen && activeFacets.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {activeFacets.map((facet) => (
              <button
                key={facet.key}
                type="button"
                onClick={() => update({ [facet.key]: null })}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink transition hover:border-border-strong"
              >
                {facet.label}
                <Icon name="x" className="h-3 w-3 text-ink-muted" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearFacets}
              className="text-[11px] font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Clear
            </button>
          </div>
        ) : null}

        {filtersOpen ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-border bg-surface p-4 shadow-lg sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Filters
              </p>
              <div className="flex items-center gap-3">
                {facetCount > 0 ? (
                  <button
                    type="button"
                    onClick={clearFacets}
                    className="text-xs font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                  >
                    Clear
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Close filters"
                  className="rounded-lg p-1 text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => update({ type: null })}
                className={chipClass(!filters.type)}
              >
                All types
                {catalog ? <span className="tabular-nums opacity-70">{typeTotal}</span> : null}
              </button>
              {RESOURCE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => update({ type: filters.type === type ? null : type })}
                  className={chipClass(filters.type === type)}
                >
                  {RESOURCE_TYPE_LABELS[type]}
                  {catalog ? (
                    <span className="tabular-nums opacity-70">{catalog.typeCounts[type] ?? 0}</span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                Technology
                <select
                  value={filters.skill ?? ""}
                  onChange={(event) => update({ skill: event.target.value || null })}
                  className={selectClass}
                >
                  <option value="">Any</option>
                  {(catalog?.skills ?? []).map((skill) => (
                    <option key={skill.slug} value={skill.slug}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                Level
                <select
                  value={filters.level ?? ""}
                  onChange={(event) =>
                    update({ level: (event.target.value || null) as ExperienceLevel | null })
                  }
                  className={selectClass}
                >
                  <option value="">Any</option>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                Sort
                <select
                  value={filters.sort}
                  onChange={(event) => update({ sort: event.target.value as ResourceSort })}
                  className={selectClass}
                >
                  <option value="popular">Most saved</option>
                  <option value="newest">Newest</option>
                  <option value="title">A–Z</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-5 text-sm text-ink-muted">
          {error}
        </p>
      ) : null}

      {catalog && !error ? (
        <p className="mt-4 text-xs text-ink-muted" aria-live="polite">
          {loading
            ? "Searching…"
            : `${catalog.total} ${catalog.total === 1 ? "resource" : "resources"}`}
        </p>
      ) : null}

      {catalog && !error && items.length === 0 && !loading ? (
        <EmptyState
          scope={filters.scope}
          query={filters.q}
          hasFilters={hasFilters}
          onClear={clearFilters}
          onBrowse={() => update({ scope: "all" })}
          onShare={() => setSubmitOpen(true)}
        />
      ) : null}

      {items.length > 0 ? (
        <div
          className={[
            "mt-3 grid gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
            loading ? "opacity-60" : "",
          ].join(" ")}
        >
          {items.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onToggleBookmark={(item) => void toggleBookmark(item)}
              onRemove={setRemoveTarget}
            />
          ))}
        </div>
      ) : null}

      {catalog?.hasMore && !loading ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-border-strong disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : `Show more (${catalog.total - items.length} left)`}
          </button>
        </div>
      ) : null}

      <SubmitResourceDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmitted={handleSubmitted}
      />
      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove this resource?"
        description={
          removeTarget
            ? `“${removeTarget.title}” will be removed from the catalog, including anyone's saved list.`
            : undefined
        }
        confirmLabel="Remove"
        pendingLabel="Removing…"
        tone="danger"
        onConfirm={confirmRemove}
        onClose={() => setRemoveTarget(null)}
      />
    </div>
  );
}

function EmptyState({
  scope,
  query,
  hasFilters,
  onClear,
  onBrowse,
  onShare,
}: {
  scope: ResourceScope;
  query: string;
  hasFilters: boolean;
  onClear: () => void;
  onBrowse: () => void;
  onShare: () => void;
}) {
  let title = "No matching resources";
  let body = query.trim()
    ? `Nothing matches “${query.trim()}”. Try a different word or clear the filters.`
    : "Try a different type, level, or technology.";
  let action: { label: string; onClick: () => void } | null = hasFilters
    ? { label: "Clear filters", onClick: onClear }
    : null;

  if (!hasFilters && scope === "saved") {
    title = "Nothing saved yet";
    body = "Save resources here or from any roadmap step to build your reading list.";
    action = { label: "Browse resources", onClick: onBrowse };
  } else if (!hasFilters && scope === "mine") {
    title = "You haven't shared anything yet";
    body = "Found a doc, video, or tool that made something click? Share it with other learners.";
    action = { label: "Share a resource", onClick: onShare };
  }

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-8">
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-ink-muted">{body}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
