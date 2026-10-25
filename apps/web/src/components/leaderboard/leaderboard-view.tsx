import type { ReactNode } from "react";
import Link from "next/link";
import {
  LEADERBOARD_PERIOD_LABELS,
  LEADERBOARD_PERIODS,
  levelById,
  type LeaderboardPeriod,
} from "@coddle/shared";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { Icon } from "@/components/ui/icon";
import {
  formatLeaderboardPeriodRange,
  leaderboardPageItems,
  leaderboardPath,
  type LeaderboardCatalog,
  type LeaderboardEntry,
} from "@/lib/leaderboard";

const PODIUM_PLACES = [1, 2, 3] as const;
const PODIUM_ORDER = ["order-2", "order-1", "order-3"] as const;

const PODIUM_RING = [
  "ring-4 ring-amber-300 shadow-[0_16px_40px_-16px_rgb(251_191_36_/_0.7)]",
  "ring-4 ring-slate-300 shadow-[0_12px_32px_-16px_rgb(148_163_184_/_0.75)]",
  "ring-4 ring-orange-400 shadow-[0_12px_32px_-16px_rgb(251_146_60_/_0.6)]",
] as const;

const PODIUM_BADGE = [
  "bg-amber-300 text-amber-950",
  "bg-slate-300 text-slate-800",
  "bg-orange-400 text-orange-950",
] as const;

const PODIUM_HEIGHT = ["sm:pt-8 sm:pb-5", "sm:pt-6 sm:pb-4", "sm:pt-3 sm:pb-4"] as const;

export function LeaderboardView({
  query,
  catalog,
}: {
  query: { period: LeaderboardPeriod; page: number };
  catalog: LeaderboardCatalog | null;
}) {
  const period = catalog?.period ?? query.period;
  const page = catalog?.page ?? query.page;
  const range = catalog
    ? formatLeaderboardPeriodRange(catalog.period, catalog.periodStart, catalog.periodEnd)
    : LEADERBOARD_PERIOD_LABELS[period];
  const subtitle =
    period === "all" ? "Every point earned on Coddle Learn" : `Points earned ${range}`;
  const showPodium = page === 1 && (catalog?.entries.length ?? 0) > 0;
  const podium = showPodium ? catalog!.entries.slice(0, 3) : [];
  const list = showPodium ? catalog!.entries.slice(3) : (catalog?.entries ?? []);
  const total = catalog?.total ?? 0;
  const pageSize = catalog?.pageSize ?? 20;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="min-h-full">
      <section className="relative overflow-hidden border-b border-border gradient-primary">
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="inline-flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                <Icon name="trophy" className="h-5 w-5 shrink-0 text-amber-300" />
                Leaderboard
              </h1>
              <p className="mt-1 truncate text-sm text-white/70">{subtitle}</p>
            </div>
            {catalog?.you ? (
              <Link
                href={leaderboardPath({ period, page: catalog.you.page })}
                className="inline-flex shrink-0 flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2.5 py-1.5 text-white backdrop-blur-sm transition hover:bg-white/15 sm:flex-row sm:gap-2.5 sm:px-3 sm:py-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-300 font-display text-sm font-bold text-amber-950">
                  #{catalog.you.rank}
                </span>
                <span className="text-center sm:text-left">
                  <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60 sm:block">
                    Your place
                  </span>
                  <span className="block text-xs font-semibold sm:text-sm">
                    {catalog.you.points.toLocaleString()} pts
                    {catalog.you.page !== page ? (
                      <span className="hidden sm:inline"> · Jump to you</span>
                    ) : null}
                  </span>
                </span>
              </Link>
            ) : catalog ? (
              <p className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 sm:block">
                Earn points to take a place on this board.
              </p>
            ) : null}
          </div>

          <div
            role="tablist"
            aria-label="Leaderboard period"
            className="flex w-max max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-white/15 bg-white/10 p-1 mt-4"
          >
            {LEADERBOARD_PERIODS.map((item) => {
              const active = item === period;
              return (
                <Link
                  key={item}
                  href={leaderboardPath({ period: item, page: 1 })}
                  role="tab"
                  aria-selected={active}
                  className={[
                    "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition sm:px-4",
                    active
                      ? "bg-white text-brand"
                      : "text-white/75 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  {LEADERBOARD_PERIOD_LABELS[item]}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
        {!catalog ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            Could not load the leaderboard. Try again in a moment.
          </p>
        ) : catalog.entries.length === 0 ? (
          <EmptyPeriod period={period} />
        ) : (
          <>
            {podium.length > 0 ? <Podium entries={podium} /> : null}

            {list.length > 0 ? (
              <ol className={["space-y-2", podium.length > 0 ? "mt-8" : ""].join(" ")}>
                {list.map((entry) => (
                  <li key={`${entry.rank}-${entry.username ?? entry.name}`}>
                    <RankRow entry={entry} />
                  </li>
                ))}
              </ol>
            ) : null}

            <Pagination
              period={period}
              page={page}
              totalPages={catalog.totalPages}
              from={from}
              to={to}
              total={total}
            />
          </>
        )}
      </div>
    </div>
  );
}

function EmptyPeriod({ period }: { period: LeaderboardPeriod }) {
  const copy =
    period === "weekly"
      ? "No points earned this week yet."
      : period === "monthly"
        ? "No points earned this month yet."
        : "No one is on the board yet.";
  return (
    <div className="rounded-3xl border border-dashed border-border px-5 py-14 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Icon name="trophy" className="h-6 w-6" />
      </span>
      <h2 className="mt-4 font-display text-xl font-bold text-ink">{copy}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        Complete a lesson, solve a challenge, or share in the community to appear here.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          href="/community"
          className="inline-flex items-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Open community
        </Link>
        <Link
          href="/challenges"
          className="inline-flex items-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-border-strong"
        >
          Try a challenge
        </Link>
      </div>
    </div>
  );
}

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <ol className="flex items-end gap-2 sm:gap-4">
      {PODIUM_PLACES.map((rank) => {
        const entry = entries.find((item) => item.rank === rank);
        if (!entry) return null;
        const place = rank - 1;
        const first = rank === 1;
        return (
          <li
            key={entry.username ?? `${entry.rank}-${entry.name}`}
            className={[
              "relative min-w-0 flex-1 overflow-visible text-center",
              "sm:rounded-3xl sm:border sm:border-border sm:bg-surface sm:px-4 sm:py-4 sm:transition sm:duration-200 sm:hover:-translate-y-0.5 sm:hover:border-brand/40 sm:hover:bg-surface-subtle sm:hover:shadow-[0_12px_28px_-18px_rgb(0_76_200_/_0.45)]",
              PODIUM_ORDER[place],
              PODIUM_HEIGHT[place],
              entry.you ? "sm:ring-2 sm:ring-brand/40" : "",
            ].join(" ")}
          >
            {first ? (
              <div
                className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-3xl sm:block"
                aria-hidden
              >
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-amber-300/20 to-transparent" />
              </div>
            ) : null}
            <p
              className={[
                "mx-auto flex items-center justify-center rounded-full font-display font-bold",
                first ? "h-7 w-7 text-xs sm:h-8 sm:w-8 sm:text-sm" : "h-6 w-6 text-[11px] sm:h-7 sm:w-7 sm:text-xs",
                PODIUM_BADGE[place] ?? "bg-brand-soft text-brand",
              ].join(" ")}
            >
              {entry.rank}
            </p>
            <PersonLink
              entry={entry}
              className={["mx-auto block w-max", first ? "mt-4 sm:mt-6" : "mt-2 sm:mt-3"].join(" ")}
            >
              <span
                className={["relative block rounded-full", PODIUM_RING[place] ?? ""].join(" ")}
              >
                <ProfileAvatar
                  name={entry.name}
                  avatarUrl={entry.avatarUrl}
                  size={first ? "lg" : "md"}
                />
                {first ? (
                  <span
                    className="absolute -top-3 left-1/2 z-10 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-amber-300 text-amber-950 shadow-[0_4px_12px_-2px_rgb(251_191_36_/_0.8)] sm:-top-4 sm:h-7 sm:w-7"
                    aria-hidden
                  >
                    <Icon name="trophy" className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </span>
                ) : null}
              </span>
            </PersonLink>
            <PersonLink
              entry={entry}
              className="mt-2 block truncate font-display text-sm font-bold tracking-tight text-ink transition hover:text-brand sm:mt-3 sm:text-lg"
            >
              {entry.name}
              {entry.you ? " · You" : ""}
            </PersonLink>
            <p className="mt-1 hidden text-xs text-ink-muted sm:block">
              {levelLabel(entry.experienceLevel)}
            </p>
            <p className="mt-1 font-display text-base font-bold tracking-tight text-brand sm:mt-2 sm:text-2xl">
              {entry.points.toLocaleString()}
              <span className="ml-1 text-xs font-semibold text-ink-muted sm:text-sm">pts</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function RankRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 transition duration-200 hover:-translate-y-px hover:border-brand/40 hover:bg-surface-subtle hover:shadow-[0_8px_20px_-16px_rgb(0_76_200_/_0.4)] sm:px-4",
        entry.you ? "border-brand/30 bg-brand-soft hover:bg-brand-soft" : "",
      ].join(" ")}
    >
      <span className="w-8 shrink-0 text-center font-mono text-sm font-semibold text-ink-muted">
        {entry.rank}
      </span>
      <PersonLink entry={entry} className="shrink-0">
        <ProfileAvatar name={entry.name} avatarUrl={entry.avatarUrl} size="sm" />
      </PersonLink>
      <span className="min-w-0 flex-1">
        <PersonLink
          entry={entry}
          className="block truncate text-sm font-semibold text-ink transition hover:text-brand"
        >
          {entry.name}
          {entry.you ? " · You" : ""}
        </PersonLink>
        <span className="block truncate text-xs text-ink-muted">
          {levelLabel(entry.experienceLevel)}
        </span>
      </span>
      <span className="shrink-0 font-display text-sm font-bold text-brand">
        {entry.points.toLocaleString()}
        <span className="ml-1 text-xs font-semibold text-ink-muted">pts</span>
      </span>
    </div>
  );
}

function Pagination({
  period,
  page,
  totalPages,
  from,
  to,
  total,
}: {
  period: LeaderboardPeriod;
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
}) {
  if (total === 0) return null;
  const items = leaderboardPageItems(page, totalPages);
  const prev = page > 1 ? leaderboardPath({ period, page: page - 1 }) : null;
  const next = page < totalPages ? leaderboardPath({ period, page: page + 1 }) : null;

  return (
    <nav
      aria-label="Leaderboard pages"
      className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between"
    >
      <p className="text-xs font-semibold text-ink-muted">
        Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <PageLink href={prev} disabled={!prev}>
          Previous
        </PageLink>
        {items.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`e-${index}`} className="px-2 text-xs text-ink-muted">
              …
            </span>
          ) : (
            <PageLink
              key={item}
              href={item === page ? null : leaderboardPath({ period, page: item })}
              current={item === page}
            >
              {item}
            </PageLink>
          ),
        )}
        <PageLink href={next} disabled={!next}>
          Next
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  children,
  current = false,
  disabled = false,
}: {
  href: string | null;
  children: ReactNode;
  current?: boolean;
  disabled?: boolean;
}) {
  const className = [
    "inline-flex min-w-9 items-center justify-center rounded-xl px-2.5 py-2 text-xs font-semibold transition",
    current
      ? "bg-brand text-white"
      : disabled
        ? "cursor-not-allowed text-ink-muted/50"
        : "text-ink hover:bg-surface-subtle",
  ].join(" ");
  if (!href || disabled) {
    return (
      <span className={className} aria-current={current ? "page" : undefined}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function PersonLink({
  entry,
  className,
  children,
}: {
  entry: LeaderboardEntry;
  className?: string;
  children: ReactNode;
}) {
  if (!entry.username) {
    return <span className={className}>{children}</span>;
  }
  return (
    <ProfileLink user={{ username: entry.username }} className={className}>
      {children}
    </ProfileLink>
  );
}

function levelLabel(level: string | null) {
  return levelById(level ?? "")?.label ?? "Learner";
}
