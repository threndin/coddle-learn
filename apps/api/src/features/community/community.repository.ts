import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

const authorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const quotedPostInclude = {
  author: { select: authorSelect },
} satisfies Prisma.CommunityPostInclude;

const postInclude = {
  author: { select: authorSelect },
  quotePost: { include: quotedPostInclude },
} satisfies Prisma.CommunityPostInclude;

const commentInclude = {
  author: { select: authorSelect },
} satisfies Prisma.CommunityCommentInclude;

export type CommunityPostRow = Prisma.CommunityPostGetPayload<{
  include: typeof postInclude;
}>;

export type CommunityCommentRow = Prisma.CommunityCommentGetPayload<{
  include: typeof commentInclude;
}>;

export async function listCommunityPosts(input: {
  where: Prisma.CommunityPostWhereInput;
  skip: number;
  take: number;
  orderBy?: Prisma.CommunityPostOrderByWithRelationInput | Prisma.CommunityPostOrderByWithRelationInput[];
}): Promise<{ rows: CommunityPostRow[]; total: number }> {
  const [rows, total] = await prisma.$transaction([
    prisma.communityPost.findMany({
      where: input.where,
      include: postInclude,
      orderBy: input.orderBy ?? { createdAt: "desc" },
      skip: input.skip,
      take: input.take,
    }),
    prisma.communityPost.count({ where: input.where }),
  ]);
  return { rows, total };
}

export async function listCommunityPostCandidates(input: {
  where: Prisma.CommunityPostWhereInput;
  take: number;
}): Promise<{ rows: CommunityPostRow[]; total: number }> {
  const [rows, total] = await prisma.$transaction([
    prisma.communityPost.findMany({
      where: input.where,
      include: postInclude,
      orderBy: { createdAt: "desc" },
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

/** Resolve a live post by slug, falling back to id for older links. */
export async function findCommunityPostByRef(ref: string) {
  return prisma.communityPost.findFirst({
    where: {
      isDeleted: false,
      OR: [{ slug: ref }, { id: ref }],
    },
    include: postInclude,
  });
}

/** Load a post even when soft-deleted (for quote embeds). */
export async function findCommunityPostAny(id: string) {
  return prisma.communityPost.findUnique({
    where: { id },
    include: postInclude,
  });
}

export async function communitySlugsLike(base: string, excludeId?: string) {
  const rows = await prisma.communityPost.findMany({
    where: {
      slug: { startsWith: base },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}

export async function softDeleteCommunityPost(id: string, authorId: string) {
  const result = await prisma.communityPost.updateMany({
    where: { id, authorId, isDeleted: false },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  return result.count > 0;
}

export async function updateCommunityPost(
  id: string,
  authorId: string,
  data: {
    slug: string;
    title: string;
    body: string;
    topic: string;
    relatedSlug: string | null;
    relatedTitle: string | null;
    editedAt: Date;
  },
): Promise<CommunityPostRow | null> {
  const existing = await prisma.communityPost.findFirst({
    where: { id, authorId, isDeleted: false },
    select: { id: true },
  });
  if (!existing) return null;
  return prisma.communityPost.update({
    where: { id },
    data,
    include: postInclude,
  });
}

export async function createReport(data: {
  reporterId: string;
  postId?: string | null;
  commentId?: string | null;
  reason: string;
  details: string | null;
}) {
  return prisma.communityReport.create({ data });
}

export async function findReportByReporterAndPost(reporterId: string, postId: string) {
  return prisma.communityReport.findFirst({
    where: { reporterId, postId },
  });
}

export async function findReportByReporterAndComment(reporterId: string, commentId: string) {
  return prisma.communityReport.findFirst({
    where: { reporterId, commentId },
  });
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
  slug: string;
  kind: string;
  topic: string;
  relatedSlug: string | null;
  relatedTitle: string | null;
  title: string;
  body: string;
  imageUrls: string[];
  quotePostId?: string | null;
}): Promise<CommunityPostRow> {
  return prisma.communityPost.create({
    data: {
      authorId: data.authorId,
      slug: data.slug,
      kind: data.kind,
      topic: data.topic,
      relatedSlug: data.relatedSlug,
      relatedTitle: data.relatedTitle,
      title: data.title,
      body: data.body,
      imageUrls: data.imageUrls,
      quotePostId: data.quotePostId ?? null,
    },
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

export async function listPostReactions(postId: string) {
  return prisma.communityPostReaction.findMany({
    where: { postId },
    include: { user: { select: authorSelect } },
    orderBy: { createdAt: "desc" },
  });
}

/** Live posts that quote the given post. */
export async function listQuotesOfPost(postId: string) {
  return prisma.communityPost.findMany({
    where: { quotePostId: postId, isDeleted: false },
    include: { author: { select: authorSelect } },
    orderBy: { createdAt: "desc" },
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

export async function listTopLevelComments(postId: string, take: number) {
  return prisma.communityComment.findMany({
    where: { postId, parentId: null, isDeleted: false },
    include: commentInclude,
    orderBy: { createdAt: "asc" },
    take,
  });
}

export async function listRepliesForParents(parentIds: string[]) {
  if (parentIds.length === 0) return [];
  return prisma.communityComment.findMany({
    where: { parentId: { in: parentIds }, isDeleted: false },
    include: commentInclude,
    orderBy: { createdAt: "asc" },
  });
}

export async function findComment(id: string) {
  return prisma.communityComment.findFirst({
    where: { id, isDeleted: false },
    include: commentInclude,
  });
}

export async function createComment(data: {
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
}): Promise<CommunityCommentRow> {
  const [comment] = await prisma.$transaction([
    prisma.communityComment.create({
      data,
      include: commentInclude,
    }),
    prisma.communityPost.update({
      where: { id: data.postId },
      data: { commentCount: { increment: 1 } },
    }),
  ]);
  return comment;
}

export async function updateCommentBody(id: string, authorId: string, body: string) {
  const existing = await prisma.communityComment.findFirst({
    where: { id, authorId, isDeleted: false },
    select: { id: true },
  });
  if (!existing) return null;
  return prisma.communityComment.update({
    where: { id },
    data: { body, editedAt: new Date() },
    include: commentInclude,
  });
}

export async function softDeleteCommentTree(id: string, authorId: string) {
  const existing = await prisma.communityComment.findFirst({
    where: { id, authorId, isDeleted: false },
  });
  if (!existing) return null;

  const replyUpdate = await prisma.communityComment.updateMany({
    where: { parentId: id, isDeleted: false },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  await prisma.communityComment.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  const removed = 1 + replyUpdate.count;
  await prisma.communityPost.update({
    where: { id: existing.postId },
    data: { commentCount: { decrement: removed } },
  });
  return { postId: existing.postId, removed };
}

export async function listCommentReactionCounts(commentIds: string[]) {
  if (commentIds.length === 0) return [];
  return prisma.communityCommentReaction.groupBy({
    by: ["commentId", "emoji"],
    where: { commentId: { in: commentIds } },
    _count: { _all: true },
  });
}

export async function listMyCommentReactions(userId: string, commentIds: string[]) {
  if (commentIds.length === 0) return [];
  return prisma.communityCommentReaction.findMany({
    where: { userId, commentId: { in: commentIds } },
    select: { commentId: true, emoji: true },
  });
}

export async function findMyCommentReaction(commentId: string, userId: string) {
  return prisma.communityCommentReaction.findUnique({
    where: { commentId_userId: { commentId, userId } },
  });
}

export async function upsertCommentReaction(commentId: string, userId: string, emoji: string) {
  return prisma.communityCommentReaction.upsert({
    where: { commentId_userId: { commentId, userId } },
    create: { commentId, userId, emoji },
    update: { emoji },
  });
}

export async function deleteCommentReaction(commentId: string, userId: string) {
  try {
    await prisma.communityCommentReaction.delete({
      where: { commentId_userId: { commentId, userId } },
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
  username: true,
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
  username: string;
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

export async function searchPeopleCandidates(input: {
  where: Prisma.UserWhereInput;
  take: number;
  orderBy?: Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[];
}): Promise<{ rows: SpotlightUserRow[]; total: number }> {
  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: input.where,
      select: spotlightSelect,
      orderBy: input.orderBy ?? [{ points: "desc" }, { createdAt: "desc" }],
      take: input.take,
    }),
    prisma.user.count({ where: input.where }),
  ]);
  return { rows, total };
}
