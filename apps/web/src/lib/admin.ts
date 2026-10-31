import type {
  AdminOverview,
  AdminUsage,
  AdminUserRoleFilter,
  AdminUserRow,
  AdminUsersPage,
  AdminUserStatusFilter,
} from "@coddle/shared";
import { isAdminUserRoleFilter, isAdminUserStatusFilter } from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type {
  AdminOverview,
  AdminUsage,
  AdminUserRoleFilter,
  AdminUserRow,
  AdminUsersPage,
  AdminUserStatusFilter,
};

export type AdminUsersQuery = {
  q: string;
  role: AdminUserRoleFilter;
  status: AdminUserStatusFilter;
  page: number;
};

export type AdminUsageQuery = {
  page: number;
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function parsePage(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

export function adminUsersQueryFrom(
  query: Record<string, string | string[] | undefined>,
): AdminUsersQuery {
  const role = first(query.role);
  const status = first(query.status);
  return {
    q: first(query.q),
    role: isAdminUserRoleFilter(role) ? role : "all",
    status: isAdminUserStatusFilter(status) ? status : "all",
    page: parsePage(first(query.page)),
  };
}

export function adminUsageQueryFrom(
  query: Record<string, string | string[] | undefined>,
): AdminUsageQuery {
  return { page: parsePage(first(query.page)) };
}

export function adminUsersQueryString(query: AdminUsersQuery): string {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.role !== "all") params.set("role", query.role);
  if (query.status !== "all") params.set("status", query.status);
  if (query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

export function adminUsageQueryString(query: AdminUsageQuery): string {
  const params = new URLSearchParams();
  if (query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

export function fetchAdminOverview(signal?: AbortSignal) {
  return apiRequest<AdminOverview>("/admin/overview", { signal });
}

export function fetchAdminUsers(query: AdminUsersQuery, signal?: AbortSignal) {
  const qs = adminUsersQueryString(query);
  return apiRequest<AdminUsersPage>(`/admin/users${qs ? `?${qs}` : ""}`, { signal });
}

export function fetchAdminUsage(query: AdminUsageQuery, signal?: AbortSignal) {
  const qs = adminUsageQueryString(query);
  return apiRequest<AdminUsage>(`/admin/usage${qs ? `?${qs}` : ""}`, { signal });
}

export function suspendAdminUser(id: string) {
  return apiRequest<{ user: AdminUserRow }>(`/admin/users/${id}/suspend`, { method: "POST" });
}

export function restoreAdminUser(id: string) {
  return apiRequest<{ user: AdminUserRow }>(`/admin/users/${id}/restore`, { method: "POST" });
}
