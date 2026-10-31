import { USER_ROLES, type UserRole } from "./roles.js";

export const ADMIN_LIMITS = {
  pageSize: 20,
  queryMax: 100,
  recentConversations: 12,
  weekHistory: 8,
} as const;

export const ADMIN_USER_ROLE_FILTERS = ["all", ...USER_ROLES] as const;
export type AdminUserRoleFilter = (typeof ADMIN_USER_ROLE_FILTERS)[number];

export function isAdminUserRoleFilter(value: unknown): value is AdminUserRoleFilter {
  return (
    typeof value === "string" &&
    (ADMIN_USER_ROLE_FILTERS as readonly string[]).includes(value)
  );
}

export const ADMIN_USER_STATUS_FILTERS = ["all", "active", "suspended"] as const;
export type AdminUserStatusFilter = (typeof ADMIN_USER_STATUS_FILTERS)[number];

export const ADMIN_USER_STATUS_LABELS: Record<AdminUserStatusFilter, string> = {
  all: "All people",
  active: "Active",
  suspended: "Suspended",
};

export function isAdminUserStatusFilter(value: unknown): value is AdminUserStatusFilter {
  return (
    typeof value === "string" &&
    (ADMIN_USER_STATUS_FILTERS as readonly string[]).includes(value)
  );
}

export type AdminPerson = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
};

export type AdminOverviewWeek = {
  weekStart: string;
  signups: number;
  assistantSends: number;
  assistantUsers: number;
};

export type AdminOverview = {
  generatedAt: string;
  users: {
    total: number;
    newThisWeek: number;
    activeThisWeek: number;
    onboarded: number;
    byRole: Record<UserRole, number>;
  };
  learning: {
    roadmapsStarted: number;
    roadmapsCompleted: number;
    courseEnrollments: number;
    coursesCompleted: number;
    publishedCourses: number;
    publishedResources: number;
    publishedProjects: number;
    assessmentsPassed: number;
    communityPosts: number;
    pendingReviews: number;
  };
  assistant: {
    weeklyLimit: number;
    weekStart: string;
    resetsAt: string;
    sendsThisWeek: number;
    usersThisWeek: number;
    atQuota: number;
    conversations: number;
    messages: number;
    conversationsThisWeek: number;
  };
  weeks: AdminOverviewWeek[];
};

export type AdminUserRow = {
  id: string;
  username: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  points: number;
  lastLoginAt: string | null;
  createdAt: string;
  onboardingCompletedAt: string | null;
  assistantUsedThisWeek: number;
  suspendedAt: string | null;
};

export type AdminUsersPage = {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  role: AdminUserRoleFilter;
  status: AdminUserStatusFilter;
  counts: Record<AdminUserStatusFilter, number>;
};

export type AdminUsageWeek = {
  weekStart: string;
  sends: number;
  users: number;
  atQuota: number;
};

export type AdminUsageUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  used: number;
  remaining: number;
  conversations: number;
  lastActiveAt: string | null;
};

export type AdminConversationRow = {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
  user: AdminPerson;
};

export type AdminUsage = {
  weekStart: string;
  resetsAt: string;
  weeklyLimit: number;
  sendsThisWeek: number;
  usersThisWeek: number;
  atQuota: number;
  conversations: number;
  messages: number;
  conversationsThisWeek: number;
  weeks: AdminUsageWeek[];
  users: AdminUsageUser[];
  recentConversations: AdminConversationRow[];
  page: number;
  pageSize: number;
  totalUsers: number;
};
