import {
  ACHIEVEMENT_DEFINITIONS,
  achievementBySlug,
  isAchievementSlug,
  type AchievementSlug,
} from "@coddle/shared";
import { AppError } from "../../shared/errors.js";
import { notifyAchievement } from "../notifications/notifications.events.js";
import {
  deleteAllAwards,
  firstCourseCompletedAt,
  firstProjectSubmittedAt,
  firstPublishedCourseAt,
  firstPublishedProjectAt,
  firstPublishedResourceAt,
  firstReviewedContentAt,
  firstRoadmapCompletedAt,
  firstCompletedMentorshipAt,
  listActivityDayKeys,
  listAwardsForUser,
  listUserIds,
  upsertAward,
  findAward,
} from "./achievements.repository.js";

function payload(
  definition: (typeof ACHIEVEMENT_DEFINITIONS)[number],
  earnedAt: Date | null,
) {
  return {
    slug: definition.slug,
    title: definition.title,
    summary: definition.summary,
    howToEarn: definition.howToEarn,
    category: definition.category,
    icon: definition.icon,
    sortOrder: definition.sortOrder,
    earned: Boolean(earnedAt),
    earnedAt: earnedAt?.toISOString() ?? null,
  };
}

export async function listMyAchievements(userId: string) {
  const awards = await listAwardsForUser(userId);
  const earnedAtBySlug = new Map(awards.map((row) => [row.slug, row.earnedAt]));

  const achievements = ACHIEVEMENT_DEFINITIONS.map((definition) =>
    payload(definition, earnedAtBySlug.get(definition.slug) ?? null),
  ).sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1;
    if (a.earned && b.earned) {
      const aTime = a.earnedAt ?? "";
      const bTime = b.earnedAt ?? "";
      if (aTime !== bTime) return aTime < bTime ? 1 : -1;
    }
    return a.sortOrder - b.sortOrder;
  });

  const earnedCount = achievements.filter((item) => item.earned).length;

  return {
    earnedCount,
    totalCount: achievements.length,
    achievements,
  };
}

export async function getMyAchievement(userId: string, slug: string) {
  if (!isAchievementSlug(slug)) {
    throw new AppError(404, "achievement_missing", "That achievement could not be found.");
  }
  const definition = achievementBySlug(slug);
  if (!definition) {
    throw new AppError(404, "achievement_missing", "That achievement could not be found.");
  }
  const award = await findAward(userId, slug);
  return { achievement: payload(definition, award?.earnedAt ?? null) };
}

function earliest(...dates: Array<Date | null | undefined>): Date | null {
  const values = dates.filter((value): value is Date => value instanceof Date);
  if (values.length === 0) return null;
  return values.reduce((min, date) => (date < min ? date : min));
}

/** When the learner actually unlocked this achievement, or null if not eligible. */
async function resolveEarnedAt(
  userId: string,
  slug: AchievementSlug,
): Promise<Date | null> {
  switch (slug) {
    case "first-course":
      return firstCourseCompletedAt(userId);
    case "first-project":
      return firstProjectSubmittedAt(userId);
    case "streak-7":
      return sevenDayStreakEarnedAt(userId);
    case "open-source-contributor":
      return earliest(
        await firstPublishedCourseAt(userId),
        await firstPublishedProjectAt(userId),
        await firstPublishedResourceAt(userId),
      );
    case "roadmap-completed":
      return firstRoadmapCompletedAt(userId);
    case "mentor":
      return firstCompletedMentorshipAt(userId);
    case "course-creator":
      return firstPublishedCourseAt(userId);
    case "resource-reviewer":
      return firstReviewedContentAt(userId);
    default:
      return null;
  }
}

/**
 * Date the 7-day streak was achieved: the calendar day that completed the streak.
 * Uses the newest day of a qualifying streak ending today or yesterday.
 */
async function sevenDayStreakEarnedAt(userId: string): Promise<Date | null> {
  const days = await listActivityDayKeys(userId, 90);
  if (days.length === 0) return null;

  const daySet = new Set(days);
  const cursor = parseUtcDay(days[0]!);
  const today = utcToday();
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (cursor.getTime() !== today.getTime() && cursor.getTime() !== yesterday.getTime()) {
    return null;
  }

  let streak = 0;
  const probe = new Date(cursor);
  while (daySet.has(utcDayKey(probe))) {
    streak += 1;
    if (streak >= 7) {
      // Achieved on the newest day of this qualifying streak.
      return new Date(cursor);
    }
    probe.setUTCDate(probe.getUTCDate() - 1);
  }
  return null;
}

function utcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseUtcDay(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function utcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Award (or refresh) a single achievement with the real unlock date.
 * Returns true when a new row was created.
 */
export async function awardIfEligible(
  userId: string,
  slug: AchievementSlug,
): Promise<boolean> {
  const earnedAt = await resolveEarnedAt(userId, slug);
  if (!earnedAt) return false;

  const existing = await findAward(userId, slug);
  await upsertAward(userId, slug, earnedAt);
  const isNew = !existing;
  if (isNew) {
    await notifyAchievement(userId, slug);
  }
  return isNew;
}

/** Re-check every definition for one user and award anything newly earned. */
export async function evaluateAchievementsForUser(userId: string): Promise<number> {
  let awarded = 0;
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (await awardIfEligible(userId, definition.slug)) {
      awarded += 1;
    }
  }
  return awarded;
}

/** Fire-and-forget helper for request paths. */
export function scheduleAchievementEvaluation(userId: string) {
  void evaluateAchievementsForUser(userId).catch((error) => {
    console.error("[achievements] evaluate failed", { userId, error });
  });
}

/**
 * Sync awards for every user using real unlock dates.
 * Pass `reset: true` to clear existing rows first (CLI reseed).
 */
export async function backfillAchievementsForAllUsers(options?: { reset?: boolean }) {
  const cleared = options?.reset ? await deleteAllAwards() : 0;
  const userIds = await listUserIds();
  let awarded = 0;
  let updated = 0;
  for (const userId of userIds) {
    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      const earnedAt = await resolveEarnedAt(userId, definition.slug);
      if (!earnedAt) continue;
      const existing = await findAward(userId, definition.slug);
      await upsertAward(userId, definition.slug, earnedAt);
      if (existing) updated += 1;
      else awarded += 1;
    }
  }
  return { cleared, users: userIds.length, awarded, updated };
}
