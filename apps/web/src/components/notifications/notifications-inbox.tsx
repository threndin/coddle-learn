"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  NOTIFICATION_FILTER_LABELS,
  NOTIFICATION_FILTERS,
  type NotificationFilter,
} from "@coddle/shared";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import { useUnreadNotifications } from "@/components/notifications/notifications-context";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
  type NotificationsPage,
} from "@/lib/notifications";

function formatRelative(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const delta = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < minute) return "Just now";
  if (delta < hour) {
    const n = Math.floor(delta / minute);
    return `${n}m ago`;
  }
  if (delta < day) {
    const n = Math.floor(delta / hour);
    return `${n}h ago`;
  }
  if (delta < 7 * day) {
    const n = Math.floor(delta / day);
    return `${n}d ago`;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function iconForType(type: string): IconName {
  switch (type) {
    case "welcome":
    case "onboarding_complete":
    case "login":
      return "sparkle";
    case "profile_updated":
      return "pencil";
    case "role_granted":
    case "review_decision":
      return "checkCircle";
    case "follow":
      return "users";
    case "community_comment":
    case "community_reply":
    case "community_post":
      return "message";
    case "community_reaction":
      return "star";
    case "community_quote":
      return "quote";
    case "mentor_application":
    case "mentor_application_update":
      return "users";
    case "achievement":
      return "trophy";
    case "course_complete":
    case "course_review":
    case "course_started":
      return "book";
    case "resource_saved":
    case "tool_saved":
      return "bookmark";
    case "roadmap_complete":
      return "target";
    case "assessment_passed":
    case "project_submitted":
      return "checkCircle";
    case "challenge_solved":
      return "keyboard";
    default:
      return "bell";
  }
}

function EmptyInboxArt() {
  return (
    <svg
      viewBox="0 0 200 160"
      className="mx-auto h-auto w-44 text-brand sm:w-52"
      role="img"
      aria-hidden
    >
      <ellipse cx="100" cy="148" rx="56" ry="8" className="fill-brand/10" />
      <path
        d="M48 52h104v64a12 12 0 0 1-12 12H60a12 12 0 0 1-12-12V52Z"
        className="fill-surface stroke-border"
        strokeWidth="2"
      />
      <path
        d="M48 52 100 92 152 52"
        className="fill-none stroke-brand"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="148" cy="40" r="14" className="fill-brand" />
      <path
        d="M148 33v9M148 47h.01"
        className="stroke-white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NotificationsInbox({
  initial,
}: {
  initial: NotificationsPage | null;
}) {
  const router = useRouter();
  const { setUnreadCount, refreshUnread } = useUnreadNotifications();
  const [page, setPage] = useState(initial);
  const [filter, setFilter] = useState<NotificationFilter>(initial?.filter ?? "all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initial === null);
  const [pendingAll, setPendingAll] = useState(false);
  const skipInitialLoad = useRef(initial !== null);

  useEffect(() => {
    if (initial?.unreadCount != null) setUnreadCount(initial.unreadCount);
  }, [initial, setUnreadCount]);

  async function load(nextFilter: NotificationFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications(nextFilter);
      setPage(data);
      setUnreadCount(data.unreadCount);
    } catch {
      setError("Could not load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    void load(filter);
    // Filter changes refetch; the first render uses server data when present.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const items = page?.notifications ?? [];
  const emptyCatalog = Boolean(page && page.total === 0 && filter === "all");

  async function onFilter(next: NotificationFilter) {
    if (next === filter) return;
    setFilter(next);
  }

  async function onMarkAll() {
    if (pendingAll || (page?.unreadCount ?? 0) === 0) return;
    setPendingAll(true);
    try {
      const result = await markAllNotificationsRead();
      setPage((prev) =>
        prev
          ? {
              ...prev,
              unreadCount: 0,
              notifications: prev.notifications.map((item) => ({
                ...item,
                readAt: item.readAt ?? new Date().toISOString(),
              })),
            }
          : prev,
      );
      setUnreadCount(result.unreadCount);
      if (filter === "unread") {
        setPage((prev) =>
          prev ? { ...prev, notifications: [], total: 0, hasMore: false } : prev,
        );
      }
    } catch {
      setError("Could not mark notifications as read");
    } finally {
      setPendingAll(false);
    }
  }

  async function loadMore() {
    if (!page?.hasMore) return;
    try {
      const next = await fetchNotifications(filter, page.page + 1);
      setPage({
        ...next,
        notifications: [...page.notifications, ...next.notifications],
      });
      setUnreadCount(next.unreadCount);
    } catch {
      setError("Could not load more notifications");
    }
  }

  async function onOpen(item: NotificationItem) {
    if (!item.readAt) {
      try {
        const result = await markNotificationRead(item.id);
        setUnreadCount(result.unreadCount);
        setPage((prev) =>
          prev
            ? {
                ...prev,
                unreadCount: result.unreadCount,
                notifications: prev.notifications.map((row) =>
                  row.id === item.id ? { ...row, readAt: result.notification.readAt } : row,
                ),
              }
            : prev,
        );
      } catch {
        void refreshUnread();
      }
    }
    if (item.href) router.push(item.href);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Notifications
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Stay in the loop
          </h1>
          <p className="mt-1 text-base leading-relaxed text-ink-muted">
            View your community, learning, mentorship, and account updates.
          </p>
        </div>
        {(page?.unreadCount ?? 0) > 0 ? (
          <button
            type="button"
            onClick={() => void onMarkAll()}
            disabled={pendingAll}
            className="inline-flex shrink-0 items-center justify-center self-start rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40 disabled:opacity-50 lg:self-end"
          >
            {pendingAll ? "Marking…" : "Mark all as read"}
          </button>
        ) : null}
      </div>

      <div className="mt-6 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="flex w-max min-w-full gap-1 rounded-xl border border-border bg-surface p-1 sm:w-auto sm:min-w-0">
          {NOTIFICATION_FILTERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => void onFilter(id)}
              className={[
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                filter === id ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {NOTIFICATION_FILTER_LABELS[id]}
              {id === "unread" && (page?.unreadCount ?? 0) > 0 ? (
                <span className="ml-1.5 font-mono tabular-nums">{page?.unreadCount}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-ink-muted">Loading notifications…</p>
      ) : error ? (
        <p className="mt-10 text-sm text-rose-600">{error}</p>
      ) : items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border px-4 py-14 text-center sm:py-16">
          <EmptyInboxArt />
          <h2 className="mt-6 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {emptyCatalog ? "You're all caught up" : "No notifications here"}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">
            {emptyCatalog
              ? "Comments, follows, mentorship, and learning milestones will show up here."
              : "Try a different filter."}
          </p>
          {emptyCatalog ? (
            <Link
              href="/community"
              className="mt-6 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Visit community
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((item) => {
            const unread = !item.readAt;
            const inner = (
              <>
                <span className="relative mt-0.5 shrink-0">
                  {item.actor ? (
                    <ProfileAvatar
                      name={item.actor.name}
                      avatarUrl={item.actor.avatarUrl}
                      size="sm"
                    />
                  ) : (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <Icon name={iconForType(item.type)} className="h-4 w-4" />
                    </span>
                  )}
                  {item.actor ? (
                    <span className="absolute -bottom-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-surface bg-brand-soft text-brand">
                      <Icon name={iconForType(item.type)} className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-display text-sm font-bold tracking-tight text-ink sm:text-base">
                      {item.title}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      {formatRelative(item.createdAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-ink-muted">
                    {item.body}
                  </span>
                </span>
                {unread ? (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />
                ) : (
                  <span className="mt-2 h-2 w-2 shrink-0" />
                )}
              </>
            );

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void onOpen(item)}
                  className={[
                    "flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-surface-subtle sm:px-5",
                    unread ? "bg-brand-soft/40" : "",
                  ].join(" ")}
                >
                  {inner}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {page?.hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40"
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}
