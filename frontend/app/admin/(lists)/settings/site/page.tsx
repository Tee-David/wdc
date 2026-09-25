import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { SITE_URL } from "@/lib/site";
import { DESCRIPTION_MAX, DESCRIPTION_MIN, siteSeo } from "@/lib/site-seo";
import { AdminState } from "@/components/admin/admin-state";
import { Panel, when } from "@/components/admin/bits";
import { DescriptionForm, MaintenanceForm, NoindexForm, ReviewerLink } from "@/components/admin/settings/site-controls";
import { linkToken, maintenance } from "@/lib/maintenance";

export const metadata = { title: "Site and SEO" };

/** How the site presents itself to search engines. */
export default async function SitePage() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" title="Site and SEO are the owner's" description="The site's description and whether search engines may index it." /></section>;
  }
  const [seo, m] = await Promise.all([siteSeo(), maintenance({ fresh: true })]);
  const token = m.on ? linkToken(m) : null;
  const host = new URL(SITE_URL).host;
  return (
    <>
      <div className="ad__head"><div><h1>Site and SEO</h1><p>How the site appears in search results, and whether it appears at all.</p></div></div>
      <div className="ad__stack">
        <Panel title="Search engines"
          action={<span className={`ad__pill ${seo.noindex.on ? "ad__pill--bad" : "ad__pill--good"}`}>{seo.noindex.on ? "Asked not to index" : "Indexing allowed"}</span>}>
          <div style={{ padding: "0 1rem 1rem" }}>
            <p className="ad__dim" style={{ marginBottom: ".6rem" }}>
              {seo.noindex.on
                ? `Every public page tells search engines not to list it${seo.noindex.since ? `, since ${when(seo.noindex.since)}` : ""}${seo.noindex.by ? ` (${seo.noindex.by})` : ""}. Pages that are already listed drop out as they are re-crawled.`
                : "Every public page may be listed. Invoices, receipts, the onboarding form and the admin are never listed, whatever this says."}
            </p>
            <NoindexForm on={seo.noindex.on} host={host} />
          </div>
        </Panel>
        <Panel title="Maintenance mode"
          action={<span className={`ad__pill ${m.on ? "ad__pill--bad" : "ad__pill--good"}`}>{m.on ? "On" : "Off"}</span>}>
          <div style={{ padding: "0 1rem 1rem" }}>
            <p className="ad__dim" style={{ marginBottom: ".6rem" }}>
              {m.on
                ? `Visitors get a holding page (503)${m.since ? ` since ${when(m.since)}` : ""}${m.by ? ` (${m.by})` : ""}. The admin, the portal, signing in, payments, invoices and receipts keep working.`
                : "Puts a holding page in front of the public site. The admin, the portal, signing in, payments, invoices and receipts are never blocked. It reaches every server within half a minute."}
            </p>
            {m.on ? (
              <div className="ad__stack" style={{ gap: ".6rem", marginBottom: ".8rem" }}>
                <p><a className="ad__btn" href="/api/maintenance/pass">View the site as it is now</a></p>
                {token ? <div><p className="ad__dim" style={{ margin: "0 0 .3rem" }}>Share this link with a reviewer. It lets them see the site until maintenance ends.</p><ReviewerLink url={`${SITE_URL}/api/maintenance/pass?t=${token}`} /></div> : null}
              </div>
            ) : null}
            <MaintenanceForm on={m.on} host={host} />
          </div>
        </Panel>

        <Panel title="Description">
          <div style={{ padding: "0 1rem 1rem" }}>
            <DescriptionForm value={seo.description} custom={seo.customDescription} min={DESCRIPTION_MIN} max={DESCRIPTION_MAX} />
          </div>
        </Panel>
      </div>
    </>
  );
}
