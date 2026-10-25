export const LEADERBOARD_PERIODS = ["all", "weekly", "monthly"] as const;
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

export const LEADERBOARD_PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  all: "All time",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function isLeaderboardPeriod(value: unknown): value is LeaderboardPeriod {
  return (
    typeof value === "string" &&
    (LEADERBOARD_PERIODS as readonly string[]).includes(value)
  );
}

export const LEADERBOARD_LIMITS = {
  pageSize: 20,
  pageSizeMin: 1,
  pageSizeMax: 50,
  teaserSize: 3,
} as const;

export function clampLeaderboardPageSize(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return LEADERBOARD_LIMITS.pageSize;
  return Math.min(
    LEADERBOARD_LIMITS.pageSizeMax,
    Math.max(LEADERBOARD_LIMITS.pageSizeMin, Math.floor(parsed)),
  );
}

export function parseLeaderboardPage(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

/** UTC window for weekly (ISO week, Monday start) or monthly totals. */
export function leaderboardPeriodWindow(
  period: LeaderboardPeriod,
  now = new Date(),
): { start: Date; end: Date } | null {
  if (period === "all") return null;

  const end = now;
  if (period === "monthly") {
    return {
      start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      end,
    };
  }

  const daysFromMonday = (now.getUTCDay() + 6) % 7;
  return {
    start: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday),
    ),
    end,
  };
}
