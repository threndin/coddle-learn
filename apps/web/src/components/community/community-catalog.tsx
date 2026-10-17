"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  COMMUNITY_KINDS,
  COMMUNITY_KIND_LABELS,
  COMMUNITY_LIMITS,
  COMMUNITY_POST_CREATE_POINTS,
  COMMUNITY_TOPICS,
  COMMUNITY_TOPIC_LABELS,
  type CommunityKind,
  type CommunityTopic,
} from "@coddle/shared";
import { CommunityPostCard } from "@/components/community/community-post-card";
import {
  ComposePostDialog,
  type ComposePostDraft,
} from "@/components/community/compose-post-dialog";
import { EditPostDialog } from "@/components/community/edit-post-dialog";
import { QuotePostDialog, type QuotePostDraft } from "@/components/community/quote-post-dialog";
import { ReportDialog } from "@/components/community/report-dialog";
import { SponsoredPanel } from "@/components/community/sponsored-panel";
import { useAppUserActions } from "@/components/app/app-user-context";
import { useToast } from "@/components/app/toast";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import {
  clearCommunitySearchReturn,
  communityQueryString,
  createCommunityPost,
  DEFAULT_COMMUNITY_FILTERS,
  fetchCommunity,
  fetchSpotlightLearners,
  type CommunityCatalog,
  type CommunityFilters,
  type CommunityPostItem,
  type SpotlightLearner,
} from "@/lib/community";
import { pluralize } from "@/lib/format";

const MOBILE_AD_AFTER = 5;

const selectClass =
  "shrink-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none";

export function CommunityFeed({
  initialFilters,
  initialCatalog,
  initialSpotlight = [],
}: {
  initialFilters: CommunityFilters;
  initialCatalog: CommunityCatalog | null;
  initialSpotlight?: SpotlightLearner[];
}) {
  const router = useRouter();
  const { pushToast, dismissToast } = useToast();
  const { refreshUser } = useAppUserActions();
  const [filters, setFilters] = useState<CommunityFilters>(initialFilters);
  const [catalog, setCatalog] = useState<CommunityCatalog | null>(initialCatalog);
  const [posts, setPosts] = useState<CommunityPostItem[]>(initialCatalog?.posts ?? []);
  const [spotlight, setSpotlight] = useState<SpotlightLearner[]>(initialSpotlight);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(
    initialCatalog ? null : "Could not load community posts",
  );
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeKind, setComposeKind] = useState<CommunityKind>("question");
  const [quoteTarget, setQuoteTarget] = useState<CommunityPostItem | null>(null);
  const [editTarget, setEditTarget] = useState<CommunityPostItem | null>(null);
  const [reportTarget, setReportTarget] = useState<CommunityPostItem | null>(null);
  const loadedKey = useRef(communityQueryString(initialFilters));
  const loadMoreLock = useRef(false);
  const postQueue = useRef<Promise<void>>(Promise.resolve());
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearCommunitySearchReturn();
  }, []);

  useEffect(() => {
    if (initialSpotlight.length > 0) return;
    const controller = new AbortController();
    fetchSpotlightLearners(controller.signal)
      .then((data) => setSpotlight(data.learners))
      .catch(() => {
        /* keep empty spotlight */
      });
    return () => controller.abort();
  }, [initialSpotlight.length]);

  useEffect(() => {
    const key = communityQueryString(filters);
    if (key === loadedKey.current) return;
    window.history.replaceState(null, "", key ? `/community?${key}` : "/community");

    const controller = new AbortController();
    setLoading(true);
    loadMoreLock.current = false;
    fetchCommunity(filters, 1, controller.signal)
      .then((next) => {
        loadedKey.current = key;
        setCatalog(next);
        setPosts(next.posts);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(err, "Could not load community posts"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters]);

  function update(patch: Partial<CommunityFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function openCompose(kind: CommunityKind) {
    setComposeKind(kind);
    setComposeOpen(true);
  }

  function patchPost(id: string, patch: Partial<CommunityPostItem>) {
    setPosts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removePost(id: string) {
    const removed = posts.find((item) => item.id === id);
    setPosts((prev) => prev.filter((item) => item.id !== id));
    setCatalog((prev) => {
      if (!prev || !removed) return prev;
      const kind = removed.kind as CommunityKind;
      return {
        ...prev,
        total: Math.max(0, prev.total - 1),
        counts: {
          mine: removed.isMine ? Math.max(0, prev.counts.mine - 1) : prev.counts.mine,
        },
        kindCounts: {
          ...prev.kindCounts,
          [kind]: Math.max(0, (prev.kindCounts[kind] ?? 0) - 1),
        },
      };
    });
  }

  async function loadMore() {
    if (!catalog?.hasMore || loadingMore || loadMoreLock.current) return;
    loadMoreLock.current = true;
    setLoadingMore(true);
    try {
      const next = await fetchCommunity(filters, catalog.page + 1);
      setCatalog(next);
      setPosts((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...next.posts.filter((item) => !seen.has(item.id))];
      });
    } catch (err) {
      pushToast(errorMessage(err, "Could not load more posts"), "error");
    } finally {
      setLoadingMore(false);
      loadMoreLock.current = false;
    }
  }

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !catalog?.hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // loadMore closes over catalog/filters; rebind when page state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog?.hasMore, catalog?.page, filters, loadingMore]);

  function insertPost(post: CommunityPostItem) {
    setPosts((prev) => [post, ...prev.filter((item) => item.id !== post.id)]);
    setCatalog((prev) =>
      prev
        ? {
            ...prev,
            total: prev.total + 1,
            counts: { mine: prev.counts.mine + 1 },
            kindCounts: {
              ...prev.kindCounts,
              [post.kind as CommunityKind]:
                (prev.kindCounts[post.kind as CommunityKind] ?? 0) + 1,
            },
          }
        : prev,
    );
  }

  function queuePost(draft: ComposePostDraft) {
    setComposeOpen(false);
    const creatingId = pushToast("Creating post…", { tone: "info", sticky: true });

    postQueue.current = postQueue.current
      .catch(() => undefined)
      .then(async () => {
        try {
          const { post } = await createCommunityPost({
            kind: draft.kind,
            topic: draft.topic,
            relatedSlug: draft.relatedSlug,
            title: draft.title,
            body: draft.body,
            images: draft.images,
          });
          dismissToast(creatingId);
          insertPost(post);
          void refreshUser();
          pushToast(`Your post is live · +${COMMUNITY_POST_CREATE_POINTS} pts`, {
            tone: "success",
            durationMs: 7000,
            action: {
              label: "Show",
              onClick: () => router.push(`/community/${post.slug}`),
            },
          });
        } catch (err) {
          dismissToast(creatingId);
          pushToast(errorMessage(err, "Could not publish this post"), "error");
        }
      });
  }

  function queueQuote(draft: QuotePostDraft) {
    setQuoteTarget(null);
    const creatingId = pushToast("Creating quote…", { tone: "info", sticky: true });

    postQueue.current = postQueue.current
      .catch(() => undefined)
      .then(async () => {
        try {
          const { post } = await createCommunityPost({
            kind: "discussion",
            topic: "general",
            title: draft.title,
            body: draft.body,
            quotePostId: draft.quotePostId,
          });
          dismissToast(creatingId);
          insertPost(post);
          void refreshUser();
          pushToast(`Quote published · +${COMMUNITY_POST_CREATE_POINTS} pts`, {
            tone: "success",
            durationMs: 7000,
            action: {
              label: "Show",
              onClick: () => router.push(`/community/${post.slug}`),
            },
          });
        } catch (err) {
          dismissToast(creatingId);
          pushToast(errorMessage(err, "Could not publish quote"), "error");
        }
      });
  }

  const filtersActive =
    filters.kind !== null || filters.topic !== null || filters.scope !== "all";

  const showMobileAd = posts.length >= MOBILE_AD_AFTER;
  const totalPages = catalog
    ? Math.max(1, Math.ceil(catalog.total / COMMUNITY_LIMITS.pageSize))
    : 1;
  const loadedPage = catalog?.page ?? 1;
  const allKindsCount = catalog
    ? COMMUNITY_KINDS.reduce((sum, kind) => sum + (catalog.kindCounts[kind] ?? 0), 0)
    : 0;

  function kindTabClass(active: boolean) {
    return [
      "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition",
      active
        ? "bg-brand text-white"
        : "text-ink-muted hover:bg-surface-subtle hover:text-ink",
    ].join(" ");
  }

  return (
    <div className="min-h-full">
      <section className="relative overflow-hidden border-b border-border">
        {/* Hero atmosphere for the community feed. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/community-hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/70 to-ink/45" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-12 sm:px-8 sm:py-16 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Community
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Ask, discuss, and share
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-white/80">
              Questions and discussions about courses, roadmaps, and projects. Ask for help or
              share something you built.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openCompose("question")}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/90"
            >
              <Icon name="question" className="h-4 w-4" />
              Ask a question
            </button>
            <button
              type="button"
              onClick={() => openCompose("project_share")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <Icon name="layers" className="h-4 w-4" />
              Share a project
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-8 sm:py-8">
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <div className="flex w-max min-w-full items-center gap-2 p-3 lg:w-auto lg:min-w-0">
            <Link
              href="/community/search"
              aria-label="Search community"
              title="Search people and posts"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-subtle text-ink-muted transition hover:border-border-strong hover:text-ink"
            >
              <Icon name="search" className="h-4 w-4" />
            </Link>

            <label className="sr-only" htmlFor="community-kind">
              Type
            </label>
            <select
              id="community-kind"
              value={filters.kind ?? "all"}
              onChange={(event) => {
                const value = event.target.value;
                update({ kind: value === "all" ? null : (value as CommunityKind) });
              }}
              className={`${selectClass} lg:hidden`}
            >
              <option value="all">All types</option>
              {COMMUNITY_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {COMMUNITY_KIND_LABELS[kind]}
                  {catalog ? ` (${catalog.kindCounts[kind] ?? 0})` : ""}
                </option>
              ))}
            </select>

            <div
              role="tablist"
              aria-label="Post type"
              className="hidden shrink-0 items-center gap-1 rounded-xl border border-border bg-surface-subtle p-1 lg:flex"
            >
              <button
                type="button"
                role="tab"
                aria-selected={filters.kind === null}
                onClick={() => update({ kind: null })}
                className={kindTabClass(filters.kind === null)}
              >
                All{catalog ? ` (${allKindsCount})` : ""}
              </button>
              {COMMUNITY_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  role="tab"
                  aria-selected={filters.kind === kind}
                  onClick={() => update({ kind })}
                  className={kindTabClass(filters.kind === kind)}
                >
                  {COMMUNITY_KIND_LABELS[kind]}
                  {catalog ? ` (${catalog.kindCounts[kind] ?? 0})` : ""}
                </button>
              ))}
            </div>

            <label className="sr-only" htmlFor="community-topic">
              Topic
            </label>
            <select
              id="community-topic"
              value={filters.topic ?? "all"}
              onChange={(event) => {
                const value = event.target.value;
                update({ topic: value === "all" ? null : (value as CommunityTopic) });
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

            <label className="sr-only" htmlFor="community-scope">
              Scope
            </label>
            <select
              id="community-scope"
              value={filters.scope}
              onChange={(event) =>
                update({ scope: event.target.value === "mine" ? "mine" : "all" })
              }
              className={selectClass}
            >
              <option value="all">Everyone</option>
              <option value="mine">Mine{catalog ? ` (${catalog.counts.mine})` : ""}</option>
            </select>

            {filtersActive ? (
              <button
                type="button"
                onClick={() => setFilters({ ...DEFAULT_COMMUNITY_FILTERS })}
                className="shrink-0 rounded-xl px-3 py-2.5 text-xs font-semibold text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</p>
                <button
                  type="button"
                  onClick={() => openCompose("discussion")}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Start a discussion anyway
                </button>
              </div>
            ) : loading && posts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-5 py-12 text-center text-sm text-ink-muted">
                Loading community…
              </p>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
                <Icon name="users" className="mx-auto h-8 w-8 text-ink-muted" />
                <h2 className="mt-4 font-display text-xl font-bold text-ink">No posts yet</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
                  {filtersActive
                    ? "Nothing matches these filters. Clear them or ask the first question."
                    : "Be the first to ask a question, start a discussion, or share a project."}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => openCompose("question")}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Ask a question
                  </button>
                  <button
                    type="button"
                    onClick={() => openCompose("discussion")}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink"
                  >
                    Start a discussion
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-ink-muted">
                    {pluralize(catalog?.total ?? posts.length, "post")}
                    {loading ? " · Updating…" : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => openCompose("discussion")}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:underline"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    New discussion
                  </button>
                </div>
                <ul className="space-y-4">
                  {posts.map((post, index) => (
                    <li key={post.id} className="space-y-4">
                      <CommunityPostCard
                        post={post}
                        onPatch={(patch) => patchPost(post.id, patch)}
                        onDeleted={removePost}
                        onQuote={setQuoteTarget}
                        onEdit={setEditTarget}
                        onReport={setReportTarget}
                      />
                      {showMobileAd && index === MOBILE_AD_AFTER - 1 ? (
                        <div className="lg:hidden">
                          <SponsoredPanel compact learners={spotlight} />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 space-y-3">
                  {catalog?.hasMore ? <div ref={sentinelRef} className="h-4" aria-hidden /> : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                    <p className="text-sm text-ink-muted">
                      Showing {posts.length.toLocaleString()} of{" "}
                      {(catalog?.total ?? posts.length).toLocaleString()}
                      <span className="mx-1.5 text-border">·</span>
                      Page {loadedPage} of {totalPages}
                      {loadingMore ? " · Loading…" : ""}
                    </p>
                    {catalog?.hasMore ? (
                      <button
                        type="button"
                        disabled={loadingMore}
                        onClick={() => void loadMore()}
                        className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-ink transition hover:border-border-strong disabled:opacity-50"
                      >
                        {loadingMore ? "Loading…" : "Load next page"}
                      </button>
                    ) : (
                      <p className="text-xs font-semibold text-ink-muted">End of feed</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <SponsoredPanel learners={spotlight} />
            </div>
          </div>
        </div>
      </div>

      <ComposePostDialog
        open={composeOpen}
        initialKind={composeKind}
        onClose={() => setComposeOpen(false)}
        onQueue={queuePost}
      />
      <QuotePostDialog
        open={quoteTarget !== null}
        post={quoteTarget}
        onClose={() => setQuoteTarget(null)}
        onQueue={queueQuote}
      />
      <EditPostDialog
        open={editTarget !== null}
        post={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={(next) => patchPost(next.id, next)}
      />
      <ReportDialog
        open={reportTarget !== null}
        target={
          reportTarget
            ? { type: "post", id: reportTarget.id, label: reportTarget.title }
            : null
        }
        onClose={() => setReportTarget(null)}
      />
    </div>
  );
}
