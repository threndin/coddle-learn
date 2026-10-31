import type { AdminOverview, AdminUsage, AdminUsersPage } from "@coddle/shared";
import {
  adminUsageQueryString,
  adminUsersQueryString,
  type AdminUsageQuery,
  type AdminUsersQuery,
} from "@/lib/admin";
import { serverApiFetch } from "@/lib/server-api";

type LoadResult<T> = T | "forbidden" | null;

async function loadAdmin<T>(path: string): Promise<LoadResult<T>> {
  try {
    const res = await serverApiFetch(path);
    if (res.status === 403) return "forbidden";
    if (!res.ok) return null;
    const body = (await res.json()) as { data: T };
    return body.data;
  } catch {
    return null;
  }
}

export function loadAdminOverview() {
  return loadAdmin<AdminOverview>("/admin/overview");
}

export function loadAdminUsers(query: AdminUsersQuery) {
  const qs = adminUsersQueryString(query);
  return loadAdmin<AdminUsersPage>(`/admin/users${qs ? `?${qs}` : ""}`);
}

export function loadAdminUsage(query: AdminUsageQuery) {
  const qs = adminUsageQueryString(query);
  return loadAdmin<AdminUsage>(`/admin/usage${qs ? `?${qs}` : ""}`);
}
