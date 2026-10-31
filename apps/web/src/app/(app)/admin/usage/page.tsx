import { AdminUsageView } from "@/components/admin/admin-usage";
import { adminUsageQueryFrom } from "@/lib/admin";
import { loadAdminUsage } from "@/lib/admin-server";

type Query = Record<string, string | string[] | undefined>;

export default async function AdminUsagePage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = adminUsageQueryFrom(await searchParams);
  const usage = await loadAdminUsage(query);
  return <AdminUsageView initialQuery={query} initialUsage={usage} />;
}
