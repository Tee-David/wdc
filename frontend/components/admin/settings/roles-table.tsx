import { Check, Minus } from "lucide-react";
import { can, type Area } from "@/lib/admin/permissions";

const AREAS: { area: Area; label: string }[] = [
  { area: "clients", label: "Clients and support" },
  { area: "projects", label: "Projects" },
  { area: "forms", label: "Forms and entries" },
  { area: "content", label: "Blog, FAQ and media" },
  { area: "money", label: "Money" },
  { area: "settings", label: "Settings" },
  { area: "team", label: "Team" },
  { area: "exports", label: "Exports" },
  { area: "destructive", label: "Archive, merge and delete" },
];

const yes = <span className="adRoles__yes"><Check aria-hidden="true" /><span className="ad__sr">Yes</span></span>;
const no = <span className="adRoles__no"><Minus aria-hidden="true" /><span className="ad__sr">No</span></span>;

/**
 * What each role can do, drawn from the same table the guard reads
 * (lib/admin/permissions.ts), so it cannot say something the permissions do
 * not do. Checked at every action, not only on the page.
 */
export function RolesTable() {
  return (
    <details className="adSet__more adTeam__roles">
      <summary>What each role can open</summary>
      {/* The id is on the table INSIDE the disclosure, so the old /access
          redirect's #roles opens it (browsers expand a closed details for a
          fragment that lands within it). */}
      <div id="roles" className="ad__scroll">
        <table className="ad__t adRoles">
          <thead><tr><th>Area</th><th>Owner</th><th>Staff</th></tr></thead>
          <tbody>
            {AREAS.map((a) => (
              <tr key={a.area}><td>{a.label}</td><td>{yes}</td><td>{can("staff", a.area) ? yes : no}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
