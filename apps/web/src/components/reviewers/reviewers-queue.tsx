"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  REVIEW_KIND_LABELS,
  REVIEW_KINDS,
  REVIEW_LIMITS,
  canReviewContent,
  levelById,
  type ReviewAction,
  type ReviewFilters,
  type ReviewKind,
  type ReviewQueue,
  type ReviewQueueItem,
  type ReviewTab,
} from "@coddle/shared";
import { useAppUser } from "@/components/app/app-user-context";
import { useToast } from "@/components/app/toast";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { ReviewStatusBadge } from "@/components/reviewers/review-status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon, type IconName } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import { timeAgo } from "@/lib/format";
import {
  decideReviewItem,
  fetchReviewQueue,
  reviewQueryString,
} from "@/lib/reviewers";

const KIND_ICONS: Record<ReviewKind, IconName> = {
  course: "book",
  project: "layers",
  resource: "link",
  tool: "target",
};

type PendingDecision = {
  action: ReviewAction;
  item: ReviewQueueItem;
};

export function ReviewersQueue({
  initialFilters,
  initialQueue,
}: {
  initialFilters: ReviewFilters;
  initialQueue: ReviewQueue | "forbidden" | null;
}) {
  const user = useAppUser();
  const { pushToast } = useToast();
  const allowed = canReviewContent(user.role);
  const [filters, setFilters] = useState(initialFilters);
  const [queue, setQueue] = useState<ReviewQueue | null>(
    initialQueue && initialQueue !== "forbidden" ? initialQueue : null,
  );
  const [loadFailed, setLoadFailed] = useState(initialQueue === null);
  const [loading, setLoading] = useState(initialQueue === null && allowed);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<PendingDecision | null>(null);
  const skipFirstFetch = useRef(Boolean(initialQueue && initialQueue !== "forbidden"));

  useEffect(() => {
    if (!allowed || initialQueue === "forbidden") return;
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      const query = reviewQueryString(filters);
      const next = query ? `/reviewers?${query}` : "/reviewers";
      window.history.replaceState(null, "", next);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await fetchReviewQueue(filters, 1, controller.signal);
          setQueue(data);
          setLoadFailed(false);
          const query = reviewQueryString(filters);
          const next = query ? `/reviewers?${query}` : "/reviewers";
          window.history.replaceState(null, "", next);
        } catch (error) {
          if (controller.signal.aborted) return;
          if (error instanceof Error && error.name === "AbortError") return;
          setLoadFailed(true);
        } finally {
          setLoading(false);
        }
      })();
    }, filters.q ? 250 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [allowed, filters, initialQueue]);

  function patchFilters(patch: Partial<ReviewFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  async function confirmDecision() {
    if (!pending) return;
    const { action, item } = pending;
    if (action !== "approve" && note.trim().length === 0) {
      pushToast("Add a short note so the author knows what to do next.", "error");
      return;
    }
    try {
      await decideReviewItem(item.kind, item.id, action, note);
      const data = await fetchReviewQueue(filters);
      setQueue(data);
      setPending(null);
      setNote("");
      pushToast(
        action === "approve"
          ? "Published"
          : action === "decline"
            ? "Declined"
            : "Flagged for follow-up",
        "success",
      );
    } catch (error) {
      pushToast(errorMessage(error), "error");
      throw error;
    }
  }

  const auto = queue?.reviewMode === "auto";

  if (!allowed || initialQueue === "forbidden") {
    return <ForbiddenState />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <div className="max-w-2xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Review
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Reviewers
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          Approve community courses, projects, resources, and tools before they reach the
          catalog, or decline and flag the ones that need another look.
        </p>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-ink-muted">Loading the review queue…</p>
      ) : loadFailed || !queue ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm text-ink-muted">
          Could not load the review queue. Refresh to try again.
        </p>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <StatTile
              icon="clock"
              label="Needs review"
              value={queue.counts.pending}
              active={filters.tab === "pending"}
              onClick={() => patchFilters({ tab: "pending" })}
            />
            <StatTile
              icon="alert"
              label="Flagged"
              value={queue.counts.flagged}
              active={filters.tab === "flagged"}
              onClick={() => patchFilters({ tab: "flagged" })}
            />
            <StatTile
              icon="checkCircle"
              label="Recent decisions"
              value={queue.counts.decided}
              active={filters.tab === "decided"}
              onClick={() => patchFilters({ tab: "decided" })}
            />
          </div>

          <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-5 max-h-36 overflow-y-auto overscroll-y-contain px-5 lg:mx-0 lg:max-h-none lg:overflow-visible lg:px-0">
              <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap">
                <KindChip
                  label="All"
                  count={REVIEW_KINDS.reduce((sum, kind) => sum + queue.counts.kinds[kind], 0)}
                  active={filters.kind === "all"}
                  onClick={() => patchFilters({ kind: "all" })}
                />
                {REVIEW_KINDS.map((kind) => (
                  <KindChip
                    key={kind}
                    label={REVIEW_KIND_LABELS[kind]}
                    count={queue.counts.kinds[kind]}
                    active={filters.kind === kind}
                    onClick={() => patchFilters({ kind })}
                  />
                ))}
              </div>
            </div>
            <div className="relative w-full shrink-0 lg:w-64">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              />
              <input
                value={filters.q}
                onChange={(event) => patchFilters({ q: event.target.value })}
                placeholder="Search submissions"
                className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {queue.items.map((item) => (
              <ReviewRow
                key={`${item.kind}-${item.id}`}
                item={item}
                viewerId={user.id}
                onDecide={(action) => {
                  setNote("");
                  setPending({ action, item });
                }}
              />
            ))}
            {queue.items.length === 0 ? (
              <EmptyQueue tab={filters.tab} auto={Boolean(auto)} />
            ) : null}
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={dialogTitle(pending)}
        description={dialogDescription(pending)}
        confirmLabel={
          pending?.action === "approve"
            ? "Approve"
            : pending?.action === "decline"
              ? "Decline"
              : "Flag"
        }
        pendingLabel={
          pending?.action === "approve"
            ? "Publishing…"
            : pending?.action === "decline"
              ? "Declining…"
              : "Flagging…"
        }
        tone={pending?.action === "decline" ? "danger" : "default"}
        onConfirm={confirmDecision}
        onClose={() => {
          setPending(null);
          setNote("");
        }}
      >
        <label className="mt-4 block">
          <span className="text-xs font-semibold text-ink">
            {pending?.action === "approve" ? "Note (optional)" : "Note"}
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, REVIEW_LIMITS.noteMax))}
            rows={3}
            placeholder={
              pending?.action === "approve"
                ? "Optional message for the author"
                : pending?.action === "decline"
                  ? "What should the author change?"
                  : "Why does this need another look?"
            }
            className="mt-1.5 w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
          />
          <span className="mt-1 block text-right font-mono text-[11px] text-ink-muted">
            {note.length}/{REVIEW_LIMITS.noteMax}
          </span>
        </label>
      </ConfirmDialog>
    </div>
  );
}

function dialogTitle(pending: PendingDecision | null) {
  if (!pending) return "Review";
  const title = pending.item.title;
  if (pending.action === "approve") return `Approve “${title}”?`;
  if (pending.action === "decline") return `Decline “${title}”?`;
  return `Flag “${title}”?`;
}

function dialogDescription(pending: PendingDecision | null) {
  if (!pending) return null;
  if (pending.action === "approve") {
    return "This will appear in the public catalog.";
  }
  if (pending.action === "decline") {
    return pending.item.kind === "course" || pending.item.kind === "project"
      ? "The author will see your note and can submit again after they make changes."
      : "The listing will leave the catalog. The author will see your note.";
  }
  return "It stays in the queue as flagged so another reviewer can follow up. Status does not change.";
}

function StatTile({
  icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: IconName;
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border p-4 text-left transition",
        active
          ? "border-brand/40 bg-brand-soft"
          : "border-border bg-surface hover:border-border-strong",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 text-ink-muted">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tabular-nums tracking-tight text-ink">
        {value.toLocaleString()}
      </p>
    </button>
  );
}

function KindChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "bg-brand text-white"
          : "border border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
      ].join(" ")}
    >
      {label}
      <span className="font-mono text-[10px] tabular-nums">{count}</span>
    </button>
  );
}

function ReviewRow({
  item,
  viewerId,
  onDecide,
}: {
  item: ReviewQueueItem;
  viewerId: string;
  onDecide: (action: ReviewAction) => void;
}) {
  const own = item.submittedBy?.id === viewerId;
  const level = item.meta.level ? (levelById(item.meta.level)?.label ?? item.meta.level) : null;
  const decided = item.status === "published" || item.status === "rejected" || item.status === "changes_requested";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-3 transition hover:border-border-strong sm:flex-row sm:items-center sm:p-4">
      <PreviewThumb item={item} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            <Icon name={KIND_ICONS[item.kind]} className="h-3.5 w-3.5" />
            {REVIEW_KIND_LABELS[item.kind]}
          </span>
          <ReviewStatusBadge status={item.status} />
          {item.flagged ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
              <Icon name="alert" className="h-3 w-3" />
              Flagged
            </span>
          ) : null}
          {level ? (
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {level}
            </span>
          ) : null}
          {own ? (
            <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
              You submitted this
            </span>
          ) : null}
        </div>
        <h2 className="mt-1.5 truncate font-display text-lg font-bold tracking-tight text-ink">
          {item.title}
        </h2>
        <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">
          {item.summary || "No summary yet."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          {item.submittedBy ? (
            <ProfileLink
              user={item.submittedBy}
              className="inline-flex items-center gap-1.5 hover:text-ink"
            >
              <ProfileAvatar
                name={item.submittedBy.name}
                avatarUrl={item.submittedBy.avatarUrl}
                size="sm"
              />
              {item.submittedBy.name}
            </ProfileLink>
          ) : (
            <span>Catalog</span>
          )}
          <span>Submitted {timeAgo(item.submittedAt ?? item.createdAt)}</span>
          {item.skills.slice(0, 3).map((skill) => (
            <span key={skill.slug}>{skill.name}</span>
          ))}
        </div>
        {item.flagNote ? (
          <p className="mt-2 line-clamp-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <span className="font-semibold">Flag: </span>
            {item.flagNote}
          </p>
        ) : null}
        {item.reviewNote && decided ? (
          <p className="mt-2 line-clamp-2 rounded-lg bg-surface-subtle px-3 py-2 text-xs text-ink-muted">
            <span className="font-semibold text-ink">Reviewer: </span>
            {item.reviewNote}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-3 sm:border-0 sm:pt-0">
        <PreviewLink item={item} />
        {item.status !== "published" || item.flagged ? (
          <button
            type="button"
            onClick={() => onDecide("approve")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Icon name="check" className="h-3.5 w-3.5" />
            Approve
          </button>
        ) : null}
        {item.status !== "rejected" && item.status !== "changes_requested" ? (
          <button
            type="button"
            onClick={() => onDecide("decline")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-rose-300 hover:text-rose-700"
          >
            <Icon name="x" className="h-3.5 w-3.5" />
            Decline
          </button>
        ) : null}
        {!item.flagged ? (
          <button
            type="button"
            onClick={() => onDecide("flag")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-amber-300 hover:text-amber-800"
          >
            <Icon name="alert" className="h-3.5 w-3.5" />
            Flag
          </button>
        ) : null}
      </div>
    </article>
  );
}

function PreviewThumb({ item }: { item: ReviewQueueItem }) {
  if (item.imageUrl) {
    return (
      <div className="relative aspect-[1200/630] w-full shrink-0 overflow-hidden rounded-xl bg-surface-subtle sm:w-44">
        {/* Catalog and CDN hosts vary with config. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex aspect-[1200/630] w-full shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand sm:h-24 sm:w-44 sm:aspect-auto">
      <Icon name={KIND_ICONS[item.kind]} className="h-7 w-7" />
    </div>
  );
}

function PreviewLink({ item }: { item: ReviewQueueItem }) {
  const className =
    "inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-border-strong hover:bg-surface-subtle";
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" className={className}>
        <Icon name="external" className="h-3.5 w-3.5" />
        Open
      </a>
    );
  }
  return (
    <Link href={item.href} className={className}>
      <Icon name="eye" className="h-3.5 w-3.5" />
      Preview
    </Link>
  );
}

function EmptyQueue({ tab, auto }: { tab: ReviewTab; auto: boolean }) {
  const copy: Record<ReviewTab, { title: string; body: string }> = {
    pending: {
      title: "Nothing waiting for review",
      body: auto
        ? "New submissions publish automatically right now. Switch review mode to manual so they land here first, or flag a published listing if it needs a second look."
        : "When someone submits a course, project, resource, or tool, it will show up here.",
    },
    flagged: {
      title: "No flagged listings",
      body: "Flag a submission when it needs another reviewer or a closer look. It stays in the queue until someone approves or declines it.",
    },
    decided: {
      title: "No recent decisions",
      body: "Approvals and declines from the last 60 days will appear here.",
    },
  };
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
      <h2 className="font-display text-lg font-bold text-ink">{copy[tab].title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
        {copy[tab].body}
      </p>
    </div>
  );
}

function ForbiddenState() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start px-5 py-16 sm:px-8">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        Review
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Reviewers only
      </h1>
      <p className="mt-3 max-w-lg text-base leading-relaxed text-ink-muted">
        This queue is for people with the reviewer role. If you should be able to moderate
        submissions, ask an admin to add your email to the reviewer list.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
