import {
  COMMUNITY_SCOPES,
  isCommunityKind,
  isCommunityTopic,
  type CommunityScope,
} from "@coddle/shared";
import { CommunityFeed } from "@/components/community/community-catalog";
import { DEFAULT_COMMUNITY_FILTERS, type CommunityFilters } from "@/lib/community";
import { loadCommunityCatalog, loadSpotlightLearners } from "@/lib/community-server";
import { loadLeaderboardTeaser } from "@/lib/leaderboard-server";

type Query = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function filtersFrom(query: Query): CommunityFilters {
  const kind = first(query.kind);
  const topic = first(query.topic);
  const scope = first(query.scope);
  return {
    kind: isCommunityKind(kind) ? kind : null,
    topic: isCommunityTopic(topic) ? topic : null,
    scope: (COMMUNITY_SCOPES as readonly string[]).includes(scope)
      ? (scope as CommunityScope)
      : DEFAULT_COMMUNITY_FILTERS.scope,
  };
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const filters = filtersFrom(await searchParams);
  const [catalog, spotlight, teaser] = await Promise.all([
    loadCommunityCatalog(filters),
    loadSpotlightLearners(),
    loadLeaderboardTeaser(),
  ]);
  return (
    <CommunityFeed
      initialFilters={filters}
      initialCatalog={catalog}
      initialSpotlight={spotlight}
      initialLeaders={teaser?.entries ?? []}
    />
  );
}
