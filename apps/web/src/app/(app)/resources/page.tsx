import {
  isExperienceLevel,
  isResourceType,
  RESOURCE_SCOPES,
  RESOURCE_SORTS,
  type ResourceScope,
  type ResourceSort,
} from "@coddle/shared";
import { ResourcesCatalog } from "@/components/resources/resources-catalog";
import { DEFAULT_RESOURCE_FILTERS, type ResourceFilters } from "@/lib/resources";
import { loadResourceCatalog } from "@/lib/resources-server";

type Query = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function filtersFrom(query: Query): ResourceFilters {
  const type = first(query.type);
  const level = first(query.level);
  const scope = first(query.scope);
  const sort = first(query.sort);
  return {
    q: first(query.q),
    type: isResourceType(type) ? type : null,
    level: isExperienceLevel(level) ? level : null,
    skill: first(query.skill) || null,
    scope: (RESOURCE_SCOPES as readonly string[]).includes(scope)
      ? (scope as ResourceScope)
      : DEFAULT_RESOURCE_FILTERS.scope,
    sort: (RESOURCE_SORTS as readonly string[]).includes(sort)
      ? (sort as ResourceSort)
      : DEFAULT_RESOURCE_FILTERS.sort,
  };
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const filters = filtersFrom(await searchParams);
  const catalog = await loadResourceCatalog(filters);
  return <ResourcesCatalog initialFilters={filters} initialCatalog={catalog} />;
}
