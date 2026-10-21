import {
  isMentorAvailability,
  isMentorTopic,
  MENTOR_SCOPES,
  MENTOR_SORTS,
  type MentorScope,
  type MentorSort,
} from "@coddle/shared";
import { MentorsCatalog } from "@/components/mentors/mentors-catalog";
import { DEFAULT_MENTOR_FILTERS, type MentorFilters } from "@/lib/mentors";
import { loadMentorCatalog } from "@/lib/mentors-server";

type Query = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function filtersFrom(query: Query): MentorFilters {
  const topic = first(query.topic);
  const availability = first(query.availability);
  const scope = first(query.scope);
  const sort = first(query.sort);
  return {
    q: first(query.q),
    topic: isMentorTopic(topic) ? topic : null,
    skill: first(query.skill) || null,
    availability: isMentorAvailability(availability) ? availability : null,
    scope: (MENTOR_SCOPES as readonly string[]).includes(scope)
      ? (scope as MentorScope)
      : DEFAULT_MENTOR_FILTERS.scope,
    sort: (MENTOR_SORTS as readonly string[]).includes(sort)
      ? (sort as MentorSort)
      : DEFAULT_MENTOR_FILTERS.sort,
  };
}

export default async function MentorshipPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const filters = filtersFrom(await searchParams);
  const catalog = await loadMentorCatalog(filters);
  return <MentorsCatalog initialFilters={filters} initialCatalog={catalog} />;
}
