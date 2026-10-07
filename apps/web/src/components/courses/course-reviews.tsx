"use client";

import { useCallback, useEffect, useState } from "react";
import { COURSE_LIMITS, type ReviewSort } from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { StarInput, Stars, starLabel } from "@/components/ui/stars";
import { errorMessage } from "@/lib/api-client";
import {
  deleteCourseReview,
  fetchCourseReviews,
  saveCourseReview,
  type CourseRating,
  type CourseReview,
  type CourseReviewsPage,
} from "@/lib/courses";
import { pluralize, timeAgo } from "@/lib/format";

const SORT_LABELS: Record<ReviewSort, string> = {
  recent: "Most recent",
  highest: "Highest rated",
  lowest: "Lowest rated",
};

export function CourseReviews({
  slug,
  onSummaryChange,
  onStartCourse,
}: {
  slug: string;
  onSummaryChange: (rating: CourseRating) => void;
  onStartCourse?: () => void;
}) {
  const { pushToast } = useToast();
  const [data, setData] = useState<CourseReviewsPage | null>(null);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(
    async (nextSort: ReviewSort) => {
      setLoading(true);
      try {
        const page = await fetchCourseReviews(slug, nextSort, 1);
        setData(page);
        setReviews(page.reviews);
      } catch (error) {
        pushToast(errorMessage(error, "Could not load reviews"), "error");
      } finally {
        setLoading(false);
      }
    },
    [pushToast, slug],
  );

  useEffect(() => {
    let cancelled = false;
    fetchCourseReviews(slug, "recent", 1)
      .then((page) => {
        if (cancelled) return;
        setData(page);
        setReviews(page.reviews);
      })
      .catch((error) => {
        if (!cancelled) pushToast(errorMessage(error, "Could not load reviews"), "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pushToast, slug]);

  function changeSort(next: ReviewSort) {
    setSort(next);
    void load(next);
  }

  async function loadMore() {
    if (!data?.hasMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchCourseReviews(slug, sort, data.page + 1);
      setData(page);
      setReviews((prev) => [...prev, ...page.reviews.filter((r) => !prev.some((p) => p.id === r.id))]);
    } catch (error) {
      pushToast(errorMessage(error), "error");
    } finally {
      setLoadingMore(false);
    }
  }

  async function submit(rating: number, body: string) {
    const result = await saveCourseReview(slug, { rating, body });
    onSummaryChange({ average: result.summary.average, count: result.summary.count });
    pushToast(data?.myReview ? "Review updated" : "Thanks for reviewing!", "success");
    setEditing(false);
    await load(sort);
  }

  async function remove() {
    try {
      const result = await deleteCourseReview(slug);
      onSummaryChange({ average: result.summary.average, count: result.summary.count });
      pushToast("Review deleted", "success");
      setConfirmDelete(false);
      await load(sort);
    } catch (error) {
      pushToast(errorMessage(error), "error");
    }
  }

  const summary = data?.summary;
  const mine = data?.myReview ?? null;
  const eligibility = data?.eligibility;
  const others = reviews.filter((review) => !review.isMine);

  return (
    <section id="reviews" className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Learner reviews
          </p>
          {summary && summary.count > 0 ? (
            <>
              <div className="mt-3 flex items-end gap-2">
                <span className="font-display text-5xl font-extrabold leading-none tracking-tight text-ink tabular-nums">
                  {summary.average.toFixed(1)}
                </span>
                <span className="pb-1 text-sm font-semibold text-ink-muted">/ 5</span>
              </div>
              <div className="mt-2">
                <Stars value={summary.average} size="md" />
              </div>
              <p className="mt-1.5 text-sm text-ink-muted">
                {starLabel(summary.average)} · {pluralize(summary.count, "review")}
              </p>
              <ul className="mt-5 space-y-1.5">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = summary.distribution[star];
                  const pct = summary.count ? (count / summary.count) * 100 : 0;
                  return (
                    <li key={star} className="flex items-center gap-2.5 text-xs">
                      <span className="flex w-7 items-center gap-0.5 font-semibold tabular-nums text-ink-muted">
                        {star}
                        <Icon name="star" className="h-3 w-3 text-amber-400" filled />
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-subtle">
                        <span
                          className="block h-full rounded-full bg-amber-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="w-6 text-right tabular-nums text-ink-muted">{count}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : loading && !data ? (
            <div className="mt-4 space-y-2">
              <div className="h-10 w-24 animate-pulse rounded-lg bg-surface-subtle" />
              <div className="h-4 w-32 animate-pulse rounded bg-surface-subtle" />
            </div>
          ) : (
            <div className="mt-3">
              <Stars value={0} size="md" />
              <p className="mt-2 text-sm text-ink-muted">No reviews yet.</p>
            </div>
          )}

          {eligibility && !mine && !editing ? (
            <div className="mt-6">
              {eligibility.canReview ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  <Icon name="pencil" className="h-4 w-4" />
                  Write a review
                </button>
              ) : eligibility.reason === "not_enrolled" ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-xs leading-relaxed text-ink-muted">
                  Start this course to share what you think.
                  {onStartCourse ? (
                    <button
                      type="button"
                      onClick={onStartCourse}
                      className="mt-2 block font-semibold text-brand"
                    >
                      Start course →
                    </button>
                  ) : null}
                </div>
              ) : eligibility.reason === "creator" ? (
                <p className="rounded-xl bg-surface-subtle p-4 text-xs leading-relaxed text-ink-muted">
                  You created this course, so you can read reviews but not leave one.
                </p>
              ) : (
                <p className="rounded-xl bg-surface-subtle p-4 text-xs leading-relaxed text-ink-muted">
                  Reviews open once the course is published.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          {editing ? (
            <ReviewForm
              initial={mine}
              onCancel={() => setEditing(false)}
              onSubmit={submit}
            />
          ) : mine ? (
            <ReviewCard
              review={mine}
              highlight
              actions={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
                  >
                    <Icon name="pencil" className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-ink-muted transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              }
            />
          ) : null}

          {(summary?.count ?? 0) > (mine ? 1 : 0) ? (
            <div className={`${mine || editing ? "mt-6" : ""} flex items-center justify-between gap-3`}>
              <p className="text-sm font-semibold text-ink">
                {mine ? "Other reviews" : "What learners say"}
              </p>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                Sort
                <select
                  value={sort}
                  onChange={(event) => changeSort(event.target.value as ReviewSort)}
                  className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none"
                >
                  {(Object.keys(SORT_LABELS) as ReviewSort[]).map((key) => (
                    <option key={key} value={key}>
                      {SORT_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <div className={`space-y-3 ${others.length ? "mt-4" : ""} ${loading ? "opacity-60" : ""}`}>
            {others.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          {!loading && summary?.count === 0 && !editing ? (
            <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
              <Icon name="star" className="h-7 w-7 text-amber-400" filled />
              <p className="mt-3 text-sm font-semibold text-ink">Be the first to review</p>
              <p className="mt-1 max-w-xs text-xs text-ink-muted">
                Honest reviews help other learners choose and help the creator improve the course.
              </p>
            </div>
          ) : null}

          {data?.hasMore ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              className="mt-4 w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Show more reviews"}
            </button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete your review?"
        description="Your rating and comment will be removed from this course."
        confirmLabel="Delete review"
        pendingLabel="Deleting…"
        tone="danger"
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </section>
  );
}

function ReviewForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: CourseReview | null;
  onCancel: () => void;
  onSubmit: (rating: number, body: string) => Promise<void>;
}) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!rating || pending) return;
    setPending(true);
    setError(null);
    try {
      await onSubmit(rating, body.trim());
    } catch (err) {
      setError(errorMessage(err, "Could not save your review"));
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-brand/40 bg-brand-soft/30 p-5 ring-4 ring-brand/5"
    >
      <p className="text-sm font-semibold text-ink">
        {initial ? "Update your review" : "How was this course?"}
      </p>
      <div className="mt-3">
        <StarInput value={rating} onChange={setRating} disabled={pending} />
      </div>
      <div className="mt-4">
        <textarea
          rows={4}
          value={body}
          disabled={pending}
          maxLength={COURSE_LIMITS.reviewBodyMax}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What worked well? What could be clearer? Who would you recommend it to? (optional)"
          className="w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-muted/80 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
        <p className="mt-1 text-right font-mono text-[11px] text-ink-muted">
          {body.length}/{COURSE_LIMITS.reviewBodyMax}
        </p>
      </div>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-muted transition hover:bg-surface hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!rating || pending}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Saving…" : initial ? "Update review" : "Post review"}
        </button>
      </div>
    </form>
  );
}

function ReviewCard({
  review,
  highlight = false,
  actions,
}: {
  review: CourseReview;
  highlight?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <article
      className={[
        "rounded-2xl border p-5",
        highlight ? "border-brand/30 bg-brand-soft/20" : "border-border bg-surface",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <ProfileAvatar name={review.author.name} avatarUrl={review.author.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-ink">
              {highlight ? "Your review" : review.author.name}
            </p>
            {review.completedCourse ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} />
                Completed course
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Stars value={review.rating} size="xs" />
            <span className="text-[11px] text-ink-muted">
              {timeAgo(review.updatedAt)}
              {review.edited ? " · edited" : ""}
            </span>
          </div>
        </div>
        {actions}
      </div>
      {review.body ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
          {review.body}
        </p>
      ) : null}
    </article>
  );
}
