import type { SearchResult } from "@coddle/shared";
import { serverApiFetch } from "@/lib/server-api";
import { searchQueryString, type SearchFilters } from "@/lib/search";

export async function loadSearch(filters: SearchFilters): Promise<SearchResult | null> {
  if (!filters.q) {
    return {
      q: "",
      type: filters.type,
      parsed: { raw: "", text: "", terms: [], expanded: [], inferredTypes: [] },
      total: 0,
      hits: [],
      groups: [],
    };
  }
  try {
    const query = searchQueryString(filters);
    const res = await serverApiFetch(`/search${query ? `?${query}` : ""}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: SearchResult };
    return body.data;
  } catch {
    return null;
  }
}
