"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MENTOR_AVAILABILITIES,
  MENTOR_AVAILABILITY_LABELS,
  MENTOR_LIMITS,
  MENTOR_TOPIC_LABELS,
  MENTOR_TOPICS,
  type MentorAvailability,
  type MentorScope,
  type MentorSort,
  type MentorTopic,
} from "@coddle/shared";
import { Icon } from "@/components/ui/icon";
import { MentorCard } from "@/components/mentors/mentor-card";
import { errorMessage } from "@/lib/api-client";
import {
  DEFAULT_MENTOR_FILTERS,
  fetchMentors,
  mentorQueryString,
  type MentorCard as MentorCardData,
  type MentorCatalog,
  type MentorFilters,
} from "@/lib/mentors";

const SEARCH_DEBOUNCE_MS = 250;

const selectClass =
  "rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none";

export function MentorsCatalog({
  initialFilters,
  initialCatalog,
}: {
  initialFilters: MentorFilters;
  initialCatalog: MentorCatalog | null;
}) {
  const [filters, setFilters] = useState<MentorFilters>(initialFilters);
  const [queryInput, setQueryInput] = useState(initialFilters.q);
  const [catalog, setCatalog] = useState<MentorCatalog | null>(initialCatalog);
  const [items, setItems] = useState<MentorCardData[]>(initialCatalog?.mentors ?? []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(
    initialCatalog ? null : "Could not load mentors",
  );
  const loadedKey = useRef(mentorQueryString(initialFilters));

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((prev) => (prev.q === queryInput ? prev : { ...prev, q: queryInput }));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [queryInput]);

  useEffect(() => {
    const key = mentorQueryString(filters);
    if (key === loadedKey.current) return;
    window.history.replaceState(null, "", key ? `/mentors?${key}` : "/mentors");

    const controller = new AbortController();
    setLoading(true);
    fetchMentors(filters, 1, controller.signal)
      .then((next) => {
        loadedKey.current = key;
        setCatalog(next);
        setItems(next.mentors);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(err, "Could not load mentors"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters]);

  function update(patch: Partial<MentorFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function clearFilters() {
    setQueryInput("");
    setFilters((prev) => ({ ...DEFAULT_MENTOR_FILTERS, scope: prev.scope, sort: prev.sort }));
  }

  async function loadMore() {
    if (!catalog || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchMentors(filters, catalog.page + 1);
      setCatalog(next);
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...next.mentors.filter((item) => !seen.has(item.id))];
      });
    } catch (err) {
      setError(errorMessage(err, "Could not load more mentors"));
    } finally {
      setLoadingMore(false);
    }
  }

  const hasFilters = Boolean(filters.q || filters.topic || filters.skill || filters.availability);
  const scopes: [MentorScope, string, number | null][] = [
    ["all", "All", null],
    ["applied", "Applied", catalog?.counts.applied ?? null],
    ["mentoring", "Mentoring", catalog?.counts.mentoring ?? null],
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1
            data-tour="page:mentors"
            className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
          >
            Mentorship
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Find a mentor, apply to a program, and wait for them to approve you. Mentors choose
            who they work with.
          </p>
        </div>
        <Link
          href="/mentors/me"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          <Icon name="users" className="h-4 w-4" />
          My mentorship
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded-xl border border-border bg-surface p-0.5"
          role="tablist"
          aria-label="Mentor lists"
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
          <span className="sr-only">Search mentors</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={queryInput}
            maxLength={MENTOR_LIMITS.queryMax}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Search mentors"
            className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted/80 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
          />
        </label>

        <label className="sr-only" htmlFor="mentor-topic">
          Topic
        </label>
        <select
          id="mentor-topic"
          value={filters.topic ?? "all"}
          onChange={(event) =>
            update({
              topic: event.target.value === "all" ? null : (event.target.value as MentorTopic),
            })
          }
          className={selectClass}
        >
          <option value="all">All topics</option>
          {MENTOR_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {MENTOR_TOPIC_LABELS[topic]}
              {catalog ? ` (${catalog.topicCounts[topic] ?? 0})` : ""}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="mentor-availability">
          Availability
        </label>
        <select
          id="mentor-availability"
          value={filters.availability ?? "all"}
          onChange={(event) =>
            update({
              availability:
                event.target.value === "all"
                  ? null
                  : (event.target.value as MentorAvailability),
            })
          }
          className={selectClass}
        >
          <option value="all">Any availability</option>
          {MENTOR_AVAILABILITIES.map((item) => (
            <option key={item} value={item}>
              {MENTOR_AVAILABILITY_LABELS[item]}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="mentor-skill">
          Technology
        </label>
        <select
          id="mentor-skill"
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

        <label className="sr-only" htmlFor="mentor-sort">
          Sort
        </label>
        <select
          id="mentor-sort"
          value={filters.sort}
          onChange={(event) => update({ sort: event.target.value as MentorSort })}
          className={selectClass}
        >
          <option value="available">Available first</option>
          <option value="newest">Newest</option>
          <option value="name">Name</option>
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
        <p className="mt-8 text-sm text-ink-muted">Loading mentors…</p>
      ) : items.length === 0 ? (
        <EmptyState
          scope={filters.scope}
          query={queryInput}
          hasFilters={hasFilters}
          onClear={clearFilters}
          onBrowse={() => {
            setQueryInput("");
            setFilters(DEFAULT_MENTOR_FILTERS);
          }}
        />
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <MentorCard key={item.id} mentor={item} />
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
    </div>
  );
}

function EmptyState({
  scope,
  query,
  hasFilters,
  onClear,
  onBrowse,
}: {
  scope: MentorScope;
  query: string;
  hasFilters: boolean;
  onClear: () => void;
  onBrowse: () => void;
}) {
  let title = "No matching mentors";
  let body = query.trim()
    ? `Nothing matches “${query.trim()}”. Try a different word or clear the filters.`
    : "Try a different topic, availability, or technology.";
  let action: { label: string; href?: string; onClick?: () => void } | null = hasFilters
    ? { label: "Clear filters", onClick: onClear }
    : null;

  if (!hasFilters && scope === "applied") {
    title = "No applications yet";
    body = "Browse the directory and apply to a program. The mentor decides who joins.";
    action = { label: "Browse mentors", onClick: onBrowse };
  } else if (!hasFilters && scope === "mentoring") {
    title = "You are not mentoring yet";
    body = "Publish a mentor profile and open a program. You approve every learner who joins.";
    action = { label: "Open mentor desk", href: "/mentors/me" };
  }

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-8">
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-ink-muted">{body}</p>
      {action?.href ? (
        <Link
          href={action.href}
          className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
        >
          {action.label}
        </Link>
      ) : action?.onClick ? (
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
