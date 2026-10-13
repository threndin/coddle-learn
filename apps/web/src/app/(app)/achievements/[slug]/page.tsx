import { notFound } from "next/navigation";
import { AchievementDetail } from "@/components/achievements/achievement-detail";
import { loadAchievement } from "@/lib/achievements-server";

export default async function AchievementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const achievement = await loadAchievement(slug);
  if (!achievement) notFound();
  return <AchievementDetail achievement={achievement} />;
}
