import { AchievementsCatalog } from "@/components/achievements/achievements-catalog";
import { loadAchievements } from "@/lib/achievements-server";

export default async function AchievementsPage() {
  const catalog = await loadAchievements();
  return <AchievementsCatalog initial={catalog} />;
}
