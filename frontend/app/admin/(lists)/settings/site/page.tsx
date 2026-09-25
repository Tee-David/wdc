import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { SITE_URL } from "@/lib/site";
import { DESCRIPTION_MAX, DESCRIPTION_MIN, siteSeo } from "@/lib/site-seo";
import { AdminState } from "@/components/admin/admin-state";
import { Panel, when } from "@/components/admin/bits";
import { DescriptionForm, NoindexForm } from "@/components/admin/settings/site-controls";

export const metadata = { title: "Site and SEO" };

/** How the site presents itself to search engines. */
export default async function SitePage() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" title="Site and SEO are the owner's" description="The site's description and whether search engines may index it." /></section>;
  }
  const seo = await siteSeo();
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
        <Panel title="Description">
          <div style={{ padding: "0 1rem 1rem" }}>
            <DescriptionForm value={seo.description} custom={seo.customDescription} min={DESCRIPTION_MIN} max={DESCRIPTION_MAX} />
          </div>
        </Panel>
      </div>
    </>
  );
}
