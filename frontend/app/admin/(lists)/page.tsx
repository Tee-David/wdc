import { AdminDashboardView } from "@/components/admin/dashboard-view";
import { AdminPageSkeleton } from "@/components/admin/page-skeleton";
import { getAdminRequest } from "@/lib/admin/session";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { persistSoon, syncStore } from "@/lib/admin/persist";

export const metadata = { title: "Dashboard" };

export default async function AdminHome() {
  await syncStore();
  persistSoon();
  const { capture, session } = await getAdminRequest();
  const firstName = session?.user.name?.trim().split(/\s+/)[0];
  const money = can(await adminRole(), "money");

  return (
    <AdminPageSkeleton capture={capture}>
      <AdminDashboardView firstName={firstName} money={money} />
    </AdminPageSkeleton>
  );
}
