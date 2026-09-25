import Link from "next/link";
import { adminRole } from "@/lib/admin/guard";
import { can, type Area } from "@/lib/admin/permissions";
import { AdminState } from "./admin-state";

/**
 * A section of the admin that staff do not open: it draws a no-access state
 * in place of the page. The page is not the permission -- every write it
 * would make is refused by lib/admin/guard.ts regardless -- but a member of
 * staff should never be shown the books to begin with.
 */
export default async function AreaGate({ area, children, what }: { area: Area; children: React.ReactNode; what: string }) {
  if (can(await adminRole(), area)) return <>{children}</>;
  return (
    <section className="ad__panel" style={{ marginTop: "1rem" }}>
      <AdminState kind="forbidden" title={`${what} is for the owner`}
        description="Your account can work on clients, projects, forms and the site's content. Ask the owner if you need something from here."
        action={<Link className="ad__btn" href="/admin">Back to the dashboard</Link>} />
    </section>
  );
}
