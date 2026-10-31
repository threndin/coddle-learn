import { AdminOverviewView } from "@/components/admin/admin-overview";
import { loadAdminOverview } from "@/lib/admin-server";

export default async function AdminOverviewPage() {
  const overview = await loadAdminOverview();
  return <AdminOverviewView overview={overview} />;
}
