import { resourceQueryString, type ResourceCatalog, type ResourceFilters } from "@/lib/resources";
import { serverApiFetch } from "@/lib/server-api";

export async function loadResourceCatalog(
  filters: ResourceFilters,
): Promise<ResourceCatalog | null> {
  try {
    const query = resourceQueryString(filters);
    const res = await serverApiFetch(`/resources${query ? `?${query}` : ""}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: ResourceCatalog };
    return body.data;
  } catch {
    return null;
  }
}
