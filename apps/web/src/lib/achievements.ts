import type { AchievementCategory, AchievementSlug } from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type AchievementItem = {
  slug: AchievementSlug | string;
  title: string;
  summary: string;
  howToEarn: string;
  category: AchievementCategory | string;
  icon: string;
  sortOrder: number;
  earned: boolean;
  earnedAt: string | null;
};

export type AchievementsCatalog = {
  earnedCount: number;
  totalCount: number;
  achievements: AchievementItem[];
};

export function fetchAchievements() {
  return apiRequest<AchievementsCatalog>("/achievements");
}

export function fetchAchievement(slug: string) {
  return apiRequest<{ achievement: AchievementItem }>(
    `/achievements/${encodeURIComponent(slug)}`,
  );
}
