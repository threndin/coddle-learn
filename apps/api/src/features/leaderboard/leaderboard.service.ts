import {
  clampLeaderboardPageSize,
  isLeaderboardPeriod,
  leaderboardPeriodWindow,
  parseLeaderboardPage,
  type LeaderboardPeriod,
} from "@coddle/shared";
import {
  countUsersAhead,
  countUsersWithPoints,
  findUserPoints,
  findUsersByIds,
  listPeriodPointSums,
  listUsersByPoints,
} from "./leaderboard.repository.js";

export type LeaderboardEntry = {
  rank: number;
  username: string | null;
  name: string;
  avatarUrl: string | null;
  experienceLevel: string | null;
  points: number;
  you: boolean;
};

export type LeaderboardYou = {
  rank: number;
  points: number;
  page: number;
};

export type LeaderboardCatalog = {
  period: LeaderboardPeriod;
  periodStart: string | null;
  periodEnd: string | null;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  entries: LeaderboardEntry[];
  you: LeaderboardYou | null;
};

type RankedScore = {
  userId: string;
  points: number;
};

function sortScores(rows: RankedScore[]) {
  return [...rows].sort((left, right) => {
    if (right.points !== left.points) return right.points - left.points;
    return left.userId.localeCompare(right.userId);
  });
}

function standingFor(ranked: RankedScore[], userId: string, pageSize: number): LeaderboardYou | null {
  const index = ranked.findIndex((row) => row.userId === userId);
  const row = index >= 0 ? ranked[index] : undefined;
  if (!row) return null;
  const rank = index + 1;
  return {
    rank,
    points: row.points,
    page: Math.max(1, Math.ceil(rank / pageSize)),
  };
}

async function allTimeBoard(userId: string, page: number, pageSize: number): Promise<LeaderboardCatalog> {
  const [total, viewer] = await Promise.all([countUsersWithPoints(), findUserPoints(userId)]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;
  const users = total === 0 ? [] : await listUsersByPoints(skip, pageSize);

  let you: LeaderboardYou | null = null;
  if (viewer && viewer.points > 0) {
    const ahead = await countUsersAhead(viewer.id, viewer.points);
    const rank = ahead + 1;
    you = {
      rank,
      points: viewer.points,
      page: Math.max(1, Math.ceil(rank / pageSize)),
    };
  }

  return {
    period: "all",
    periodStart: null,
    periodEnd: null,
    page: safePage,
    pageSize,
    total,
    totalPages,
    entries: users.map((user, index) => ({
      rank: skip + index + 1,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      experienceLevel: user.experienceLevel,
      points: user.points,
      you: user.id === userId,
    })),
    you,
  };
}

async function periodBoard(
  userId: string,
  period: Exclude<LeaderboardPeriod, "all">,
  page: number,
  pageSize: number,
): Promise<LeaderboardCatalog> {
  const window = leaderboardPeriodWindow(period);
  if (!window) return allTimeBoard(userId, page, pageSize);

  const sums = await listPeriodPointSums(window.start, window.end);
  const ranked = sortScores(
    sums
      .map((row) => ({ userId: row.userId, points: row._sum.amount ?? 0 }))
      .filter((row) => row.points > 0),
  );
  const total = ranked.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;
  const slice = ranked.slice(skip, skip + pageSize);
  const users = await findUsersByIds(slice.map((row) => row.userId));
  const byId = new Map(users.map((user) => [user.id, user]));

  return {
    period,
    periodStart: window.start.toISOString(),
    periodEnd: window.end.toISOString(),
    page: safePage,
    pageSize,
    total,
    totalPages,
    entries: slice.flatMap((row, index) => {
      const user = byId.get(row.userId);
      if (!user) return [];
      return [
        {
          rank: skip + index + 1,
          username: user.username,
          name: user.name,
          avatarUrl: user.avatarUrl,
          experienceLevel: user.experienceLevel,
          points: row.points,
          you: user.id === userId,
        },
      ];
    }),
    you: standingFor(ranked, userId, pageSize),
  };
}

export async function getLeaderboard(
  userId: string,
  query: { period?: unknown; page?: unknown; pageSize?: unknown },
): Promise<LeaderboardCatalog> {
  const period = isLeaderboardPeriod(query.period) ? query.period : "all";
  const page = parseLeaderboardPage(query.page);
  const pageSize = clampLeaderboardPageSize(query.pageSize);
  if (period === "all") return allTimeBoard(userId, page, pageSize);
  return periodBoard(userId, period, page, pageSize);
}
