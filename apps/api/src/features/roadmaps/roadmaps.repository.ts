import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

const roadmapWithSteps = {
  steps: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      resources: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          resource: { select: { id: true, title: true, url: true, type: true, status: true } },
        },
      },
    },
  },
} satisfies Prisma.RoadmapInclude;

export type RoadmapWithSteps = Prisma.RoadmapGetPayload<{
  include: typeof roadmapWithSteps;
}>;

export async function listRoadmaps(): Promise<RoadmapWithSteps[]> {
  return prisma.roadmap.findMany({
    include: roadmapWithSteps,
    orderBy: { sortOrder: "asc" },
  });
}

export async function findRoadmapBySlug(slug: string): Promise<RoadmapWithSteps | null> {
  return prisma.roadmap.findUnique({
    where: { slug },
    include: roadmapWithSteps,
  });
}

export async function listUserRoadmaps(userId: string) {
  return prisma.userRoadmap.findMany({
    where: { userId },
    include: {
      roadmap: {
        include: roadmapWithSteps,
      },
    },
    orderBy: [{ isPrimary: "desc" }, { startedAt: "asc" }],
  });
}

export async function findUserRoadmap(userId: string, roadmapId: string) {
  return prisma.userRoadmap.findUnique({
    where: {
      userId_roadmapId: { userId, roadmapId },
    },
  });
}

export async function createUserRoadmap(
  userId: string,
  roadmapId: string,
  options?: { isPrimary?: boolean },
) {
  if (options?.isPrimary) {
    await prisma.userRoadmap.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  return prisma.userRoadmap.create({
    data: {
      userId,
      roadmapId,
      isPrimary: options?.isPrimary ?? false,
    },
  });
}

export async function setPrimaryRoadmap(userId: string, roadmapId: string) {
  await prisma.$transaction([
    prisma.userRoadmap.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.userRoadmap.update({
      where: { userId_roadmapId: { userId, roadmapId } },
      data: { isPrimary: true },
    }),
  ]);
}

export async function listStepProgressForRoadmap(userId: string, stepIds: string[]) {
  if (stepIds.length === 0) return [];
  return prisma.userStepProgress.findMany({
    where: {
      userId,
      stepId: { in: stepIds },
    },
  });
}

export async function upsertStepProgress(
  userId: string,
  stepId: string,
  status: string,
  pointsAwarded: number,
) {
  return prisma.userStepProgress.upsert({
    where: {
      userId_stepId: { userId, stepId },
    },
    create: { userId, stepId, status, pointsAwarded },
    update: { status, pointsAwarded },
  });
}

export async function deleteStepProgress(userId: string, stepId: string) {
  return prisma.userStepProgress.deleteMany({
    where: { userId, stepId },
  });
}

export async function findStepProgress(userId: string, stepId: string) {
  return prisma.userStepProgress.findUnique({
    where: { userId_stepId: { userId, stepId } },
  });
}

export async function markUserRoadmapCompleted(userId: string, roadmapId: string) {
  return prisma.userRoadmap.update({
    where: {
      userId_roadmapId: { userId, roadmapId },
    },
    data: { completedAt: new Date() },
  });
}

export async function clearUserRoadmapCompleted(userId: string, roadmapId: string) {
  return prisma.userRoadmap.update({
    where: {
      userId_roadmapId: { userId, roadmapId },
    },
    data: { completedAt: null },
  });
}

export async function incrementUserPoints(userId: string, amount: number) {
  if (amount === 0) return;
  return prisma.user.update({
    where: { id: userId },
    data: { points: { increment: amount } },
  });
}

export async function listUserSkillSlugs(userId: string): Promise<string[]> {
  const rows = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: { select: { slug: true } } },
  });
  return rows.map((row) => row.skill.slug);
}
