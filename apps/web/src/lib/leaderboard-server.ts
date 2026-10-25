import { LEADERBOARD_LIMITS } from "@coddle/shared";
import type { LeaderboardCatalog, LeaderboardQuery } from "@/lib/leaderboard";
import { serverApiFetch } from "@/lib/server-api";

export async function loadLeaderboard(
  query: LeaderboardQuery,
): Promise<LeaderboardCatalog | null> {
  try {
    const params = new URLSearchParams({
      period: query.period,
      page: String(query.page),
      pageSize: String(query.pageSize ?? LEADERBOARD_LIMITS.pageSize),
    });
    const res = await serverApiFetch(`/leaderboard?${params.toString()}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: LeaderboardCatalog };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadLeaderboardTeaser(): Promise<LeaderboardCatalog | null> {
  return loadLeaderboard({
    period: "all",
    page: 1,
    pageSize: LEADERBOARD_LIMITS.teaserSize,
  });
}
