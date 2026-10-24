"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { challengeRankBonus, type ChallengeDifficulty } from "@coddle/shared";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { DifficultyBadge, languageLabel } from "@/components/challenges/challenge-meta";
import type { ChallengeCatalog, ChallengeListItem } from "@/lib/challenges";

type Scope = "all" | ChallengeDifficulty | "solved" | "open";

const FILTERS: { id: Scope; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "solved", label: "Solved" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

function solverLabel(count: number): string {
  if (count === 0) return "No solvers yet";
  if (count === 1) return "1 solver";
  return `${count} solvers`;
}

export function ChallengesCatalog({
  initialCatalog,
}: {
  initialCatalog: ChallengeCatalog | null;
}) {
  const [catalog] = useState(initialCatalog);
  const [scope, setScope] = useState<Scope>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const needle = query.trim().toLowerCase();
    return catalog.challenges.filter((item) => {
      if (scope === "open" && item.solved) return false;
      if (scope === "solved" && !item.solved) return false;
      if (scope === "easy" || scope === "medium" || scope === "hard") {
        if (item.difficulty !== scope) return false;
      }
      if (!needle) return true;
      return [item.title, item.summary, item.functionName].join(" ").toLowerCase().includes(needle);
    });
  }, [catalog, query, scope]);

  if (!catalog) {
    return (
      <div className="w-full px-4 py-12 sm:px-8">
        <p className="text-sm text-rose-600">Could not load challenges.</p>
      </div>
    );
  }

  const firstBonus = challengeRankBonus(1);

  return (
    <div className="w-full max-w-[100vw] overflow-x-hidden px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="max-w-2xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Challenges
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-4xl">
          Compete, then collect the points
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
          Solve the same JavaScript problems as everyone else. Passing earns the challenge
          points, and earlier solvers pick up a rank bonus that stays on the board.
        </p>
      </div>

      <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            Your standing
          </p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
            {catalog.you.rank ? `#${catalog.you.rank}` : "Unranked"}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {catalog.you.challengePoints.toLocaleString()} challenge points ·{" "}
            {catalog.you.solvedCount} solved
          </p>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
          First place on a challenge earns +{firstBonus}. Second earns +{challengeRankBonus(2)},
          third earns +{challengeRankBonus(3)}, and places 4–10 earn +{challengeRankBonus(4)}.
        </p>
      </section>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="relative w-full sm:max-w-sm sm:flex-1">
              <span className="sr-only">Search challenges</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search challenges"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
              />
            </label>
            <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1 sm:w-auto">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setScope(filter.id)}
                  className={[
                    "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    scope === filter.id ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
                  ].join(" ")}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-10 text-sm text-ink-muted">No challenges match that filter.</p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {filtered.map((item) => (
                <li key={item.slug} className="min-w-0">
                  <ChallengeCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="rounded-3xl border border-border bg-surface p-5 xl:sticky xl:top-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">Standings</h2>
            <p className="text-xs font-semibold text-ink-muted">By challenge points</p>
          </div>
          {catalog.standings.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              Be the first to solve a challenge and take the top spot.
            </p>
          ) : (
            <ol className="mt-4 space-y-2">
              {catalog.standings.map((row) => (
                <li key={row.username}>
                  <Link
                    href={`/u/${row.username}`}
                    className={[
                      "flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-surface-subtle",
                      row.you ? "bg-brand-soft" : "",
                    ].join(" ")}
                  >
                    <span className="w-6 shrink-0 text-center font-mono text-xs font-semibold text-ink-muted">
                      {row.rank}
                    </span>
                    <ProfileAvatar name={row.name} avatarUrl={row.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {row.name}
                        {row.you ? " · You" : ""}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        {row.solvedCount} solved
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-brand">
                      {row.challengePoints.toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
          {catalog.you.rank && catalog.you.rank > catalog.standings.length ? (
            <p className="mt-4 text-sm text-ink-muted">
              You are #{catalog.you.rank} with {catalog.you.challengePoints.toLocaleString()} pts.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function ChallengeCard({ item }: { item: ChallengeListItem }) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-border bg-surface p-5 transition hover:border-brand/40">
      <div className="flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={item.difficulty} />
        <span className="text-xs font-medium text-ink-muted">{languageLabel(item.language)}</span>
      </div>
      <Link href={`/challenges/${item.slug}`} className="mt-3 min-w-0">
        <h2 className="font-display text-lg font-bold tracking-tight text-ink transition hover:text-brand">
          {item.title}
        </h2>
      </Link>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-muted">
        {item.summary}
      </p>
      <p className="mt-4 font-mono text-xs text-ink-muted">{item.functionName}()</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <span className="font-semibold text-ink">{item.points} pts</span>
        <span>·</span>
        <span>{solverLabel(item.solverCount)}</span>
        {item.solved && item.solveRank && item.pointsAwarded != null ? (
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            #{item.solveRank} · {item.pointsAwarded} pts
          </span>
        ) : challengeRankBonus(item.solverCount + 1) > 0 ? (
          <span className="rounded-md bg-brand-soft px-2 py-0.5 font-semibold text-brand">
            +{challengeRankBonus(item.solverCount + 1)} for the next solve
          </span>
        ) : null}
      </div>
      <Link
        href={`/challenges/${item.slug}`}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
      >
        {item.solved ? "Review solution" : "Solve"}
      </Link>
    </article>
  );
}
