import { Users } from "lucide-react";
import { PageHead } from "@/components/admin/page-head";
import { listDepartments } from "@/lib/departments";
import { syncStore } from "@/lib/admin/persist";
import { clientsInDepartment } from "@/lib/admin/store";
import { AdminState } from "@/components/admin/admin-state";
import { Empty, Panel } from "@/components/admin/bits";
import { AddDepartment, DepartmentBody } from "@/components/admin/departments";

export const metadata = { title: "Departments" };

/**
 * Departments: Branding, SEO and the rest. A person can be in several, and a
 * client is looked after by one or more. Owner only (the Users area).
 */
export default async function Departments() {
  const departments = await listDepartments();
  if (!departments) {
    return <AdminState kind="error" title="Departments are not set up yet"
      description="Apply migration 0040 in Settings › System, then reload."
      back={{ href: "/admin/settings/system", label: "Open system health" }} />;
  }
  await syncStore().catch(() => {});
  return (
    <>
      <PageHead crumbs={[{ href: "/admin/users", label: "Users" }]} title="Departments" lede="Group the team by what they do, and assign clients to the departments that look after them." action={<AddDepartment />} />
      {departments.length ? (
        <div className="ad__stack">
          {departments.map((d) => (
            <Panel key={d.id} title={d.name} action={<span className="ad__dim">{d.members.filter((m) => m.active).length} {d.members.filter((m) => m.active).length === 1 ? "person" : "people"}</span>}>
              <DepartmentBody id={d.id} name={d.name} members={d.members}
                clients={clientsInDepartment(d.id).map((c) => ({ id: c.id, company: c.company }))} />
            </Panel>
          ))}
        </div>
      ) : (
        <Empty title="No departments yet" icon={Users} action={<AddDepartment />}>
          Add Branding, SEO or Web, put people in them, then assign each client to the departments that look after them.
        </Empty>
      )}
    </>
  );
}
