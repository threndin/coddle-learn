import { CHALLENGE_SOLVE_POINT_REASON, challengeRankBonus } from "@coddle/shared";
import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import { awardUserPoints } from "../points/points.repository.js";

const userCard = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} as const;

export function listPublishedChallenges() {
  return prisma.challenge.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function findPublishedChallenge(slug: string) {
  return prisma.challenge.findFirst({
    where: { slug, published: true },
  });
}

export function listUserSolves(userId: string) {
  return prisma.challengeSolve.findMany({
    where: { userId },
    select: {
      challengeId: true,
      rank: true,
      pointsAwarded: true,
      rankBonus: true,
      attempts: true,
      solvedAt: true,
    },
  });
}

export function countSolvesByChallenge() {
  return prisma.challengeSolve.groupBy({
    by: ["challengeId"],
    _count: { userId: true },
  });
}

export function listStandingRows() {
  return prisma.challengeSolve.groupBy({
    by: ["userId"],
    _sum: { pointsAwarded: true },
    _count: { userId: true },
    _min: { solvedAt: true },
  });
}

export function findUsersByIds(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: userCard,
  });
}

export function findUserSolve(userId: string, challengeId: string) {
  return prisma.challengeSolve.findUnique({
    where: { userId_challengeId: { userId, challengeId } },
  });
}

export function countChallengeSolves(challengeId: string) {
  return prisma.challengeSolve.count({ where: { challengeId } });
}

export function listChallengeBoard(challengeId: string, take: number) {
  return prisma.challengeSolve.findMany({
    where: { challengeId },
    orderBy: [{ rank: "asc" }, { solvedAt: "asc" }],
    take,
    include: { user: { select: userCard } },
  });
}

export function countUserSubmissions(userId: string, challengeId: string) {
  return prisma.challengeSubmission.count({ where: { userId, challengeId } });
}

export function latestUserSubmission(userId: string, challengeId: string) {
  return prisma.challengeSubmission.findFirst({
    where: { userId, challengeId },
    orderBy: { createdAt: "desc" },
  });
}

export function createChallengeSubmission(data: {
  userId: string;
  challengeId: string;
  code: string;
  status: "passed" | "failed";
  testsPassed: number;
  testsTotal: number;
  runtimeError: string | null;
  results: PrismaTypes.InputJsonValue;
}) {
  return prisma.challengeSubmission.create({ data });
}

export async function recordFirstSolve(input: {
  userId: string;
  challengeId: string;
  submissionId: string;
  basePoints: number;
}): Promise<
  | {
      created: true;
      rank: number;
      rankBonus: number;
      pointsAwarded: number;
      attempts: number;
    }
  | { created: false }
> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM challenges WHERE id = ${input.challengeId} FOR UPDATE`;
      const existing = await tx.challengeSolve.findUnique({
        where: {
          userId_challengeId: { userId: input.userId, challengeId: input.challengeId },
        },
      });
      if (existing) return { created: false as const };

      const ahead = await tx.challengeSolve.count({
        where: { challengeId: input.challengeId },
      });
      const rank = ahead + 1;
      const rankBonus = challengeRankBonus(rank);
      const pointsAwarded = input.basePoints + rankBonus;
      const attempts = await tx.challengeSubmission.count({
        where: { userId: input.userId, challengeId: input.challengeId },
      });

      await tx.challengeSolve.create({
        data: {
          userId: input.userId,
          challengeId: input.challengeId,
          submissionId: input.submissionId,
          attempts,
          rank,
          basePoints: input.basePoints,
          rankBonus,
          pointsAwarded,
        },
      });
      await awardUserPoints(
        {
          userId: input.userId,
          amount: pointsAwarded,
          reason: CHALLENGE_SOLVE_POINT_REASON,
          refType: "challenge",
          refId: input.challengeId,
        },
        tx,
      );
      return {
        created: true as const,
        rank,
        rankBonus,
        pointsAwarded,
        attempts,
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { created: false };
    }
    throw error;
  }
}

export function readUserPoints(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });
}
