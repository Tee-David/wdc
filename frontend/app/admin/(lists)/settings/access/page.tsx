import Link from "next/link";
import { adminRole } from "@/lib/admin/guard";
import { can, type Area } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import { Panel } from "@/components/admin/bits";

export const metadata = { title: "Access" };

const AREAS: { area: Area; label: string; what: string }[] = [
  { area: "clients", label: "Clients", what: "Records, contacts, messages, tickets and portal invitations" },
  { area: "projects", label: "Projects", what: "Stages, tasks, updates, deliverables and approvals" },
  { area: "forms", label: "Forms", what: "Entries, notes, and turning a brief into a client" },
  { area: "content", label: "Content", what: "The blog (staff write and submit for review; the owner publishes), the FAQ and the media library" },
  { area: "money", label: "Money", what: "Invoices, payments, expenses, estimates and credit" },
  { area: "settings", label: "Settings", what: "Site settings, form settings, email and integrations" },
  { area: "team", label: "Team", what: "Who has access, staff invitations and sessions" },
  { area: "exports", label: "Exports", what: "CSV and XLSX downloads of whole tables" },
  { area: "destructive", label: "Destructive actions", what: "Archiving or merging a client, deleting for good" },
];

/**
 * The roles, drawn from the same table the guard reads (lib/admin/permissions.ts),
 * so this page cannot say something the permissions do not do.
 */
export default async function AccessPage() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" title="Access is for the owner" description="Who can do what in the admin." /></section>;
  }
  return (
    <>
      <div className="ad__head"><div><h1>Access</h1><p>Three roles. The owner can do everything; staff run the day&apos;s work; a client sees only their own portal.</p></div></div>
      <Panel title="What each role can do">
        <div className="ad__scroll">
          <table className="ad__t">
            <thead><tr><th>Area</th><th>Owner</th><th>Staff</th><th>What it covers</th></tr></thead>
            <tbody>
              {AREAS.map((a) => (
                <tr key={a.area}>
                  <td><b>{a.label}</b></td>
                  <td><span className="ad__pill ad__pill--good">Yes</span></td>
                  <td>{can("staff", a.area) ? <span className="ad__pill ad__pill--good">Yes</span> : <span className="ad__pill ad__pill--flat">No</span>}</td>
                  <td>{a.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ad__dim" style={{ margin: 0, padding: ".8rem 1rem", fontSize: ".85rem" }}>
          Checked at every action, not only on the page: a button a role cannot use is refused by the server even if it is pressed.
          Inviting staff, changing a role and deactivating an account are on <Link href="/admin/settings/team">Team</Link>.
        </p>
      </Panel>
    </>
  );
}
