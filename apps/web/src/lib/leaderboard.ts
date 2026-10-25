import {
  LEADERBOARD_LIMITS,
  LEADERBOARD_PERIOD_LABELS,
  isLeaderboardPeriod,
  parseLeaderboardPage,
  type LeaderboardPeriod,
} from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

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

export type LeaderboardQuery = {
  period: LeaderboardPeriod;
  page: number;
  pageSize?: number;
};

export function leaderboardPeriodFrom(value: string | null | undefined): LeaderboardPeriod {
  return isLeaderboardPeriod(value) ? value : "all";
}

export function leaderboardQueryFrom(search: {
  period?: string | string[];
  page?: string | string[];
}): LeaderboardQuery {
  const periodRaw = Array.isArray(search.period) ? search.period[0] : search.period;
  const pageRaw = Array.isArray(search.page) ? search.page[0] : search.page;
  return {
    period: leaderboardPeriodFrom(periodRaw),
    page: parseLeaderboardPage(pageRaw),
  };
}

export function leaderboardPath(query: Partial<LeaderboardQuery> = {}) {
  const period = query.period && query.period !== "all" ? query.period : null;
  const page = query.page && query.page > 1 ? String(query.page) : null;
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (page) params.set("page", page);
  const qs = params.toString();
  return qs ? `/leaderboard?${qs}` : "/leaderboard";
}

export function fetchLeaderboard(query: LeaderboardQuery) {
  const params = new URLSearchParams({
    period: query.period,
    page: String(query.page),
    pageSize: String(query.pageSize ?? LEADERBOARD_LIMITS.pageSize),
  });
  return apiRequest<LeaderboardCatalog>(`/leaderboard?${params.toString()}`);
}

export function formatLeaderboardPeriodRange(
  period: LeaderboardPeriod,
  start: string | null,
  end: string | null,
): string {
  if (period === "all" || !start) return LEADERBOARD_PERIOD_LABELS.all;
  const from = new Date(start);
  const to = end ? new Date(end) : new Date();
  if (period === "monthly") {
    return from.toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "UTC" });
  }
  const sameMonth = from.getUTCMonth() === to.getUTCMonth();
  const startLabel = from.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const endLabel = to.toLocaleDateString("en", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${startLabel} – ${endLabel}`;
}

export function leaderboardPageItems(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: Math.max(total, 1) }, (_, index) => index + 1);
  }
  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push("ellipsis");
  items.push(total);
  return items;
}
