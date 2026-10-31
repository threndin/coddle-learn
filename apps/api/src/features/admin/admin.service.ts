import type { Prisma } from "@prisma/client";
import {
  ADMIN_LIMITS,
  ASSISTANT_WEEKLY_LIMIT,
  assistantQuotaFromUsed,
  isAdminUserRoleFilter,
  isAdminUserStatusFilter,
  isUserRole,
  parseUserRole,
  utcWeekStart,
  type AdminOverview,
  type AdminUsage,
  type AdminUserRow,
  type AdminUsersPage,
  type UserRole,
} from "@coddle/shared";
import {
  conversationStatsForUsers,
  countAtQuota,
  countCommunityPosts,
  countConversations,
  countMessages,
  countPassedAssessments,
  countPendingReviews,
  countPublished,
  countUserCourses,
  countUserRoadmaps,
  countUsers,
  countUsersByRole,
  findAdminUser,
  listRecentConversations,
  listUsageUsers,
  listUserCreatedSince,
  listUsers,
  listWeeklyUsageHistory,
  sumWeeklyUsage,
  updateUserSuspended,
} from "./admin.repository.js";
import { AppError } from "../../shared/errors.js";
import { revokeAllUserSessions } from "../auth/session.js";

const MAX_SEARCH_TERMS = 5;

function firstString(value: unknown): string {
  if (Array.isArray(value)) return firstString(value[0]);
  return typeof value === "string" ? value.trim() : "";
}

function parsePage(value: unknown): number {
  const parsed = Number.parseInt(firstString(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 1000);
}

function roleCounts(rows: { role: string; _count: { _all: number } }[]): Record<UserRole, number> {
  const next: Record<UserRole, number> = { learner: 0, reviewer: 0, admin: 0 };
  for (const row of rows) {
    if (isUserRole(row.role)) next[row.role] = row._count._all;
  }
  return next;
}

function historyWeeks(weekStart: Date, count: number) {
  const oldest = new Date(weekStart);
  oldest.setUTCDate(oldest.getUTCDate() - 7 * (count - 1));
  return [...Array(count)].map((_, index) => {
    const start = new Date(oldest);
    start.setUTCDate(start.getUTCDate() + 7 * index);
    return start;
  });
}

function userSearchWhere(q: string): Prisma.UserWhereInput {
  const terms = q.split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TERMS);
  if (terms.length === 0) return {};
  return {
    AND: terms.map((term) => ({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { username: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ],
    })),
  };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const weekStart = utcWeekStart();
  const weeks = historyWeeks(weekStart, ADMIN_LIMITS.weekHistory);
  const oldest = weeks[0] ?? weekStart;
  const [
    total,
    newThisWeek,
    activeThisWeek,
    onboarded,
    byRole,
    roadmapsStarted,
    roadmapsCompleted,
    courseEnrollments,
    coursesCompleted,
    publishedCourses,
    publishedResources,
    publishedProjects,
    assessmentsPassed,
    communityPosts,
    pendingReviews,
    weekly,
    atQuota,
    conversations,
    messages,
    conversationsThisWeek,
    signups,
    assistantHistory,
  ] = await Promise.all([
    countUsers(),
    countUsers({ createdAt: { gte: weekStart } }),
    countUsers({ lastLoginAt: { gte: weekStart } }),
    countUsers({ onboardingCompletedAt: { not: null } }),
    countUsersByRole(),
    countUserRoadmaps(false),
    countUserRoadmaps(true),
    countUserCourses(false),
    countUserCourses(true),
    countPublished("course"),
    countPublished("resource"),
    countPublished("project"),
    countPassedAssessments(),
    countCommunityPosts(),
    countPendingReviews(),
    sumWeeklyUsage(weekStart),
    countAtQuota(weekStart),
    countConversations(),
    countMessages(),
    countConversations(weekStart),
    listUserCreatedSince(oldest),
    listWeeklyUsageHistory(oldest),
  ]);

  const quota = assistantQuotaFromUsed(weekly._sum.used ?? 0, weekStart);
  const signupsByWeek = new Map<string, number>();
  for (const row of signups) {
    const key = utcWeekStart(row.createdAt).toISOString();
    signupsByWeek.set(key, (signupsByWeek.get(key) ?? 0) + 1);
  }
  const [weekGroups] = assistantHistory;
  const sendsByWeek = new Map(
    weekGroups.map((row) => [row.weekStart.toISOString(), row._sum.used ?? 0]),
  );
  const usersByWeek = new Map(
    weekGroups.map((row) => [row.weekStart.toISOString(), row._count._all]),
  );

  return {
    generatedAt: new Date().toISOString(),
    users: {
      total,
      newThisWeek,
      activeThisWeek,
      onboarded,
      byRole: roleCounts(byRole),
    },
    learning: {
      roadmapsStarted,
      roadmapsCompleted,
      courseEnrollments,
      coursesCompleted,
      publishedCourses,
      publishedResources,
      publishedProjects,
      assessmentsPassed,
      communityPosts,
      pendingReviews,
    },
    assistant: {
      weeklyLimit: ASSISTANT_WEEKLY_LIMIT,
      weekStart: weekStart.toISOString(),
      resetsAt: quota.resetsAt,
      sendsThisWeek: weekly._sum.used ?? 0,
      usersThisWeek: weekly._count._all,
      atQuota,
      conversations,
      messages,
      conversationsThisWeek,
    },
    weeks: weeks.map((start) => {
      const key = start.toISOString();
      return {
        weekStart: key,
        signups: signupsByWeek.get(key) ?? 0,
        assistantSends: sendsByWeek.get(key) ?? 0,
        assistantUsers: usersByWeek.get(key) ?? 0,
      };
    }),
  };
}

function toAdminUserRow(row: {
  id: string;
  username: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  points: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  onboardingCompletedAt: Date | null;
  suspendedAt: Date | null;
  assistantWeeklyUsage?: { used: number }[];
}): AdminUserRow {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatarUrl,
    role: parseUserRole(row.role),
    points: row.points,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    onboardingCompletedAt: row.onboardingCompletedAt?.toISOString() ?? null,
    assistantUsedThisWeek: row.assistantWeeklyUsage?.[0]?.used ?? 0,
    suspendedAt: row.suspendedAt?.toISOString() ?? null,
  };
}

export async function getAdminUsers(query: Record<string, unknown>): Promise<AdminUsersPage> {
  const q = firstString(query.q).slice(0, ADMIN_LIMITS.queryMax);
  const roleRaw = firstString(query.role);
  const role = isAdminUserRoleFilter(roleRaw) ? roleRaw : "all";
  const statusRaw = firstString(query.status);
  const status = isAdminUserStatusFilter(statusRaw) ? statusRaw : "all";
  const page = parsePage(query.page);
  const weekStart = utcWeekStart();
  const baseWhere: Prisma.UserWhereInput = {
    ...userSearchWhere(q),
    ...(role === "all" ? {} : { role }),
  };
  const where: Prisma.UserWhereInput = {
    ...baseWhere,
    ...(status === "suspended"
      ? { suspendedAt: { not: null } }
      : status === "active"
        ? { suspendedAt: null }
        : {}),
  };

  const [total, rows, all, suspended] = await Promise.all([
    countUsers(where),
    listUsers({
      where,
      skip: (page - 1) * ADMIN_LIMITS.pageSize,
      take: ADMIN_LIMITS.pageSize,
      weekStart,
    }),
    countUsers(baseWhere),
    countUsers({ ...baseWhere, suspendedAt: { not: null } }),
  ]);

  return {
    q,
    role,
    status,
    page,
    pageSize: ADMIN_LIMITS.pageSize,
    total,
    counts: {
      all,
      active: Math.max(0, all - suspended),
      suspended,
    },
    users: rows.map(toAdminUserRow),
  };
}

export async function setUserSuspended(
  actorId: string,
  userId: string,
  suspended: boolean,
): Promise<{ user: AdminUserRow }> {
  if (actorId === userId) {
    throw new AppError(400, "cannot_suspend_self", "You cannot suspend your own account.");
  }
  const existing = await findAdminUser(userId);
  if (!existing) {
    throw new AppError(404, "user_missing", "That user no longer exists.");
  }
  if (Boolean(existing.suspendedAt) === suspended) {
    return { user: toAdminUserRow(existing) };
  }
  const user = await updateUserSuspended(userId, suspended ? new Date() : null);
  if (suspended) {
    await revokeAllUserSessions(userId);
  }
  return { user: toAdminUserRow(user) };
}

export async function getAdminUsage(query: Record<string, unknown>): Promise<AdminUsage> {
  const page = parsePage(query.page);
  const weekStart = utcWeekStart();
  const oldest = new Date(weekStart);
  oldest.setUTCDate(oldest.getUTCDate() - 7 * (ADMIN_LIMITS.weekHistory - 1));
  const quota = assistantQuotaFromUsed(0, weekStart);

  const [weekly, atQuota, conversations, messages, conversationsThisWeek, history, usageRows, recent] =
    await Promise.all([
      sumWeeklyUsage(weekStart),
      countAtQuota(weekStart),
      countConversations(),
      countMessages(),
      countConversations(weekStart),
      listWeeklyUsageHistory(oldest),
      listUsageUsers({
        weekStart,
        skip: (page - 1) * ADMIN_LIMITS.pageSize,
        take: ADMIN_LIMITS.pageSize,
      }),
      listRecentConversations(ADMIN_LIMITS.recentConversations),
    ]);

  const [weekGroups, atQuotaGroups] = history;
  const atQuotaByWeek = new Map(
    atQuotaGroups.map((row) => [row.weekStart.toISOString(), row._count._all]),
  );
  const weeks = [...Array(ADMIN_LIMITS.weekHistory)].map((_, index) => {
    const start = new Date(oldest);
    start.setUTCDate(start.getUTCDate() + 7 * index);
    const key = start.toISOString();
    const match = weekGroups.find((row) => row.weekStart.toISOString() === key);
    return {
      weekStart: key,
      sends: match?._sum.used ?? 0,
      users: match?._count._all ?? 0,
      atQuota: atQuotaByWeek.get(key) ?? 0,
    };
  });

  const stats = await conversationStatsForUsers(usageRows.map((row) => row.userId));
  const statsByUser = new Map(stats.map((row) => [row.userId, row]));

  return {
    weekStart: weekStart.toISOString(),
    resetsAt: quota.resetsAt,
    weeklyLimit: ASSISTANT_WEEKLY_LIMIT,
    sendsThisWeek: weekly._sum.used ?? 0,
    usersThisWeek: weekly._count._all,
    atQuota,
    conversations,
    messages,
    conversationsThisWeek,
    weeks,
    page,
    pageSize: ADMIN_LIMITS.pageSize,
    totalUsers: weekly._count._all,
    users: usageRows.map((row) => {
      const extra = statsByUser.get(row.userId);
      return {
        id: row.user.id,
        username: row.user.username,
        name: row.user.name,
        email: row.user.email,
        avatarUrl: row.user.avatarUrl,
        used: row.used,
        remaining: Math.max(0, ASSISTANT_WEEKLY_LIMIT - row.used),
        conversations: extra?._count._all ?? 0,
        lastActiveAt: extra?._max.updatedAt?.toISOString() ?? null,
      };
    }),
    recentConversations: recent.map((row) => ({
      id: row.id,
      title: row.title,
      messageCount: row._count.messages,
      updatedAt: row.updatedAt.toISOString(),
      user: row.user,
    })),
  };
}
