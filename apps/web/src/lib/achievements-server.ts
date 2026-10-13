import type { AchievementItem, AchievementsCatalog } from "@/lib/achievements";
import { serverApiFetch } from "@/lib/server-api";

export async function loadAchievements(): Promise<AchievementsCatalog | null> {
  try {
    const res = await serverApiFetch("/achievements");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: AchievementsCatalog };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadAchievement(slug: string): Promise<AchievementItem | null> {
  try {
    const res = await serverApiFetch(`/achievements/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { achievement: AchievementItem } };
    return body.data.achievement;
  } catch {
    return null;
  }
}
