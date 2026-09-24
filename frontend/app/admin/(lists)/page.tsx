import { AdminDashboardView } from "@/components/admin/dashboard-view";
import { AdminPageSkeleton } from "@/components/admin/page-skeleton";
import { getAdminRequest } from "@/lib/admin/session";

export const metadata = { title: "Dashboard" };

export default async function AdminHome() {
  const { capture, session } = await getAdminRequest();
  const firstName = session?.user.name?.trim().split(/\s+/)[0];

  return (
    <AdminPageSkeleton capture={capture}>
      <AdminDashboardView firstName={firstName} />
    </AdminPageSkeleton>
  );
}
