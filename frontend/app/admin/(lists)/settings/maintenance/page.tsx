import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { SITE_URL } from "@/lib/site";
import { linkToken, maintenance } from "@/lib/maintenance";
import { maintenanceDesign } from "@/lib/maintenance-page/render";
import { templateById } from "@/lib/maintenance-page/registry";
import { waitlistSummary, type WaitlistSummary } from "@/lib/maintenance-waitlist";
import { AdminState } from "@/components/admin/admin-state";
import { Head } from "@/components/admin/settings/kit";
import { MaintenanceSwitch } from "@/components/admin/settings/site-controls";
import { MaintenanceDesign } from "@/components/admin/settings/maintenance-design";

export const metadata = { title: "Maintenance" };

/**
 * MAINTENANCE, its own section: whether the public site is down, the page
 * visitors get while it is (one of the templates in lib/maintenance-page),
 * and who has asked to be told when it is back. The owner's.
 */
export default async function MaintenancePage() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="Maintenance is the owner's" description="Whether the public site is down, and the page visitors see while it is." /></section>;
  }
  const [m, design, waiting] = await Promise.all([maintenance({ fresh: true }), maintenanceDesign({ fresh: true }), waitlistSummary()]);
  const token = m.on ? linkToken(m) : null;
  const chosen = templateById(design.template)!;
  return (
    <>
      <Head title="Maintenance" line="Take the public site down for work, and choose what visitors see meanwhile.">
        <a className="ad__btn" href={`/api/maintenance/preview?template=${chosen.id}`} target="_blank" rel="noopener">Preview the page</a>
        {m.on ? <a className="ad__btn" href="/api/maintenance/pass">View the site</a> : null}
      </Head>
      <div className="ad__stack">
        <MaintenanceSwitch maintenance={m.on} host={new URL(SITE_URL).host}
          reviewer={token ? `${SITE_URL}/api/maintenance/pass?t=${token}` : null} />
        <MaintenanceDesign design={design} waiting={<Waiting on={m.on} s={waiting} />} />
      </div>
    </>
  );
}

/** Who is waiting to be told the site is back, and why they came, when anybody said. */
function Waiting({ on, s }: { on: boolean; s: WaitlistSummary | null }) {
  if (!s || (!on && !s.total)) return null;
  if (!s.total) return <p className="adMt__wait ad__dim">Nobody has asked to be told when the site is back yet.</p>;
  const parts = ([["project", "a new project"], ["client", "clients"], ["browsing", "just looking"]] as const)
    .filter(([k]) => s[k]).map(([k, label]) => <span key={k} className="adMt__chip">{s[k]} {label}</span>);
  return (
    <p className="adMt__wait">
      <span><b>{s.total}</b> {s.total === 1 ? "person is" : "people are"} {on ? "waiting to hear the site is back" : "still to be emailed; the daily job sends the rest"}.</span>
      {parts}
    </p>
  );
}
