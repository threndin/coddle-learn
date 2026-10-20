"use client";

import { useEffect, useRef, useState } from "react";
import {
  TOOL_CATEGORIES,
  TOOL_CATEGORY_LABELS,
  TOOL_LIMITS,
  TOOL_PRICING,
  TOOL_PRICING_LABELS,
  type ToolScope,
  type ToolSort,
} from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { SubmitToolDialog } from "@/components/tools/submit-tool-dialog";
import { ToolCard } from "@/components/tools/tool-card";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import {
  DEFAULT_TOOL_FILTERS,
  fetchTools,
  setToolBookmark,
  toolQueryString,
  type ToolCatalog,
  type ToolFilters,
  type ToolItem,
} from "@/lib/tools";

const SEARCH_DEBOUNCE_MS = 250;

const selectClass =
  "rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none";

export function ToolsCatalog({
  initialFilters,
  initialCatalog,
}: {
  initialFilters: ToolFilters;
  initialCatalog: ToolCatalog | null;
}) {
  const { pushToast } = useToast();
  const [filters, setFilters] = useState<ToolFilters>(initialFilters);
  const [queryInput, setQueryInput] = useState(initialFilters.q);
  const [catalog, setCatalog] = useState<ToolCatalog | null>(initialCatalog);
  const [items, setItems] = useState<ToolItem[]>(initialCatalog?.tools ?? []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(
    initialCatalog ? null : "Could not load tools",
  );
  const [submitOpen, setSubmitOpen] = useState(false);
  const loadedKey = useRef(toolQueryString(initialFilters));

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((prev) => (prev.q === queryInput ? prev : { ...prev, q: queryInput }));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [queryInput]);

  useEffect(() => {
    const key = toolQueryString(filters);
    if (key === loadedKey.current) return;
    window.history.replaceState(null, "", key ? `/tools?${key}` : "/tools");

    const controller = new AbortController();
    setLoading(true);
    fetchTools(filters, 1, controller.signal)
      .then((next) => {
        loadedKey.current = key;
        setCatalog(next);
        setItems(next.tools);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(err, "Could not load tools"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters]);

  function update(patch: Partial<ToolFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function clearFilters() {
    setQueryInput("");
    setFilters((prev) => ({ ...DEFAULT_TOOL_FILTERS, scope: prev.scope, sort: prev.sort }));
  }

  async function loadMore() {
    if (!catalog || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchTools(filters, catalog.page + 1);
      setCatalog(next);
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...next.tools.filter((item) => !seen.has(item.id))];
      });
    } catch (err) {
      pushToast(errorMessage(err, "Could not load more tools"), "error");
    } finally {
      setLoadingMore(false);
    }
  }

  function patchItem(id: string, patch: Partial<ToolItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function adjustSaved(delta: number) {
    setCatalog((prev) =>
      prev
        ? { ...prev, counts: { ...prev.counts, saved: Math.max(0, prev.counts.saved + delta) } }
        : prev,
    );
  }

  async function toggleBookmark(tool: ToolItem) {
    const next = !tool.bookmarked;
    patchItem(tool.id, {
      bookmarked: next,
      bookmarkCount: Math.max(0, tool.bookmarkCount + (next ? 1 : -1)),
    });
    adjustSaved(next ? 1 : -1);
    try {
      const result = await setToolBookmark(tool.id, next);
      patchItem(tool.id, result);
      pushToast(next ? "Saved to your tools" : "Removed from saved", "success");
    } catch (err) {
      patchItem(tool.id, {
        bookmarked: tool.bookmarked,
        bookmarkCount: tool.bookmarkCount,
      });
      adjustSaved(next ? -1 : 1);
      pushToast(errorMessage(err, "Could not update bookmark"), "error");
    }
  }

  function handleSubmitted(tool: ToolItem) {
    setSubmitOpen(false);
    pushToast(
      tool.status === "published"
        ? "Thanks! Your tool is live."
        : "Thanks! Your tool is waiting for review.",
      "success",
    );
    setQueryInput("");
    loadedKey.current = "";
    setFilters({ ...DEFAULT_TOOL_FILTERS, scope: "mine", sort: "newest" });
  }

  const hasFilters = Boolean(filters.q || filters.category || filters.pricing || filters.skill);
  const scopes: [ToolScope, string, number | null][] = [
    ["all", "All", null],
    ["saved", "Saved", catalog?.counts.saved ?? null],
    ["mine", "Mine", catalog?.counts.mine ?? null],
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Tools
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Products the community uses to build faster: editors, APIs, hosts, and the rest of a
            developer&apos;s kit.
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

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded-xl border border-border bg-surface p-0.5"
          role="tablist"
          aria-label="Tool lists"
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
                filters.scope === id ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {label}
              {count !== null ? <span className="tabular-nums opacity-80">{count}</span> : null}
            </button>
          ))}
        </div>

        <label className="relative min-w-48 flex-1 sm:min-w-56">
          <span className="sr-only">Search tools</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={queryInput}
            maxLength={TOOL_LIMITS.queryMax}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Search tools"
            className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted/80 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
          />
        </label>

        <label className="sr-only" htmlFor="tool-category">
          Category
        </label>
        <select
          id="tool-category"
          value={filters.category ?? "all"}
          onChange={(event) =>
            update({
              category:
                event.target.value === "all"
                  ? null
                  : (event.target.value as ToolFilters["category"]),
            })
          }
          className={selectClass}
        >
          <option value="all">All categories</option>
          {TOOL_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {TOOL_CATEGORY_LABELS[category]}
              {catalog ? ` (${catalog.categoryCounts[category] ?? 0})` : ""}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="tool-pricing">
          Pricing
        </label>
        <select
          id="tool-pricing"
          value={filters.pricing ?? "all"}
          onChange={(event) =>
            update({
              pricing:
                event.target.value === "all" ? null : (event.target.value as ToolFilters["pricing"]),
            })
          }
          className={selectClass}
        >
          <option value="all">All pricing</option>
          {TOOL_PRICING.map((pricing) => (
            <option key={pricing} value={pricing}>
              {TOOL_PRICING_LABELS[pricing]}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="tool-skill">
          Technology
        </label>
        <select
          id="tool-skill"
          value={filters.skill ?? "all"}
          onChange={(event) =>
            update({ skill: event.target.value === "all" ? null : event.target.value })
          }
          className={selectClass}
        >
          <option value="all">All technologies</option>
          {(catalog?.skills ?? []).map((skill) => (
            <option key={skill.slug} value={skill.slug}>
              {skill.name}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="tool-sort">
          Sort
        </label>
        <select
          id="tool-sort"
          value={filters.sort}
          onChange={(event) => update({ sort: event.target.value as ToolSort })}
          className={selectClass}
        >
          <option value="featured">Featured</option>
          <option value="popular">Popular</option>
          <option value="newest">Newest</option>
          <option value="title">Title</option>
        </select>

        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
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
      ) : loading && items.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Loading tools…</p>
      ) : items.length === 0 ? (
        <EmptyState
          scope={filters.scope}
          query={queryInput}
          hasFilters={hasFilters}
          onClear={clearFilters}
          onBrowse={() => {
            setQueryInput("");
            setFilters(DEFAULT_TOOL_FILTERS);
          }}
          onShare={() => setSubmitOpen(true)}
        />
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <ToolCard key={item.id} tool={item} onToggleBookmark={toggleBookmark} />
            ))}
          </div>
          {catalog?.hasMore ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadMore()}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      )}

      <SubmitToolDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmitted={handleSubmitted}
        uploadsEnabled={catalog?.uploadsEnabled ?? false}
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
  scope: ToolScope;
  query: string;
  hasFilters: boolean;
  onClear: () => void;
  onBrowse: () => void;
  onShare: () => void;
}) {
  let title = "No matching tools";
  let body = query.trim()
    ? `Nothing matches “${query.trim()}”. Try a different word or clear the filters.`
    : "Try a different category, price, or technology.";
  let action: { label: string; onClick: () => void } | null = hasFilters
    ? { label: "Clear filters", onClick: onClear }
    : null;

  if (!hasFilters && scope === "saved") {
    title = "Nothing saved yet";
    body = "Save tools from the catalog so you can come back to them.";
    action = { label: "Browse tools", onClick: onBrowse };
  } else if (!hasFilters && scope === "mine") {
    title = "You haven't shared anything yet";
    body = "Found a product that makes development faster? Share it with other learners.";
    action = { label: "Share a tool", onClick: onShare };
  }

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-8">
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
