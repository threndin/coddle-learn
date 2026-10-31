"use client";

import { useEffect, useRef, useState } from "react";
import {
  type AdminConversationRow,
  type AdminUsage,
  type AdminUsageUser,
} from "@coddle/shared";
import {
  AreaChart,
  BarChart,
  ProgressRing,
  weekLabel,
} from "@/components/admin/admin-charts";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { Icon } from "@/components/ui/icon";
import { adminUsageQueryString, fetchAdminUsage, type AdminUsageQuery } from "@/lib/admin";
import { formatDate, pluralize, timeAgo } from "@/lib/format";

export function AdminUsageView({
  initialQuery,
  initialUsage,
}: {
  initialQuery: AdminUsageQuery;
  initialUsage: AdminUsage | "forbidden" | null;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [usage, setUsage] = useState<AdminUsage | null>(
    initialUsage && initialUsage !== "forbidden" ? initialUsage : null,
  );
  const [failed, setFailed] = useState(initialUsage === null);
  const [loading, setLoading] = useState(initialUsage === null);
  const skipFirst = useRef(Boolean(initialUsage && initialUsage !== "forbidden"));

  useEffect(() => {
    if (initialUsage === "forbidden") return;
    if (skipFirst.current) {
      skipFirst.current = false;
      const qs = adminUsageQueryString(query);
      window.history.replaceState(null, "", qs ? `/admin/usage?${qs}` : "/admin/usage");
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        setLoading(true);
        const data = await fetchAdminUsage(query, controller.signal);
        setUsage(data);
        setFailed(false);
        const qs = adminUsageQueryString(query);
        window.history.replaceState(null, "", qs ? `/admin/usage?${qs}` : "/admin/usage");
      } catch {
        if (!controller.signal.aborted) {
          setFailed(true);
          setUsage(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [initialUsage, query]);

  if (initialUsage === "forbidden") {
    return (
      <EmptyPanel
        title="Admins only"
        body="You need the admin role to track assistant usage."
      />
    );
  }

  if (failed && !usage) {
    return (
      <EmptyPanel title="Could not load usage" body="The assistant usage API did not respond." />
    );
  }

  if (!usage) {
    return <p className="text-sm text-ink-muted">Loading AI chat usage…</p>;
  }

  const totalPages = Math.max(1, Math.ceil(usage.totalUsers / usage.pageSize));
  const from = usage.totalUsers === 0 ? 0 : (usage.page - 1) * usage.pageSize + 1;
  const to = Math.min(usage.page * usage.pageSize, usage.totalUsers);
  const quotaPct =
    usage.usersThisWeek === 0 ? 0 : Math.round((usage.atQuota / usage.usersThisWeek) * 100);
  const sendPoints = usage.weeks.map((week) => ({
    label: weekLabel(week.weekStart),
    value: week.sends,
    hint: `${week.sends} sends · ${week.users} people`,
  }));
  const userPoints = usage.weeks.map((week) => ({
    label: weekLabel(week.weekStart),
    value: week.users,
    hint: `${week.users} people · ${week.atQuota} at quota`,
  }));

  return (
    <div className={`space-y-8 ${loading ? "opacity-70" : ""}`}>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="relative overflow-hidden rounded-2xl p-5 text-white gradient-primary">
          <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
            Sends this week
          </p>
          <p className="mt-2 font-display text-4xl font-bold tabular-nums tracking-tight">
            {usage.sendsThisWeek.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-white/75">
            {usage.weeklyLimit} send limit / learner · resets {formatDate(usage.resetsAt)}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                People who chatted
              </p>
              <p className="mt-2 font-display text-4xl font-bold tabular-nums tracking-tight text-ink">
                {usage.usersThisWeek.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-ink-muted">Used the assistant this week</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon name="users" className="h-5 w-5" />
            </span>
          </div>
        </article>
        <article className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                At weekly quota
              </p>
              <p className="mt-2 font-display text-4xl font-bold tabular-nums tracking-tight text-ink">
                {usage.atQuota.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                {quotaPct}% of this week’s users
              </p>
            </div>
            <ProgressRing value={usage.atQuota} total={Math.max(1, usage.usersThisWeek)} />
          </div>
        </article>
        <article className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Conversations
          </p>
          <p className="mt-2 font-display text-4xl font-bold tabular-nums tracking-tight text-ink">
            {usage.conversations.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            {usage.conversationsThisWeek.toLocaleString()} started this week ·{" "}
            {pluralize(usage.messages, "message")}
          </p>
        </article>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <AreaChart points={sendPoints} title="Assistant sends" valueLabel="sends" />
        <BarChart
          points={userPoints}
          title="People chatting"
          valueLabel="users"
          hint="Unique learners who sent a quota message"
        />
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">This week’s users</h2>
            <p className="mt-1 text-sm text-ink-muted">
              People who sent at least one assistant message since {formatDate(usage.weekStart)}.
            </p>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          {usage.users.length === 0 ? (
            <div className="px-4 py-10">
              <EmptyPanel
                title="No assistant sends this week"
                body="When learners use the AI assistant, their quota usage will show up here."
              />
            </div>
          ) : (
            <ul>
              {usage.users.map((user) => (
                <UsageUserRow key={user.id} user={user} limit={usage.weeklyLimit} />
              ))}
            </ul>
          )}
        </div>
        {usage.totalUsers > 0 ? (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs font-semibold text-ink-muted">
              Showing {from.toLocaleString()}–{to.toLocaleString()} of{" "}
              {usage.totalUsers.toLocaleString()}
            </p>
            <div className="flex gap-1">
              <PageButton
                disabled={usage.page <= 1}
                onClick={() => setQuery({ page: usage.page - 1 })}
              >
                Previous
              </PageButton>
              <PageButton
                disabled={usage.page >= totalPages}
                onClick={() => setQuery({ page: usage.page + 1 })}
              >
                Next
              </PageButton>
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="font-display text-lg font-bold text-ink">Recent conversations</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Titles and activity only — message contents stay private to the learner.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {usage.recentConversations.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-ink-muted md:col-span-2">
              No assistant conversations yet.
            </p>
          ) : (
            usage.recentConversations.map((row) => (
              <ConversationCard key={row.id} row={row} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function UsageUserRow({ user, limit }: { user: AdminUsageUser; limit: number }) {
  const percent = Math.min(100, Math.round((user.used / limit) * 100));
  return (
    <li className="flex flex-col gap-3 border-t border-border px-4 py-3.5 first:border-t-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ProfileAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
        <div className="min-w-0">
          <ProfileLink
            user={user}
            className="block truncate text-sm font-semibold text-ink hover:text-brand"
          >
            {user.name}
          </ProfileLink>
          <p className="truncate text-xs text-ink-muted">
            @{user.username} · {user.email}
          </p>
        </div>
      </div>
      <div className="sm:w-56">
        <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
          <span>
            {user.used}/{limit} sends
          </span>
          <span className={percent >= 100 ? "text-rose-600" : undefined}>
            {percent >= 100 ? "At quota" : `${user.remaining} left`}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-subtle">
          <div
            className={percent >= 100 ? "h-full bg-rose-500" : "h-full bg-brand"}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-ink-muted sm:w-40 sm:text-right">
        {pluralize(user.conversations, "thread")}
        {user.lastActiveAt ? ` · ${timeAgo(user.lastActiveAt)}` : ""}
      </p>
    </li>
  );
}

function ConversationCard({ row }: { row: AdminConversationRow }) {
  return (
    <article className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
      <ProfileAvatar name={row.user.name} avatarUrl={row.user.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{row.title}</p>
        <p className="mt-1 text-xs text-ink-muted">
          <ProfileLink user={row.user} className="font-semibold hover:text-brand">
            {row.user.name}
          </ProfileLink>
          {" · "}
          {pluralize(row.messageCount, "message")}
          {" · "}
          {timeAgo(row.updatedAt)}
        </p>
      </div>
    </article>
  );
}

function PageButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-w-9 items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-semibold text-ink transition hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
