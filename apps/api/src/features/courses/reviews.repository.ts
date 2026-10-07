import type { Prisma } from "@prisma/client";
import type { ReviewSort } from "@coddle/shared";
import { prisma } from "../../shared/db.js";

export type RatingSummary = {
  average: number;
  count: number;
};

const EMPTY_SUMMARY: RatingSummary = { average: 0, count: 0 };

export async function ratingSummaries(
  courseIds: string[],
): Promise<Map<string, RatingSummary>> {
  if (courseIds.length === 0) return new Map();
  const rows = await prisma.courseReview.groupBy({
    by: ["courseId"],
    where: { courseId: { in: courseIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(
    rows.map((row) => [
      row.courseId,
      {
        average: Math.round((row._avg.rating ?? 0) * 10) / 10,
        count: row._count._all,
      },
    ]),
  );
}

export function summaryFor(map: Map<string, RatingSummary>, courseId: string) {
  return map.get(courseId) ?? EMPTY_SUMMARY;
}

export async function ratingDistribution(courseId: string): Promise<Record<1 | 2 | 3 | 4 | 5, number>> {
  const rows = await prisma.courseReview.groupBy({
    by: ["rating"],
    where: { courseId },
    _count: { _all: true },
  });
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) {
    if (row.rating >= 1 && row.rating <= 5) {
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count._all;
    }
  }
  return distribution;
}

const reviewInclude = {
  user: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.CourseReviewInclude;

export type ReviewWithUser = Prisma.CourseReviewGetPayload<{ include: typeof reviewInclude }>;

const SORT_ORDER: Record<ReviewSort, Prisma.CourseReviewOrderByWithRelationInput[]> = {
  recent: [{ updatedAt: "desc" }],
  highest: [{ rating: "desc" }, { updatedAt: "desc" }],
  lowest: [{ rating: "asc" }, { updatedAt: "desc" }],
};

export async function listReviews(input: {
  courseId: string;
  sort: ReviewSort;
  skip: number;
  take: number;
}): Promise<ReviewWithUser[]> {
  return prisma.courseReview.findMany({
    where: { courseId: input.courseId },
    include: reviewInclude,
    orderBy: SORT_ORDER[input.sort],
    skip: input.skip,
    take: input.take,
  });
}

export async function findReview(courseId: string, userId: string) {
  return prisma.courseReview.findUnique({
    where: { courseId_userId: { courseId, userId } },
    include: reviewInclude,
  });
}

export async function upsertReview(input: {
  courseId: string;
  userId: string;
  rating: number;
  body: string;
}) {
  return prisma.courseReview.upsert({
    where: { courseId_userId: { courseId: input.courseId, userId: input.userId } },
    create: input,
    update: { rating: input.rating, body: input.body },
    include: reviewInclude,
  });
}

export async function deleteReview(courseId: string, userId: string) {
  return prisma.courseReview.deleteMany({ where: { courseId, userId } });
}

export async function completedUserIds(courseId: string, userIds: string[]) {
  if (userIds.length === 0) return new Set<string>();
  const rows = await prisma.userCourse.findMany({
    where: { courseId, userId: { in: userIds }, completedAt: { not: null } },
    select: { userId: true },
  });
  return new Set(rows.map((row) => row.userId));
}
