"use client";

import Link from "next/link";
import { USER_ROLE_LABELS, type AdminOverview, type UserRole } from "@coddle/shared";
import {
  AreaChart,
  BarChart,
  ProgressRing,
  Sparkline,
  weekLabel,
} from "@/components/admin/admin-charts";
import { Icon, type IconName } from "@/components/ui/icon";
import { formatDate, pluralize } from "@/lib/format";

const ROLE_ORDER: UserRole[] = ["learner", "reviewer", "admin"];

export function AdminOverviewView({
  overview,
}: {
  overview: AdminOverview | "forbidden" | null;
}) {
  if (overview === "forbidden" || overview === null) {
    return (
      <EmptyPanel
        title={overview === null ? "Could not load overview" : "Admins only"}
        body={
          overview === null
            ? "The admin API did not return platform stats. Try again in a moment."
            : "You need the admin role to see these numbers."
        }
      />
    );
  }

  const { users, learning, assistant } = overview;
  const weeks = overview.weeks ?? [];
  const signupPoints = weeks.map((week) => ({
    label: weekLabel(week.weekStart),
    value: week.signups,
    hint: `${week.signups} new accounts`,
  }));
  const sendPoints = weeks.map((week) => ({
    label: weekLabel(week.weekStart),
    value: week.assistantSends,
    hint: `${week.assistantSends} sends · ${week.assistantUsers} people`,
  }));
  const activePct = percent(users.activeThisWeek, users.total);
  const onboardPct = percent(users.onboarded, users.total);
  const quotaPct = percent(assistant.atQuota, assistant.usersThisWeek);

  return (
    <div className="space-y-8">
      <section>
        <SectionHead
          title="This week"
          hint={`Updated ${formatDate(overview.generatedAt)}`}
          href="/admin/users"
          hrefLabel="View users"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Total users
                </p>
                <p className="mt-2 font-display text-4xl font-bold tabular-nums tracking-tight text-ink">
                  {users.total.toLocaleString()}
                </p>
                <p className="mt-2 inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                  +{users.newThisWeek.toLocaleString()} this week
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon name="users" className="h-5 w-5" />
              </span>
            </div>
            <Sparkline
              values={weeks.map((week) => week.signups)}
              className="mt-5 h-10 w-full text-brand"
            />
          </article>

          <article className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Signed in
                </p>
                <p className="mt-2 font-display text-4xl font-bold tabular-nums tracking-tight text-ink">
                  {users.activeThisWeek.toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-ink-muted">{activePct}% of accounts</p>
              </div>
              <ProgressRing value={users.activeThisWeek} total={users.total} />
            </div>
            <RoleMix byRole={users.byRole} total={users.total} />
          </article>

          <article className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Onboarded
                </p>
                <p className="mt-2 font-display text-4xl font-bold tabular-nums tracking-tight text-ink">
                  {users.onboarded.toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  {Math.max(0, users.total - users.onboarded).toLocaleString()} still setting up
                </p>
              </div>
              <ProgressRing value={users.onboarded} total={users.total} />
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-subtle">
              <div className="h-full rounded-full bg-brand" style={{ width: `${onboardPct}%` }} />
            </div>
          </article>

          <article className="relative overflow-hidden rounded-2xl p-5 text-white gradient-primary">
            <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
                  AI sends
                </p>
                <p className="mt-2 font-display text-4xl font-bold tabular-nums tracking-tight">
                  {assistant.sendsThisWeek.toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-white/75">
                  {pluralize(assistant.usersThisWeek, "learner")} · {assistant.atQuota} at quota
                  {assistant.usersThisWeek > 0 ? ` (${quotaPct}%)` : ""}
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Icon name="sparkle" className="h-5 w-5" />
              </span>
            </div>
            <Link
              href="/admin/usage"
              className="relative mt-6 inline-flex text-xs font-semibold text-white/90 underline-offset-2 hover:underline"
            >
              Open AI usage
            </Link>
          </article>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <AreaChart points={signupPoints} title="New accounts" valueLabel="signups" />
        <BarChart points={sendPoints} title="AI chat usage" valueLabel="sends" />
      </section>

      <section>
        <SectionHead title="Learning" />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <ProgressPanel
            icon="layers"
            title="Roadmaps"
            started={learning.roadmapsStarted}
            completed={learning.roadmapsCompleted}
            startedLabel="started"
            completedLabel="completed"
          />
          <ProgressPanel
            icon="book"
            title="Courses"
            started={learning.courseEnrollments}
            completed={learning.coursesCompleted}
            startedLabel="enrolled"
            completedLabel="completed"
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat icon="checkCircle" label="Assessments passed" value={learning.assessmentsPassed} />
          <MiniStat icon="message" label="Community posts" value={learning.communityPosts} />
          <MiniStat
            icon="alert"
            label="Pending reviews"
            value={learning.pendingReviews}
            href="/reviewers"
            tone="warn"
          />
          <article className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Published catalog
            </p>
            <dl className="mt-3 space-y-2">
              <CatalogRow label="Courses" value={learning.publishedCourses} />
              <CatalogRow label="Resources" value={learning.publishedResources} />
              <CatalogRow label="Projects" value={learning.publishedProjects} />
            </dl>
          </article>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          {pluralize(assistant.conversations, "assistant conversation")} ·{" "}
          {pluralize(assistant.messages, "message")} stored · quota resets{" "}
          {formatDate(assistant.resetsAt)}.
        </p>
      </section>
    </div>
  );
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function RoleMix({
  byRole,
  total,
}: {
  byRole: Record<UserRole, number>;
  total: number;
}) {
  return (
    <div className="mt-5">
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-subtle">
        {ROLE_ORDER.map((role) => {
          const width = percent(byRole[role], total);
          if (width <= 0) return null;
          const tone =
            role === "admin" ? "bg-brand" : role === "reviewer" ? "bg-brand-light" : "bg-brand-soft";
          return <span key={role} className={tone} style={{ width: `${width}%` }} />;
        })}
      </div>
      <p className="mt-2 text-[11px] text-ink-muted">
        {ROLE_ORDER.map((role) => {
          const count = byRole[role];
          const label = USER_ROLE_LABELS[role].toLowerCase();
          return `${count} ${count === 1 ? label : `${label}s`}`;
        }).join(" · ")}
      </p>
    </div>
  );
}

function ProgressPanel({
  icon,
  title,
  started,
  completed,
  startedLabel,
  completedLabel,
}: {
  icon: IconName;
  title: string;
  started: number;
  completed: number;
  startedLabel: string;
  completedLabel: string;
}) {
  const pct = percent(completed, started);
  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
          <p className="text-xs text-ink-muted">
            {started.toLocaleString()} {startedLabel}
          </p>
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="font-display text-3xl font-bold tabular-nums text-ink">
          {completed.toLocaleString()}
          <span className="ml-1 text-sm font-semibold text-ink-muted">{completedLabel}</span>
        </p>
        <p className="text-sm font-semibold text-brand">{pct}%</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-subtle">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </article>
  );
}

function MiniStat({
  icon,
  label,
  value,
  href,
  tone,
}: {
  icon: IconName;
  label: string;
  value: number;
  href?: string;
  tone?: "warn";
}) {
  const inner = (
    <>
      <span
        className={[
          "flex h-9 w-9 items-center justify-center rounded-xl",
          tone === "warn"
            ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
            : "bg-brand-soft text-brand",
        ].join(" ")}
      >
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">
        {value.toLocaleString()}
      </p>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/40"
      >
        {inner}
      </Link>
    );
  }
  return <article className="rounded-2xl border border-border bg-surface p-4">{inner}</article>;
}

function CatalogRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold tabular-nums text-ink">{value.toLocaleString()}</dd>
    </div>
  );
}

function SectionHead({
  title,
  hint,
  href,
  hrefLabel,
}: {
  title: string;
  hint?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
      </div>
      {href && hrefLabel ? (
        <Link href={href} className="text-xs font-semibold text-brand hover:underline">
          {hrefLabel}
        </Link>
      ) : null}
    </div>
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
