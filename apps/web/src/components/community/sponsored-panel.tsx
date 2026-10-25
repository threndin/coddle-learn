import type { ReactNode } from "react";
import Link from "next/link";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { FollowButton } from "@/components/profile/follow-button";
import { ProfileLink } from "@/components/profile/profile-link";
import { Icon } from "@/components/ui/icon";
import type { SpotlightLearner } from "@/lib/community";
import type { LeaderboardEntry } from "@/lib/leaderboard";

const TEASER_BADGE = [
  "bg-amber-300 text-amber-950",
  "bg-slate-300 text-slate-800",
  "bg-orange-400 text-orange-950",
] as const;

/** Right-rail / inline community spots: ads, spotlighted learners, and upcoming events. */
export function SponsoredPanel({
  compact = false,
  learners = [],
  leaders = [],
}: {
  compact?: boolean;
  learners?: SpotlightLearner[];
  leaders?: LeaderboardEntry[];
}) {
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <RailCard
        eyebrow="Sponsored"
        title="Promote with Coddle"
        body="Partner spots and sponsored posts will appear here."
        compact={compact}
      >
        <div
          className={[
            "relative overflow-hidden rounded-xl bg-surface",
            compact ? "h-20" : "h-28",
          ].join(" ")}
          aria-hidden
        >
          <svg
            className="pointer-events-none absolute inset-[1px] size-[calc(100%-2px)] text-border"
            fill="none"
          >
            <rect
              width="100%"
              height="100%"
              rx="11"
              ry="11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="12 10"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </RailCard>

      <RailCard
        eyebrow="Spotlight"
        title="Learners to follow"
        body="Featured builders and mentors from the community."
        compact={compact}
      >
        {learners.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-ink-muted">
            More learners will show up here as the community grows.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {learners.map((person) => (
              <li key={person.id} className="flex items-center gap-3">
                <ProfileLink user={person} className="shrink-0">
                  <ProfileAvatar name={person.name} avatarUrl={person.avatarUrl} size="sm" />
                </ProfileLink>
                <div className="min-w-0 flex-1">
                  <ProfileLink
                    user={person}
                    className="truncate text-sm font-semibold text-ink transition hover:text-brand"
                  >
                    {person.name}
                  </ProfileLink>
                  <p className="truncate text-xs text-ink-muted">{person.note}</p>
                </div>
                {person.username ? (
                  <FollowButton
                    username={person.username}
                    initialFollowing={Boolean(person.isFollowing)}
                  />
                ) : (
                  <ProfileLink
                    user={person}
                    className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-ink transition hover:border-border-strong"
                  >
                    View
                  </ProfileLink>
                )}
              </li>
            ))}
          </ul>
        )}
      </RailCard>

      <RailCard
        eyebrow="Leaderboard"
        title="Top learners"
        body="All-time points"
        compact={compact}
      >
        {leaders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-ink-muted">
            Earn points to take a place on the board.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {leaders.slice(0, 3).map((person) => (
              <li key={`${person.rank}-${person.username ?? person.name}`} className="flex items-center gap-3">
                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    TEASER_BADGE[person.rank - 1] ?? "bg-brand-soft text-brand",
                  ].join(" ")}
                >
                  {person.rank}
                </span>
                {person.username ? (
                  <ProfileLink user={{ username: person.username }} className="shrink-0">
                    <ProfileAvatar name={person.name} avatarUrl={person.avatarUrl} size="sm" />
                  </ProfileLink>
                ) : (
                  <ProfileAvatar name={person.name} avatarUrl={person.avatarUrl} size="sm" />
                )}
                <div className="min-w-0 flex-1">
                  {person.username ? (
                    <ProfileLink
                      user={{ username: person.username }}
                      className="truncate text-sm font-semibold text-ink transition hover:text-brand"
                    >
                      {person.name}
                    </ProfileLink>
                  ) : (
                    <p className="truncate text-sm font-semibold text-ink">{person.name}</p>
                  )}
                  <p className="truncate text-xs font-semibold text-brand">
                    {person.points.toLocaleString()} pts
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/leaderboard"
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand transition hover:underline"
        >
          See full leaderboard
          <Icon name="chevronRight" className="h-3.5 w-3.5" />
        </Link>
      </RailCard>

      <RailCard
        eyebrow="Events"
        title="Coming up"
        body="Livestreams, study sessions, and office hours."
        compact={compact}
      >
        <ul className="space-y-2.5">
          {EVENTS.map((event) => (
            <li
              key={event.title}
              className="rounded-xl border border-border bg-surface px-3 py-2.5"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Icon name="clock" className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{event.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {event.when}
                    <span className="mx-1 text-border">·</span>
                    {event.meta}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </RailCard>
    </div>
  );
}

function RailCard({
  eyebrow,
  title,
  body,
  compact,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  compact: boolean;
  children: ReactNode;
}) {
  return (
    <aside
      aria-label={eyebrow}
      className={[
        "rounded-2xl border border-border bg-surface",
        compact ? "p-4" : "p-5",
      ].join(" ")}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {eyebrow}
      </p>
      <h3 className="mt-2 font-display text-base font-bold tracking-tight text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</p>
      <div className="mt-4">{children}</div>
    </aside>
  );
}

const EVENTS = [
  {
    title: "Office hours: roadmaps",
    when: "Thu 6:00 PM",
    meta: "Live · 45 min",
  },
  {
    title: "Study session: TypeScript",
    when: "Sat 11:00 AM",
    meta: "Community",
  },
] as const;
