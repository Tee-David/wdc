import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { DESCRIPTION_MAX, DESCRIPTION_MIN, siteSeo } from "@/lib/site-seo";
import { AdminState } from "@/components/admin/admin-state";
import { Head } from "@/components/admin/settings/kit";
import { DescriptionForm, Visibility } from "@/components/admin/settings/site-controls";
import { linkToken, maintenance } from "@/lib/maintenance";
import { MaintenanceDesign } from "@/components/admin/settings/maintenance-design";
import { maintenanceDesign } from "@/lib/maintenance-page/render";
import { waitlistSummary, type WaitlistSummary } from "@/lib/maintenance-waitlist";

export const metadata = { title: "Website and SEO" };

/** How the site presents itself to search engines, and whether it is open. */
export default async function SitePage() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" title="Site and SEO are the owner's" description="The site's description and whether search engines may index it." /></section>;
  }
  const [seo, m, design, waiting] = await Promise.all([siteSeo(), maintenance({ fresh: true }), maintenanceDesign({ fresh: true }), waitlistSummary()]);
  const token = m.on ? linkToken(m) : null;
  const host = new URL(SITE_URL).host;
  return (
    <>
      <Head title="Website and SEO" line="How the site shows up, and whether it's open.">
        {m.on ? <a className="ad__btn" href="/api/maintenance/pass">View the site</a> : <a className="ad__btn" href="/" target="_blank" rel="noopener">View the site</a>}
      </Head>
      <div className="ad__stack">
        <Visibility indexed={!seo.noindex.on} maintenance={m.on} host={host}
          reviewer={token ? `${SITE_URL}/api/maintenance/pass?t=${token}` : null} />
        <MaintenanceDesign design={design} waiting={<Waiting on={m.on} s={waiting} />} />
        <DescriptionForm host={host} title={`${SITE_NAME} | Web, Branding, SEO & Software Agency`}
          value={seo.description} custom={seo.customDescription} min={DESCRIPTION_MIN} max={DESCRIPTION_MAX} />
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
