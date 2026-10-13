"use client";

import Link from "next/link";
import { AchievementHeroCard } from "@/components/achievements/achievement-card";
import { Icon } from "@/components/ui/icon";
import type { AchievementItem } from "@/lib/achievements";

export function AchievementDetail({ achievement }: { achievement: AchievementItem }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <Link
        href="/achievements"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        All achievements
      </Link>

      <div className="mt-6">
        <AchievementHeroCard item={achievement} />
      </div>
    </div>
  );
}
