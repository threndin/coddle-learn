"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  COMMUNITY_KINDS,
  COMMUNITY_KIND_LABELS,
  COMMUNITY_PEOPLE_SORTS,
  COMMUNITY_PEOPLE_SORT_LABELS,
  COMMUNITY_SEARCH_TYPES,
  COMMUNITY_SEARCH_TYPE_LABELS,
  COMMUNITY_SEARCH_WHEN,
  COMMUNITY_SEARCH_WHEN_LABELS,
  COMMUNITY_SORTS,
  COMMUNITY_SORT_LABELS,
  COMMUNITY_TOPICS,
  COMMUNITY_TOPIC_LABELS,
  EXPERIENCE_LEVELS,
  type CommunityKind,
  type CommunityPeopleSort,
  type CommunitySearchWhen,
  type CommunitySort,
  type CommunityTopic,
  type ExperienceLevel,
} from "@coddle/shared";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { FollowButton } from "@/components/profile/follow-button";
import { ProfileLink } from "@/components/profile/profile-link";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import {
  communitySearchQueryString,
  DEFAULT_COMMUNITY_SEARCH_FILTERS,
  fetchCommunitySearch,
  rememberCommunitySearchReturn,
  type CommunityPostItem,
  type CommunitySearchFilters,
  type CommunitySearchPerson,
  type CommunitySearchResponse,
} from "@/lib/community";
import { pluralize } from "@/lib/format";

const EMPTY_SEARCH: CommunitySearchResponse = {
  posts: [],
  people: [],
  page: 1,
  pageSize: 10,
  total: 0,
  hasMore: false,
  peopleTotal: 0,
  peopleHasMore: false,
  peoplePageSize: 12,
  filters: DEFAULT_COMMUNITY_SEARCH_FILTERS,
};

const SEARCH_DEBOUNCE_MS = 1000;

const selectClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink focus:border-brand focus:outline-none";

function chipClass(active: boolean) {
  return [
    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
    active
      ? "bg-brand text-white"
      : "border border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
  ].join(" ");
}

function railItemClass(active: boolean) {
  return [
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
    active
      ? "bg-brand-soft text-brand"
      : "text-ink-muted hover:bg-surface-subtle hover:text-ink",
  ].join(" ");
}

export function CommunitySearchView({
  initialFilters,
  initialResult,
}: {
  initialFilters: CommunitySearchFilters;
  initialResult: CommunitySearchResponse | null;
}) {
  const [filters, setFilters] = useState<CommunitySearchFilters>(initialFilters);
  const [queryInput, setQueryInput] = useState(initialFilters.q);
  const [result, setResult] = useState<CommunitySearchResponse | null>(initialResult);
  const [posts, setPosts] = useState<CommunityPostItem[]>(initialResult?.posts ?? []);
  const [people, setPeople] = useState<CommunitySearchPerson[]>(initialResult?.people ?? []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(
    initialResult ? null : "Could not load search results",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const loadedKey = useRef(communitySearchQueryString(initialFilters));
  const pageRef = useRef(1);

  function applyQuery(nextRaw: string) {
    const nextQ = nextRaw.trim();
    setFilters((prev) => {
      if (prev.q === nextQ) return prev;
      let sort = prev.sort;
      let peopleSort = prev.peopleSort;
      if (!prev.q && nextQ) {
        if (sort === "newest") sort = "relevant";
        if (peopleSort === "posts") peopleSort = "relevant";
      } else if (prev.q && !nextQ) {
        if (sort === "relevant") sort = "newest";
        if (peopleSort === "relevant") peopleSort = "posts";
      }
      return { ...prev, q: nextQ, sort, peopleSort };
    });
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      applyQuery(queryInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [queryInput]);

  useEffect(() => {
    const key = communitySearchQueryString(filters);
    const href = key ? `/community/search?${key}` : "/community/search";
    if (key === loadedKey.current) {
      rememberCommunitySearchReturn(href);
      return;
    }
    window.history.replaceState(null, "", href);
    rememberCommunitySearchReturn(href);

    pageRef.current = 1;

    if (!filters.q.trim()) {
      loadedKey.current = key;
      setResult({ ...EMPTY_SEARCH, filters });
      setPosts([]);
      setPeople([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetchCommunitySearch(filters, 1, controller.signal)
      .then((next) => {
        loadedKey.current = key;
        setResult(next);
        setPosts(next.posts);
        setPeople(next.people);
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

  useEffect(() => {
    if (!filtersOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [filtersOpen]);

  function update(patch: Partial<CommunitySearchFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function resetFilters() {
    setQueryInput("");
    setFilters({ ...DEFAULT_COMMUNITY_SEARCH_FILTERS });
  }

  async function loadMore() {
    if (loadingMore || !result) return;
    const nextPage = pageRef.current + 1;
    setLoadingMore(true);
    try {
      const next = await fetchCommunitySearch(filters, nextPage);
      pageRef.current = nextPage;
      setResult(next);
      if (filters.type === "people") {
        setPeople((prev) => [...prev, ...next.people]);
      } else {
        setPosts((prev) => [...prev, ...next.posts]);
      }
    } catch (err) {
      setError(errorMessage(err, "Could not load more results"));
    } finally {
      setLoadingMore(false);
    }
  }

  const hasQuery = filters.q.trim().length > 0;
  const showPeople = hasQuery && (filters.type === "all" || filters.type === "people");
  const showPosts = hasQuery && (filters.type === "all" || filters.type === "posts");
  const canLoadMore =
    hasQuery &&
    (filters.type === "people"
      ? Boolean(result?.peopleHasMore)
      : filters.type === "posts" || filters.type === "all"
        ? Boolean(result?.hasMore)
        : false);

  return (
    <div className="min-h-[70vh] bg-surface-subtle/40">
      <div className="sticky top-16 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
          <Link
            href="/community"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
            aria-label="Back to community"
          >
            <Icon name="arrowLeft" className="h-5 w-5" />
          </Link>
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search community</span>
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                applyQuery(queryInput);
              }}
              placeholder="Search people and posts"
              maxLength={100}
              className={[
                "w-full rounded-full border border-border bg-surface-subtle py-2.5 pl-10 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface",
                queryInput ? "pr-10" : "pr-4",
              ].join(" ")}
              autoFocus
            />
            {queryInput ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQueryInput("");
                  applyQuery("");
                }}
                className="absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface hover:text-ink"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            ) : null}
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-3 text-sm font-semibold text-ink-muted transition hover:text-ink lg:hidden"
          >
            <Icon name="filter" className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-5 sm:px-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden rounded-2xl border border-border bg-surface p-4 lg:sticky lg:top-36 lg:block lg:self-start">
          <SearchFiltersPanel
            filters={filters}
            onUpdate={update}
            onReset={resetFilters}
          />
        </aside>

        {filtersOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close filters"
              className="absolute inset-0 bg-ink/40"
              onClick={() => setFiltersOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Search filters"
              className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl border border-border bg-surface shadow-xl"
            >
              <div className="flex shrink-0 flex-col border-b border-border px-5 pt-3 pb-3">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-bold text-ink">Filters</p>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="rounded-lg px-2 py-1 text-sm font-semibold text-ink-muted transition hover:text-ink"
                  >
                    Done
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto px-5 py-4">
                <SearchFiltersPanel
                  filters={filters}
                  onUpdate={update}
                  onReset={() => {
                    resetFilters();
                    setFiltersOpen(false);
                  }}
                  compact
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap gap-2 lg:hidden">
            {COMMUNITY_SEARCH_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => update({ type })}
                className={chipClass(filters.type === type)}
              >
                {COMMUNITY_SEARCH_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          ) : null}

          {!hasQuery ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-14 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/community-search-empty.svg"
                alt=""
                width={200}
                height={160}
                className="mx-auto h-32 w-auto sm:h-36"
              />
              <h2 className="mt-4 text-lg font-bold text-ink">Search the community</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-muted">
                Type a name or keywords to find people and posts. Results appear here after you
                search.
              </p>
            </div>
          ) : loading ? (
            <p className="text-sm text-ink-muted">Searching…</p>
          ) : (
            <>
              {showPeople ? (
                <section className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                    <div>
                      <h2 className="text-base font-bold text-ink">People</h2>
                      <p className="text-xs text-ink-muted">
                        {result
                          ? pluralize(result.peopleTotal, "person", "people")
                          : "Learners on Coddle Learn"}
                      </p>
                    </div>
                    {filters.type === "all" && (result?.peopleTotal ?? 0) > people.length ? (
                      <button
                        type="button"
                        onClick={() => update({ type: "people" })}
                        className="text-sm font-semibold text-brand transition hover:underline"
                      >
                        See all
                      </button>
                    ) : null}
                  </div>
                  {people.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-ink-muted sm:px-5">
                      {filters.q
                        ? `No people match “${filters.q}”.`
                        : "Try a name to find learners."}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {people.map((person) => (
                        <li key={person.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                          <ProfileLink user={person} className="shrink-0">
                            <ProfileAvatar
                              name={person.name}
                              avatarUrl={person.avatarUrl}
                              size="md"
                            />
                          </ProfileLink>
                          <div className="min-w-0 flex-1">
                            <ProfileLink
                              user={person}
                              className="truncate text-sm font-semibold text-ink transition hover:text-brand"
                            >
                              {person.name}
                            </ProfileLink>
                            {person.username ? (
                              <p className="font-mono text-xs text-ink-muted">
                                @{person.username}
                              </p>
                            ) : null}
                            <p className="text-xs text-ink-muted">{person.note}</p>
                            {person.bio ? (
                              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{person.bio}</p>
                            ) : null}
                          </div>
                          {person.username ? (
                            <FollowButton
                              username={person.username}
                              className="px-3 py-1.5 text-xs"
                            />
                          ) : (
                            <ProfileLink
                              user={person}
                              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-border-strong"
                            >
                              View
                            </ProfileLink>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}

              {showPosts ? (
                <section className="space-y-3">
                  <div className="flex items-end justify-between gap-3 px-0.5">
                    <div>
                      <h2 className="text-base font-bold text-ink">Posts</h2>
                      <p className="text-xs text-ink-muted">
                        {result ? pluralize(result.total, "post") : "Community posts"}
                        {filters.q ? ` matching “${filters.q}”` : ""}
                      </p>
                    </div>
                    {filters.type === "all" && (result?.total ?? 0) > posts.length ? (
                      <button
                        type="button"
                        onClick={() => update({ type: "posts" })}
                        className="text-sm font-semibold text-brand transition hover:underline"
                      >
                        See all
                      </button>
                    ) : null}
                  </div>

                  {posts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center">
                      <p className="text-sm text-ink-muted">
                        {filters.q
                          ? `No posts match “${filters.q}”.`
                          : "No posts for these filters yet."}
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {posts.map((post) => (
                        <li key={post.id}>
                          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                            <CommunityPostCard
                              post={post}
                              onPatch={(patch) =>
                                setPosts((prev) =>
                                  prev.map((item) =>
                                    item.id === post.id ? { ...item, ...patch } : item,
                                  ),
                                )
                              }
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}

              {canLoadMore ? (
                <div className="flex justify-center pt-2 pb-6">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:opacity-50"
                  >
                    {loadingMore ? "Loading…" : "See more"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchFiltersPanel({
  filters,
  onUpdate,
  onReset,
  compact = false,
}: {
  filters: CommunitySearchFilters;
  onUpdate: (patch: Partial<CommunitySearchFilters>) => void;
  onReset: () => void;
  compact?: boolean;
}) {
  return (
    <div>
      {!compact ? (
        <>
          <h2 className="text-lg font-bold text-ink">Search filters</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Narrow people and posts like a social search.
          </p>
        </>
      ) : null}

      <div className={compact ? "space-y-1" : "mt-4 space-y-1"}>
        {COMMUNITY_SEARCH_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onUpdate({ type })}
            className={railItemClass(filters.type === type)}
          >
            <Icon
              name={type === "people" ? "users" : type === "posts" ? "listBullet" : "search"}
              className="h-4 w-4 shrink-0"
            />
            {COMMUNITY_SEARCH_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {(filters.type === "all" || filters.type === "posts") && (
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Posts</p>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink-muted">Sort</span>
            <select
              value={filters.sort}
              onChange={(event) => onUpdate({ sort: event.target.value as CommunitySort })}
              className={selectClass}
            >
              {COMMUNITY_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {COMMUNITY_SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink-muted">Date posted</span>
            <select
              value={filters.when}
              onChange={(event) =>
                onUpdate({ when: event.target.value as CommunitySearchWhen })
              }
              className={selectClass}
            >
              {COMMUNITY_SEARCH_WHEN.map((when) => (
                <option key={when} value={when}>
                  {COMMUNITY_SEARCH_WHEN_LABELS[when]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink-muted">Type</span>
            <select
              value={filters.kind ?? "all"}
              onChange={(event) => {
                const value = event.target.value;
                onUpdate({ kind: value === "all" ? null : (value as CommunityKind) });
              }}
              className={selectClass}
            >
              <option value="all">All types</option>
              {COMMUNITY_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {COMMUNITY_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink-muted">Topic</span>
            <select
              value={filters.topic ?? "all"}
              onChange={(event) => {
                const value = event.target.value;
                onUpdate({ topic: value === "all" ? null : (value as CommunityTopic) });
              }}
              className={selectClass}
            >
              <option value="all">All topics</option>
              {COMMUNITY_TOPICS.map((topic) => (
                <option key={topic} value={topic}>
                  {COMMUNITY_TOPIC_LABELS[topic]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {(filters.type === "all" || filters.type === "people") && (
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">People</p>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink-muted">Sort</span>
            <select
              value={filters.peopleSort}
              onChange={(event) =>
                onUpdate({ peopleSort: event.target.value as CommunityPeopleSort })
              }
              className={selectClass}
            >
              {COMMUNITY_PEOPLE_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {COMMUNITY_PEOPLE_SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink-muted">Experience</span>
            <select
              value={filters.experienceLevel ?? "all"}
              onChange={(event) => {
                const value = event.target.value;
                onUpdate({
                  experienceLevel: value === "all" ? null : (value as ExperienceLevel),
                });
              }}
              className={selectClass}
            >
              <option value="all">Any level</option>
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        className="mt-5 w-full rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
      >
        Reset filters
      </button>
    </div>
  );
}
