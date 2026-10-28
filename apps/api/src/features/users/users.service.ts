import type { User } from "@prisma/client";
import {
  canReviewContent,
  isExperienceLevel,
  normalizePracticeDays,
  parseUserRole,
  type LearnUser,
  type NotificationPrefs,
  type ProfileVisibility,
} from "@coddle/shared";
import {
  findById,
  syncRoleFromAllowlist,
  upsertFromCoddle as upsertFromCoddleRow,
  type CoddleUpsertResult,
  type UserWithSkills,
} from "./users.repository.js";

type CoddleIdentity = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

export async function upsertFromCoddle(profile: CoddleIdentity): Promise<CoddleUpsertResult> {
  return upsertFromCoddleRow(profile);
}

export async function findUserById(id: string) {
  return findById(id);
}

export async function syncUserRole(user: User): Promise<User> {
  return syncRoleFromAllowlist(user);
}

export async function isReviewerUser(userId: string): Promise<boolean> {
  const user = await findById(userId);
  if (!user) return false;
  const synced = await syncRoleFromAllowlist(user);
  return canReviewContent(synced.role);
}

export function visibilityFromUser(user: User): ProfileVisibility {
  return {
    roadmaps: user.showRoadmapsPublic,
    projects: user.showProjectsPublic,
    posts: user.showPostsPublic,
    skills: user.showSkillsPublic,
    credentials: user.showCredentialsPublic,
    achievements: user.showAchievementsPublic,
  };
}

export function notificationPrefsFromUser(user: User): NotificationPrefs {
  return {
    account: user.notifyAccount,
    community: user.notifyCommunity,
    learning: user.notifyLearning,
    mentorship: user.notifyMentorship,
    moderation: user.notifyModeration,
  };
}

export function toPublicUser(user: User & { skills?: UserWithSkills["skills"] }): LearnUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: parseUserRole(user.role),
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    coddleUserId: user.coddleUserId,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    experienceLevel: isExperienceLevel(user.experienceLevel) ? user.experienceLevel : null,
    dailyGoalMinutes: user.dailyGoalMinutes,
    practiceDays: normalizePracticeDays(user.practiceDays),
    startingRoadmapSlug: user.startingRoadmapSlug,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    points: user.points,
    skills: (user.skills ?? []).map((row) => ({
      slug: row.skill.slug,
      name: row.skill.name,
    })),
    visibility: visibilityFromUser(user),
    notificationPrefs: notificationPrefsFromUser(user),
  };
}
