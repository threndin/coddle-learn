import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { leaderboardQueryFrom } from "@/lib/leaderboard";
import { loadLeaderboard } from "@/lib/leaderboard-server";

type Query = Record<string, string | string[] | undefined>;

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = leaderboardQueryFrom(await searchParams);
  const catalog = await loadLeaderboard(query);
  return <LeaderboardView query={query} catalog={catalog} />;
}
