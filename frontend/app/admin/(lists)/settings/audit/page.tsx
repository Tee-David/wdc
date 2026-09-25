import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import AuditLog from "@/components/admin/audit-log";

export const metadata = { title: "Audit log" };

/**
 * What changed, who changed it, and what it was before. Append-only by
 * construction: the log has no controls because nothing may edit it.
 */
export default async function AuditPage() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" title="The audit log is for the owner" description="Every change made in the admin, with who made it." /></section>;
  }
  return (
    <>
      <div className="ad__head"><div><h1>Audit log</h1><p>Every change made in the admin, newest first, with who made it and what it was before.</p></div></div>
      <AuditLog />
    </>
  );
}
