"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ADMIN_USER_STATUS_FILTERS,
  ADMIN_USER_STATUS_LABELS,
  ASSISTANT_WEEKLY_LIMIT,
  USER_ROLE_LABELS,
  USER_ROLES,
  type AdminUserRow,
  type AdminUsersPage,
} from "@coddle/shared";
import { useAppUser } from "@/components/app/app-user-context";
import { useToast } from "@/components/app/toast";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import {
  adminUsersQueryString,
  fetchAdminUsers,
  restoreAdminUser,
  suspendAdminUser,
  type AdminUsersQuery,
} from "@/lib/admin";
import { errorMessage } from "@/lib/api-client";
import { formatDate, timeAgo } from "@/lib/format";

export function AdminUsersView({
  initialQuery,
  initialPage,
}: {
  initialQuery: AdminUsersQuery;
  initialPage: AdminUsersPage | "forbidden" | null;
}) {
  const viewer = useAppUser();
  const { pushToast } = useToast();
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState<AdminUsersPage | null>(
    initialPage && initialPage !== "forbidden" ? initialPage : null,
  );
  const [failed, setFailed] = useState(initialPage === null);
  const [loading, setLoading] = useState(initialPage === null);
  const [pending, setPending] = useState<AdminUserRow | null>(null);
  const skipFirst = useRef(Boolean(initialPage && initialPage !== "forbidden"));

  useEffect(() => {
    if (initialPage === "forbidden") return;
    if (skipFirst.current) {
      skipFirst.current = false;
      const qs = adminUsersQueryString(query);
      window.history.replaceState(null, "", qs ? `/admin/users?${qs}` : "/admin/users");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          const data = await fetchAdminUsers(query, controller.signal);
          setPage(data);
          setFailed(false);
          const qs = adminUsersQueryString(query);
          window.history.replaceState(null, "", qs ? `/admin/users?${qs}` : "/admin/users");
        } catch {
          if (controller.signal.aborted) return;
          setFailed(true);
          setPage(null);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [initialPage, query]);

  if (initialPage === "forbidden") {
    return (
      <EmptyPanel
        title="Admins only"
        body="You need the admin role to look up people on this platform."
      />
    );
  }

  const total = page?.total ?? 0;
  const pageSize = page?.pageSize ?? 20;
  const current = page?.page ?? query.page;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  const counts = page?.counts ?? { all: 0, active: 0, suspended: 0 };
  const suspend = Boolean(pending && !pending.suspendedAt);

  async function confirmStatus() {
    if (!pending) return;
    try {
      const { user } = pending.suspendedAt
        ? await restoreAdminUser(pending.id)
        : await suspendAdminUser(pending.id);
      setPage((prev) => {
        if (!prev) return prev;
        const wasSuspended = Boolean(pending.suspendedAt);
        const nextSuspended = Boolean(user.suspendedAt);
        const delta = Number(nextSuspended) - Number(wasSuspended);
        return {
          ...prev,
          counts: {
            all: prev.counts.all,
            suspended: Math.max(0, prev.counts.suspended + delta),
            active: Math.max(0, prev.counts.active - delta),
          },
          users:
            query.status === "all"
              ? prev.users.map((row) => (row.id === user.id ? { ...row, ...user } : row))
              : prev.users.filter((row) => row.id !== user.id),
          total:
            query.status === "all" ? prev.total : Math.max(0, prev.total - 1),
        };
      });
      pushToast(
        user.suspendedAt ? `${user.name} is suspended.` : `${user.name} can sign in again.`,
        "success",
      );
      setPending(null);
    } catch (error) {
      pushToast(errorMessage(error, "Could not update that account."), "error");
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        {ADMIN_USER_STATUS_FILTERS.map((status) => {
          const active = query.status === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setQuery({ ...query, status, page: 1 })}
              className={[
                "rounded-2xl border p-4 text-left transition",
                active
                  ? "border-brand bg-brand-soft"
                  : "border-border bg-surface hover:border-brand/40",
              ].join(" ")}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                {ADMIN_USER_STATUS_LABELS[status]}
              </p>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums text-ink">
                {counts[status].toLocaleString()}
              </p>
            </button>
          );
        })}
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={query.q}
            onChange={(event) => setQuery({ ...query, q: event.target.value, page: 1 })}
            placeholder="Search name, username, or email"
            className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
          />
        </div>
        <div className="inline-flex flex-wrap rounded-xl border border-border bg-surface p-0.5">
          {(["all", ...USER_ROLES] as const).map((role) => {
            const active = query.role === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setQuery({ ...query, role, page: 1 })}
                className={[
                  "rounded-[10px] px-3 py-1.5 text-xs font-semibold transition",
                  active ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
                ].join(" ")}
              >
                {role === "all" ? "All roles" : USER_ROLE_LABELS[role]}
              </button>
            );
          })}
        </div>
      </div>

      {failed ? (
        <EmptyPanel title="Could not load users" body="Try searching again in a moment." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto_auto_auto] gap-3 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted lg:grid">
              <span>Person</span>
              <span>Email</span>
              <span>Role</span>
              <span>Status</span>
              <span>Last sign-in</span>
              <span className="text-right">Action</span>
            </div>
            {loading && !page ? (
              <p className="px-4 py-10 text-center text-sm text-ink-muted">Loading people…</p>
            ) : page && page.users.length === 0 ? (
              <div className="px-4 py-10">
                <EmptyPanel
                  title="No matching users"
                  body="Try a different name, email, role, or status filter."
                />
              </div>
            ) : (
              <ul className={loading ? "opacity-60" : undefined}>
                {page?.users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    self={user.id === viewer.id}
                    onToggle={() => setPending(user)}
                  />
                ))}
              </ul>
            )}
          </div>

          {total > 0 ? (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-xs font-semibold text-ink-muted">
                Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
              </p>
              <div className="flex gap-1">
                <PageButton
                  disabled={current <= 1}
                  onClick={() => setQuery({ ...query, page: current - 1 })}
                >
                  Previous
                </PageButton>
                <PageButton
                  disabled={current >= totalPages}
                  onClick={() => setQuery({ ...query, page: current + 1 })}
                >
                  Next
                </PageButton>
              </div>
            </div>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={suspend ? `Suspend ${pending?.name}?` : `Restore ${pending?.name}?`}
        description={
          suspend
            ? "They will be signed out immediately and cannot open Learn until you restore the account."
            : "They will be able to sign in with their Coddle account again."
        }
        confirmLabel={suspend ? "Suspend" : "Restore"}
        pendingLabel={suspend ? "Suspending…" : "Restoring…"}
        tone={suspend ? "danger" : "default"}
        onConfirm={confirmStatus}
        onClose={() => setPending(null)}
      />
    </div>
  );
}

function UserRow({
  user,
  self,
  onToggle,
}: {
  user: AdminUserRow;
  self: boolean;
  onToggle: () => void;
}) {
  const suspended = Boolean(user.suspendedAt);
  return (
    <li
      className={[
        "grid gap-3 border-t border-border px-4 py-3.5 first:border-t-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto_auto_auto] lg:items-center",
        suspended ? "bg-rose-50/60 dark:bg-rose-500/5" : "",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-3">
        <ProfileAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
        <div className="min-w-0">
          <ProfileLink
            user={user}
            className="block truncate text-sm font-semibold text-ink hover:text-brand"
          >
            {user.name}
          </ProfileLink>
          <p className="truncate font-mono text-xs text-ink-muted">
            @{user.username}
            {user.onboardingCompletedAt
              ? ` · ${user.points.toLocaleString()} pts`
              : " · Not onboarded"}
          </p>
        </div>
      </div>
      <p className="truncate text-sm text-ink-muted">{user.email}</p>
      <RoleBadge role={user.role} />
      <StatusBadge suspended={suspended} at={user.suspendedAt} />
      <div className="text-sm text-ink-muted">
        <p>{user.lastLoginAt ? timeAgo(user.lastLoginAt) : "Never"}</p>
        <p className="text-xs">
          Joined {formatDate(user.createdAt)}
          {` · AI ${user.assistantUsedThisWeek}/${ASSISTANT_WEEKLY_LIMIT}`}
        </p>
      </div>
      <div className="lg:text-right">
        {self ? (
          <span className="text-xs font-semibold text-ink-muted">You</span>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className={[
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
              suspended
                ? "bg-brand text-white hover:brightness-110"
                : "border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10",
            ].join(" ")}
          >
            {suspended ? "Restore" : "Suspend"}
          </button>
        )}
      </div>
    </li>
  );
}

function RoleBadge({ role }: { role: AdminUserRow["role"] }) {
  const tone =
    role === "admin"
      ? "bg-brand-soft text-brand"
      : role === "reviewer"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
        : "bg-surface-subtle text-ink-muted";
  return (
    <span className={`inline-flex w-max items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {USER_ROLE_LABELS[role]}
    </span>
  );
}

function StatusBadge({ suspended, at }: { suspended: boolean; at: string | null }) {
  return (
    <span
      className={[
        "inline-flex w-max items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        suspended
          ? "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200"
          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
      ].join(" ")}
      title={at ? `Suspended ${formatDate(at)}` : undefined}
    >
      {suspended ? "Suspended" : "Active"}
    </span>
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
      <Link
        href="/admin"
        className="mt-4 inline-flex text-sm font-semibold text-brand hover:underline"
      >
        Back to overview
      </Link>
    </div>
  );
}
