import { cookies } from "next/headers";
import type { RoadmapCatalogItem, RoadmapDetail } from "@/lib/roadmaps";

const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

async function apiFetch(path: string) {
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const res = await fetch(`${apiUrl}${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });

  return res;
}

export async function loadRoadmapCatalog(): Promise<RoadmapCatalogItem[] | null> {
  try {
    const res = await apiFetch("/roadmaps");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { roadmaps: RoadmapCatalogItem[] } };
    return body.data.roadmaps;
  } catch {
    return null;
  }
}

export async function loadRoadmapDetail(slug: string): Promise<RoadmapDetail | null> {
  try {
    const res = await apiFetch(`/roadmaps/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { roadmap: RoadmapDetail } };
    return body.data.roadmap;
  } catch {
    return null;
  }
}
