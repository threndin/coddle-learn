import { toolQueryString, type ToolCatalog, type ToolFilters, type ToolItem } from "@/lib/tools";
import { serverApiFetch } from "@/lib/server-api";

export async function loadToolCatalog(filters: ToolFilters): Promise<ToolCatalog | null> {
  try {
    const query = toolQueryString(filters);
    const res = await serverApiFetch(`/tools${query ? `?${query}` : ""}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: ToolCatalog };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadTool(slug: string): Promise<ToolItem | null> {
  try {
    const res = await serverApiFetch(`/tools/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { tool: ToolItem } };
    return body.data.tool;
  } catch {
    return null;
  }
}
