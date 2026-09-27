import Link from "next/link";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { getSetting } from "@/lib/admin/store";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { SETTINGS } from "@/lib/settings/registry";
import { SERVICES } from "@/lib/services";
import { Panel } from "@/components/admin/bits";
import { AdminState } from "@/components/admin/admin-state";
import { Head } from "@/components/admin/settings/kit";
import { ContentForm } from "@/components/admin/settings/content-form";

export const metadata = { title: "Blog and site copy" };

/* The copy that still lives in code, each with why it is not a text box here. */
const IN_CODE = ["services", "work", "legal", "testimonials", "blog.perPage"];

/**
 * THE CONTENT SECTION: what a writer can set, and what they cannot yet.
 *
 * Two blog defaults, each with a reader (the editor's new post, the RSS
 * route). Everything else on the public site that looks like content is
 * listed read-only with its reason, rather than taking an edit nothing reads.
 * The FAQ and the media library are their own sections beside this one.
 */
export default async function ContentSettingsPage() {
  await syncStore();
  persistSoon();
  if (!can(await adminRole(), "content")) {
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="Content settings are for the studio" description="The blog's defaults and the site's copy." /></section>;
  }
  const topic = getSetting("blog.defaultTopic") ?? "";
  const rss = Number(getSetting("blog.rssCount") ?? 50);
  const rows = IN_CODE.map((k) => SETTINGS.find((s) => s.key === k)!).filter(Boolean);
  return (
    <>
      <Head title="Blog and site copy" line="The blog's defaults, and the copy that is still set in code." />
      <div className="ad__stack">
        <ContentForm
          topic={SERVICES.some((s) => s.slug === topic) ? topic : ""}
          rssCount={Number.isInteger(rss) ? rss : 50}
          services={SERVICES.map((s) => ({ value: s.slug, label: s.name }))}
        />
        <Panel title="Set in code" action={<span className="ad__dim adSet__aside">Read only</span>}>
          <div className="adSetPad" style={{ paddingBottom: 0 }}>
            <p className="ad__dim" style={{ margin: 0 }}>
              These change with a release, not here. The <Link href="/admin/settings/faq">FAQ</Link> and
              the <Link href="/admin/settings/media">media library</Link> are editable in their own sections.
            </p>
          </div>
          <div className="ad__scroll">
            <table className="ad__t">
              <thead><tr><th>What</th><th>Now</th><th>Why it is not editable here</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td><b>{r.label}</b><small className="ad__dim">{r.note}</small></td>
                    <td className="ad__dim">{r.shipped()}</td>
                    <td style={{ minWidth: "18rem" }}>{r.readOnly}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
