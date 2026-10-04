import type { User } from "@prisma/client";
import { isExperienceLevel, normalizePracticeDays, type LearnUser } from "@coddle/shared";
import {
  findById,
  upsertFromCoddle as upsertFromCoddleRow,
  type UserWithSkills,
} from "./users.repository.js";

type CoddleIdentity = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

export async function upsertFromCoddle(profile: CoddleIdentity): Promise<User> {
  return upsertFromCoddleRow(profile);
}

export async function findUserById(id: string) {
  return findById(id);
}

export function toPublicUser(user: User & { skills?: UserWithSkills["skills"] }): LearnUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
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
  };
}
