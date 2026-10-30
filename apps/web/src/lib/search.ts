import {
  SEARCH_LIMITS,
  isSearchType,
  type SearchResult,
  type SearchType,
} from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type SearchFilters = {
  q: string;
  type: SearchType | "all";
};

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  q: "",
  type: "all",
};

export function searchFiltersFrom(search: Record<string, string | string[] | undefined>): SearchFilters {
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  const type = first(search.type);
  return {
    q: first(search.q).slice(0, SEARCH_LIMITS.queryMax),
    type: isSearchType(type) ? type : "all",
  };
}

export function searchQueryString(filters: SearchFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type !== "all") params.set("type", filters.type);
  return params.toString();
}

export async function fetchSearch(
  filters: SearchFilters,
  signal?: AbortSignal,
): Promise<SearchResult> {
  const query = searchQueryString(filters);
  return apiRequest<SearchResult>(`/search${query ? `?${query}` : ""}`, { signal });
}
