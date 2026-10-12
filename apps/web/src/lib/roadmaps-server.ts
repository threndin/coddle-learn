import type { RoadmapCatalogItem, RoadmapDetail } from "@/lib/roadmaps";
import { serverApiFetch } from "@/lib/server-api";

export async function loadRoadmapCatalog(): Promise<RoadmapCatalogItem[] | null> {
  try {
    const res = await serverApiFetch("/roadmaps");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { roadmaps: RoadmapCatalogItem[] } };
    return body.data.roadmaps;
  } catch {
    return null;
  }
}

export async function loadRoadmapDetail(slug: string): Promise<RoadmapDetail | null> {
  try {
    const res = await serverApiFetch(`/roadmaps/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { roadmap: RoadmapDetail } };
    return body.data.roadmap;
  } catch {
    return null;
  }
}
