import { CONTACT_EMAIL } from "@/lib/site";
import { SERVICES } from "@/lib/services";
import { CASE_STUDIES } from "@/lib/work";
import { DemoNote, Panel } from "@/components/admin/bits";

export const metadata = { title: "Settings" };

/**
 * What can be edited, and what edits it safely.
 *
 * THE SAFE PATTERN IS AN OVERRIDE BY KEY, not a replacement. The site's copy
 * lives in TypeScript literals with derivation chains hanging off them:
 * WORK_CATEGORIES is computed from SERVICES, the sitemap from WORK_CATEGORIES
 * and CASE_STUDIES, and the embed allowlist from PROJECTS. Making those
 * dynamic carelessly means one bad edit can empty a page and nobody finds out
 * until a client does.
 *
 * So content edits are stored as rows in `settings` keyed by field, merged
 * over what shipped in git. The worst an edit can do is change one value, and
 * deleting the row restores what shipped. That is the whole design, and it is
 * why this screen shows what is editable before anything is editable.
 */
export default function SettingsPage() {
  const rows: { key: string; label: string; value: string; note?: string }[] = [
    { key: "contact.email", label: "Contact email", value: CONTACT_EMAIL },
    /* The social links are a literal inside components/layout/header.tsx
       rather than a module of their own, which is exactly the kind of thing
       this screen exists to move into a row. */
    { key: "contact.socials", label: "Social links", value: "5 linked",
      note: "Instagram, X, Facebook, email and WhatsApp." },
    { key: "services", label: "Services", value: `${SERVICES.length} services`,
      note: "Names, blurbs and deliverables. The slugs are not editable: the work URLs are built from them." },
    { key: "work", label: "Case studies", value: `${CASE_STUDIES.length} published`,
      note: "Copy and figures. Adding one still needs its images." },
    { key: "legal", label: "Legal documents", value: "4 documents",
      note: "Privacy, terms, cookies and the engagement policy." },
  ];

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Settings</h1>
          <p>Content on the public site, and how the studio runs.</p>
        </div>
      </div>

      <DemoNote>
        Editing writes an override row keyed by field and merges it over what
        shipped in git, so a bad edit can only change one value and deleting
        the row restores the original. The merge is built; the rows need the
        database.
      </DemoNote>

      <div className="ad__stack">
        <Panel title="Editable content">
          <div className="ad__scroll">
            <table className="ad__t">
              <thead><tr><th>What</th><th>Now</th><th>Key</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td>
                      <b>{r.label}</b>
                      {r.note ? <small>{r.note}</small> : null}
                    </td>
                    <td>{r.value}</td>
                    <td className="ad__dim ad__num">{r.key}</td>
                    <td className="num"><button className="ad__btn" type="button" disabled>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Booking">
          <div style={{ padding: ".9rem 1rem" }}>
            <p style={{ margin: 0 }}>
              Cal.com embeds the booking page and posts a webhook when somebody
              books. The webhook mirrors it into a consultation row keyed on{" "}
              <code>cal_booking_uid</code>, which is what stops a retried
              delivery creating a second meeting.
            </p>
          </div>
        </Panel>

        <Panel title="Access">
          <div style={{ padding: ".9rem 1rem" }}>
            <p style={{ margin: 0 }}>
              Three roles: <b>owner</b> sees everything including money,{" "}
              <b>staff</b> sees clients and projects but not the books, and{" "}
              <b>client</b> sees only their own portal. Gated in two layers: a
              cheap cookie check in middleware to keep the route from rendering
              at all, and a real session check in the layout, because a
              middleware check alone is a redirect and not a permission.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
