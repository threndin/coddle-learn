import {
  isCommunityKind,
  isCommunityPeopleSort,
  isCommunitySearchType,
  isCommunitySearchWhen,
  isCommunitySort,
  isCommunityTopic,
  isExperienceLevel,
} from "@coddle/shared";
import { CommunitySearchView } from "@/components/community/community-search";
import {
  DEFAULT_COMMUNITY_SEARCH_FILTERS,
  type CommunitySearchFilters,
} from "@/lib/community";
import { loadCommunitySearch } from "@/lib/community-server";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function filtersFrom(sp: Record<string, string | string[] | undefined>): CommunitySearchFilters {
  const q = first(sp.q).trim();
  const typeRaw = first(sp.type);
  const sortRaw = first(sp.sort);
  const peopleSortRaw = first(sp.peopleSort);
  const whenRaw = first(sp.when);
  const kindRaw = first(sp.kind);
  const topicRaw = first(sp.topic);
  const levelRaw = first(sp.experienceLevel);

  return {
    q,
    type: isCommunitySearchType(typeRaw) ? typeRaw : "all",
    kind: isCommunityKind(kindRaw) ? kindRaw : null,
    topic: isCommunityTopic(topicRaw) ? topicRaw : null,
    sort: isCommunitySort(sortRaw) ? sortRaw : q ? "relevant" : "newest",
    peopleSort: isCommunityPeopleSort(peopleSortRaw)
      ? peopleSortRaw
      : q
        ? "relevant"
        : "posts",
    when: isCommunitySearchWhen(whenRaw) ? whenRaw : "any",
    experienceLevel: isExperienceLevel(levelRaw) ? levelRaw : null,
  };
}

export default async function CommunitySearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = filtersFrom(sp);
  const initialResult = await loadCommunitySearch(filters);

  return (
    <CommunitySearchView
      initialFilters={filters ?? DEFAULT_COMMUNITY_SEARCH_FILTERS}
      initialResult={initialResult}
    />
  );
}
