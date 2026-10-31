import { AdminUsersView } from "@/components/admin/admin-users";
import { adminUsersQueryFrom } from "@/lib/admin";
import { loadAdminUsers } from "@/lib/admin-server";

type Query = Record<string, string | string[] | undefined>;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = adminUsersQueryFrom(await searchParams);
  const page = await loadAdminUsers(query);
  return <AdminUsersView initialQuery={query} initialPage={page} />;
}
