"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  SEARCH_SUGGESTIONS,
  SEARCH_TYPES,
  SEARCH_TYPE_LABELS,
  type SearchResult,
  type SearchType,
} from "@coddle/shared";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import {
  DEFAULT_SEARCH_FILTERS,
  fetchSearch,
  searchQueryString,
  type SearchFilters,
} from "@/lib/search";
import { SearchHitCard } from "@/components/search/search-hit";

const SEARCH_DEBOUNCE_MS = 250;

export function GlobalSearch({
  initialFilters,
  initialResult,
}: {
  initialFilters: SearchFilters;
  initialResult: SearchResult | null;
}) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [queryInput, setQueryInput] = useState(initialFilters.q);
  const [result, setResult] = useState<SearchResult | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialResult ? null : "Could not load search results",
  );
  const loadedKey = useRef(searchQueryString(initialFilters));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((prev) => (prev.q === queryInput ? prev : { ...prev, q: queryInput }));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [queryInput]);

  useEffect(() => {
    const key = searchQueryString(filters);
    if (key === loadedKey.current) return;
    window.history.replaceState(null, "", key ? `/search?${key}` : "/search");

    if (!filters.q.trim()) {
      loadedKey.current = key;
      setResult({
        q: "",
        type: filters.type,
        parsed: { raw: "", text: "", terms: [], expanded: [], inferredTypes: [] },
        total: 0,
        hits: [],
        groups: [],
      });
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetchSearch(filters, controller.signal)
      .then((next) => {
        loadedKey.current = key;
        setResult(next);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(err, "Could not load search results"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters]);

  function setType(type: SearchType | "all") {
    setFilters((prev) => ({ ...prev, type }));
  }

  const hasQuery = Boolean(filters.q.trim());
  const groups =
    filters.type === "all"
      ? (result?.groups ?? [])
      : result?.hits.length
        ? [{ type: filters.type as SearchType, total: result.total, hits: result.hits }]
        : [];

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Search
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
          One ranked search across courses, roadmaps, resources, projects, developers, mentors,
          skills, and tools. Ask the assistant when you want a next step.
        </p>
      </div>

      <label className="relative mt-6 block max-w-2xl">
        <span className="sr-only">Search Coddle Learn</span>
        <Icon
          name="search"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        />
        <input
          ref={inputRef}
          type="search"
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          placeholder="Search React, mentors, projects…"
          className="w-full rounded-2xl border border-border bg-surface py-3 pr-4 pl-10 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <TypeChip active={filters.type === "all"} onClick={() => setType("all")}>
          All
        </TypeChip>
        {SEARCH_TYPES.map((type) => (
          <TypeChip key={type} active={filters.type === type} onClick={() => setType(type)}>
            {SEARCH_TYPE_LABELS[type]}
          </TypeChip>
        ))}
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {!hasQuery ? (
            <div>
              <p className="text-sm font-semibold text-ink">Try searching</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SEARCH_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setQueryInput(suggestion);
                      setFilters({ ...DEFAULT_SEARCH_FILTERS, q: suggestion, type: filters.type });
                    }}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition hover:border-border-strong hover:text-ink"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : loading ? (
            <p className="text-sm text-ink-muted">Ranking results…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nothing matched “{filters.q}”. Try a skill, a person, or a broader goal.
            </p>
          ) : (
            <div className="space-y-8">
              {groups.map((group) => (
                <section key={group.type}>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h2 className="text-sm font-bold tracking-wide text-ink uppercase">
                      {SEARCH_TYPE_LABELS[group.type]}
                    </h2>
                    <span className="text-xs tabular-nums text-ink-muted">{group.total}</span>
                  </div>
                  <div className="space-y-2">
                    {group.hits.map((hit) => (
                      <SearchHitCard key={`${hit.type}:${hit.id}`} hit={hit} />
                    ))}
                  </div>
                  {filters.type === "all" && group.total > group.hits.length ? (
                    <button
                      type="button"
                      onClick={() => setType(group.type)}
                      className="mt-3 text-sm font-semibold text-brand"
                    >
                      See all {SEARCH_TYPE_LABELS[group.type].toLowerCase()}
                    </button>
                  ) : null}
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <Link
            href={filters.q ? `/assistant?q=${encodeURIComponent(filters.q)}` : "/assistant"}
            className="block rounded-2xl border border-border bg-surface p-4 transition hover:border-border-strong"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon name="sparkle" className="h-4 w-4" />
            </span>
            <p className="mt-3 text-sm font-bold text-ink">Ask the assistant</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              {filters.q
                ? `Open a chat about “${filters.q}”. Search stays unlimited; chats use 10 messages a week.`
                : "ChatGPT-style help grounded in Coddle Learn. Ten messages a week."}
            </p>
            <span className="mt-3 inline-flex text-sm font-semibold text-brand">Open assistant</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function TypeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "bg-brand text-white"
          : "border border-border bg-surface text-ink-muted hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
