import type { User } from "@prisma/client";
import { prisma } from "../../shared/db.js";

export type UserWithSkills = User & {
  skills: {
    skill: {
      slug: string;
      name: string;
    };
  }[];
};

const userWithSkillsInclude = {
  skills: {
    include: { skill: true },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function upsertFromCoddle(profile: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}): Promise<User> {
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

export async function findById(id: string): Promise<UserWithSkills | null> {
  return prisma.user.findUnique({
    where: { id },
    include: userWithSkillsInclude,
  });
}
