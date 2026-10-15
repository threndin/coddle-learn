import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

const postInclude = {
  author: {
    select: { id: true, name: true, avatarUrl: true },
  },
} satisfies Prisma.CommunityPostInclude;

export type CommunityPostRow = Prisma.CommunityPostGetPayload<{
  include: typeof postInclude;
}>;

export async function listCommunityPosts(input: {
  where: Prisma.CommunityPostWhereInput;
  skip: number;
  take: number;
}): Promise<{ rows: CommunityPostRow[]; total: number }> {
  const [rows, total] = await prisma.$transaction([
    prisma.communityPost.findMany({
      where: input.where,
      include: postInclude,
      orderBy: { createdAt: "desc" },
      skip: input.skip,
      take: input.take,
    }),
    prisma.communityPost.count({ where: input.where }),
  ]);
  return { rows, total };
}

export async function findCommunityPost(id: string) {
  return prisma.communityPost.findFirst({
    where: { id, isDeleted: false },
    include: postInclude,
  });
}

export async function softDeleteCommunityPost(id: string, authorId: string) {
  const result = await prisma.communityPost.updateMany({
    where: { id, authorId, isDeleted: false },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  return result.count > 0;
}

export async function countCommunityPostsByKind(where: Prisma.CommunityPostWhereInput) {
  const rows = await prisma.communityPost.groupBy({
    by: ["kind"],
    where,
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.kind, row._count._all]));
}

export async function countCommunityPosts(where: Prisma.CommunityPostWhereInput) {
  return prisma.communityPost.count({ where });
}

export async function countPostsSince(authorId: string, since: Date) {
  return prisma.communityPost.count({
    where: { authorId, createdAt: { gte: since }, isDeleted: false },
  });
}

export async function createCommunityPost(data: {
  authorId: string;
  kind: string;
  topic: string;
  relatedSlug: string | null;
  relatedTitle: string | null;
  title: string;
  body: string;
  imageUrls: string[];
}): Promise<CommunityPostRow> {
  return prisma.communityPost.create({
    data,
    include: postInclude,
  });
}

export async function listReactionCounts(postIds: string[]) {
  if (postIds.length === 0) return [];
  return prisma.communityPostReaction.groupBy({
    by: ["postId", "emoji"],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });
}

export async function listMyReactions(userId: string, postIds: string[]) {
  if (postIds.length === 0) return [];
  return prisma.communityPostReaction.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true, emoji: true },
  });
}

export async function findMyReaction(postId: string, userId: string) {
  return prisma.communityPostReaction.findUnique({
    where: { postId_userId: { postId, userId } },
  });
}

/** Returns true when this is the first impression for the user. */
export async function recordImpression(postId: string, userId: string): Promise<boolean> {
  // skipDuplicates avoids P2002 noise when the same card is observed twice (Strict Mode,
  // remounts, or overlapping observers). Only the first insert bumps the counter.
  const inserted = await prisma.communityPostImpression.createMany({
    data: [{ postId, userId }],
    skipDuplicates: true,
  });
  if (inserted.count === 0) return false;
  await prisma.communityPost.update({
    where: { id: postId },
    data: { impressionCount: { increment: 1 } },
  });
  return true;
}

export async function upsertReaction(postId: string, userId: string, emoji: string) {
  return prisma.communityPostReaction.upsert({
    where: { postId_userId: { postId, userId } },
    create: { postId, userId, emoji },
    update: { emoji },
  });
}

export async function deleteReaction(postId: string, userId: string) {
  try {
    await prisma.communityPostReaction.delete({
      where: { postId_userId: { postId, userId } },
    });
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return false;
    }
    throw error;
  }
}

const activePosts = { isDeleted: false } as const;

const spotlightSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  points: true,
  experienceLevel: true,
  _count: {
    select: {
      communityPosts: { where: activePosts },
      projectSubmissions: true,
    },
  },
} as const;

export type SpotlightUserRow = {
  id: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  experienceLevel: string | null;
  _count: { communityPosts: number; projectSubmissions: number };
};

/** Active learners ranked by community posts, then points. Excludes the viewer. */
export async function listSpotlightLearners(
  excludeUserId: string,
  take: number,
): Promise<SpotlightUserRow[]> {
  const withPosts = await prisma.user.findMany({
    where: {
      id: { not: excludeUserId },
      onboardingCompletedAt: { not: null },
      communityPosts: { some: activePosts },
    },
    select: spotlightSelect,
    orderBy: [{ communityPosts: { _count: "desc" } }, { points: "desc" }],
    take,
  });
  if (withPosts.length >= take) return withPosts;

  const seen = new Set(withPosts.map((user) => user.id));
  const fillers = await prisma.user.findMany({
    where: {
      id: { notIn: [excludeUserId, ...seen] },
      onboardingCompletedAt: { not: null },
    },
    select: spotlightSelect,
    orderBy: [{ points: "desc" }, { createdAt: "desc" }],
    take: take - withPosts.length,
  });
  return [...withPosts, ...fillers];
}
