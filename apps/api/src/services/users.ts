import type { User } from "@prisma/client";
import { isExperienceLevel, normalizePracticeDays, type LearnUser } from "@coddle/shared";
import { prisma } from "../db.js";
import type { CoddleProfile } from "./coddle.js";

type SkillLink = {
  skill: {
    slug: string;
    name: string;
  };
};

export async function upsertFromCoddle(profile: CoddleProfile): Promise<User> {
  const now = new Date();

  return prisma.user.upsert({
    where: { coddleUserId: profile.id },
    create: {
      coddleUserId: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      lastLoginAt: now,
    },
    update: {
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      lastLoginAt: now,
    },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      skills: {
        include: { skill: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export function toPublicUser(user: User & { skills?: SkillLink[] }): LearnUser {
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
    skills: (user.skills ?? []).map((row) => ({
      slug: row.skill.slug,
      name: row.skill.name,
    })),
  };
}
