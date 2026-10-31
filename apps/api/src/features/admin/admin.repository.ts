import type { Prisma } from "@prisma/client";
import { ASSISTANT_WEEKLY_LIMIT } from "@coddle/shared";
import { prisma } from "../../shared/db.js";

const personSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const userRowSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
  points: true,
  lastLoginAt: true,
  createdAt: true,
  onboardingCompletedAt: true,
  suspendedAt: true,
} satisfies Prisma.UserSelect;

export function countUsers(where: Prisma.UserWhereInput = {}) {
  return prisma.user.count({ where });
}

export function countUsersByRole() {
  return prisma.user.groupBy({
    by: ["role"],
    _count: { _all: true },
  });
}

export function countUserRoadmaps(completed: boolean) {
  return prisma.userRoadmap.count({
    where: completed ? { completedAt: { not: null } } : {},
  });
}

export function countUserCourses(completed: boolean) {
  return prisma.userCourse.count({
    where: completed ? { completedAt: { not: null } } : {},
  });
}

export function countPublished(model: "course" | "resource" | "project") {
  if (model === "course") return prisma.course.count({ where: { status: "published" } });
  if (model === "resource") return prisma.resource.count({ where: { status: "published" } });
  return prisma.project.count({ where: { status: "published" } });
}

export function countPassedAssessments() {
  return prisma.assessmentAttempt.count({ where: { passed: true } });
}

export function countCommunityPosts() {
  return prisma.communityPost.count({ where: { isDeleted: false } });
}

export function countPendingReviews() {
  return Promise.all([
    prisma.course.count({ where: { status: "in_review", flaggedAt: null } }),
    prisma.project.count({ where: { status: "in_review", flaggedAt: null } }),
    prisma.resource.count({ where: { status: "pending", flaggedAt: null } }),
    prisma.tool.count({ where: { status: "pending", flaggedAt: null } }),
  ]).then((counts) => counts.reduce((sum, n) => sum + n, 0));
}

export function countConversations(since?: Date) {
  return prisma.assistantConversation.count({
    where: since ? { createdAt: { gte: since } } : {},
  });
}

export function countMessages() {
  return prisma.assistantMessage.count();
}

export function sumWeeklyUsage(weekStart: Date) {
  return prisma.assistantWeeklyUsage.aggregate({
    where: { weekStart },
    _sum: { used: true },
    _count: { _all: true },
  });
}

export function countAtQuota(weekStart: Date) {
  return prisma.assistantWeeklyUsage.count({
    where: { weekStart, used: { gte: ASSISTANT_WEEKLY_LIMIT } },
  });
}

export function listUserCreatedSince(since: Date) {
  return prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
}

export function listWeeklyUsageHistory(since: Date) {
  return Promise.all([
    prisma.assistantWeeklyUsage.groupBy({
      by: ["weekStart"],
      where: { weekStart: { gte: since } },
      _sum: { used: true },
      _count: { _all: true },
    }),
    prisma.assistantWeeklyUsage.groupBy({
      by: ["weekStart"],
      where: { weekStart: { gte: since }, used: { gte: ASSISTANT_WEEKLY_LIMIT } },
      _count: { _all: true },
    }),
  ]);
}

export function listUsers(args: {
  where: Prisma.UserWhereInput;
  skip: number;
  take: number;
  weekStart: Date;
}) {
  return prisma.user.findMany({
    where: args.where,
    skip: args.skip,
    take: args.take,
    orderBy: [{ lastLoginAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: {
      ...userRowSelect,
      assistantWeeklyUsage: {
        where: { weekStart: args.weekStart },
        select: { used: true },
      },
    },
  });
}

export function listUsageUsers(args: { weekStart: Date; skip: number; take: number }) {
  return prisma.assistantWeeklyUsage.findMany({
    where: { weekStart: args.weekStart },
    orderBy: [{ used: "desc" }, { userId: "asc" }],
    skip: args.skip,
    take: args.take,
    include: {
      user: { select: { ...userRowSelect } },
    },
  });
}

export function conversationStatsForUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return Promise.resolve(
      [] as { userId: string; _count: { _all: number }; _max: { updatedAt: Date | null } }[],
    );
  }
  return prisma.assistantConversation.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _count: { _all: true },
    _max: { updatedAt: true },
  });
}

export function findAdminUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: userRowSelect,
  });
}

export function updateUserSuspended(id: string, suspendedAt: Date | null) {
  return prisma.user.update({
    where: { id },
    data: { suspendedAt },
    select: userRowSelect,
  });
}

export function listRecentConversations(take: number) {
  return prisma.assistantConversation.findMany({
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      user: { select: personSelect },
      _count: { select: { messages: true } },
    },
  });
}
