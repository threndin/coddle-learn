import type { User } from "@prisma/client";
import { usernameFromName } from "@coddle/shared";
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

async function allocateUsername(name: string, prefer?: string | null): Promise<string> {
  const base = prefer && prefer.length >= 3 ? prefer : usernameFromName(name);
  const candidates = [base];
  for (let i = 0; i < 12; i += 1) {
    const suffix = Math.random().toString(36).slice(2, 6);
    candidates.push(`${base.slice(0, 27)}-${suffix}`);
  }

  for (const candidate of candidates) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  return `${base.slice(0, 20)}-${Date.now().toString(36)}`;
}

export async function upsertFromCoddle(profile: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}): Promise<User> {
  const now = new Date();
  const existing = await prisma.user.findUnique({
    where: { coddleUserId: profile.id },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        lastLoginAt: now,
      },
    });
  }

  const username = await allocateUsername(profile.name);

  return prisma.user.create({
    data: {
      coddleUserId: profile.id,
      email: profile.email,
      username,
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

export async function findByUsername(username: string): Promise<UserWithSkills | null> {
  return prisma.user.findUnique({
    where: { username },
    include: userWithSkillsInclude,
  });
}

export async function findByUsernameOrId(usernameOrId: string): Promise<UserWithSkills | null> {
  const byUsername = await findByUsername(usernameOrId);
  if (byUsername) return byUsername;
  return findById(usernameOrId);
}
