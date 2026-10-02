import type { User } from "@prisma/client";
import { prisma } from "../db.js";
import type { CoddleProfile } from "./coddle.js";

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

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    coddleUserId: user.coddleUserId,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
