import {
  isToolCategory,
  isToolPricing,
  TOOL_SCOPES,
  TOOL_SORTS,
  type ToolScope,
  type ToolSort,
} from "@coddle/shared";
import { ToolsCatalog } from "@/components/tools/tools-catalog";
import { DEFAULT_TOOL_FILTERS, type ToolFilters } from "@/lib/tools";
import { loadToolCatalog } from "@/lib/tools-server";

type Query = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function filtersFrom(query: Query): ToolFilters {
  const category = first(query.category);
  const pricing = first(query.pricing);
  const scope = first(query.scope);
  const sort = first(query.sort);
  return {
    q: first(query.q),
    category: isToolCategory(category) ? category : null,
    pricing: isToolPricing(pricing) ? pricing : null,
    skill: first(query.skill) || null,
    scope: (TOOL_SCOPES as readonly string[]).includes(scope)
      ? (scope as ToolScope)
      : DEFAULT_TOOL_FILTERS.scope,
    sort: (TOOL_SORTS as readonly string[]).includes(sort)
      ? (sort as ToolSort)
      : DEFAULT_TOOL_FILTERS.sort,
  };
}

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const filters = filtersFrom(await searchParams);
  const catalog = await loadToolCatalog(filters);
  return <ToolsCatalog initialFilters={filters} initialCatalog={catalog} />;
}
