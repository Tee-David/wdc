import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { DESCRIPTION_MAX, DESCRIPTION_MIN, siteSeo } from "@/lib/site-seo";
import { AdminState } from "@/components/admin/admin-state";
import { Head } from "@/components/admin/settings/kit";
import { DescriptionForm, Visibility } from "@/components/admin/settings/site-controls";
import { maintenance } from "@/lib/maintenance";

export const metadata = { title: "Website and SEO" };

/** How the site presents itself to search engines. Maintenance has its own section. */
export default async function SitePage() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" title="Site and SEO are the owner's" description="The site's description and whether search engines may index it." /></section>;
  }
  const [seo, m] = await Promise.all([siteSeo(), maintenance()]);
  const host = new URL(SITE_URL).host;
  return (
    <>
      <Head title="Website and SEO" line="How the site shows up in search.">
        {m.on ? <a className="ad__btn" href="/api/maintenance/pass">View the site</a> : <a className="ad__btn" href="/" target="_blank" rel="noopener">View the site</a>}
      </Head>
      <div className="ad__stack">
        <Visibility indexed={!seo.noindex.on} host={host} />
        <DescriptionForm host={host} title={`${SITE_NAME} | Web, Branding, SEO & Software Agency`}
          value={seo.description} custom={seo.customDescription} min={DESCRIPTION_MIN} max={DESCRIPTION_MAX} />
      </div>
    </>
  );
}
