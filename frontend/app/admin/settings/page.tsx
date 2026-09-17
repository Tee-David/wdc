import { CONTACT_EMAIL } from "@/lib/site";
import { SERVICES } from "@/lib/services";
import { CASE_STUDIES } from "@/lib/work";
import { getSettings } from "@/lib/admin/store";
import { DemoNote, Panel } from "@/components/admin/bits";
import { SettingMenu } from "@/components/admin/row-actions";
import AuditLog from "@/components/admin/audit-log";
import PageTourButton from "@/components/admin/tour/page-tour-button";

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
  const overrides = getSettings();

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
          <p>Content on the public site, and how the agency runs.</p>
        </div>
        <PageTourButton />
      </div>

      <DemoNote>
        Editing is live. It writes an override row keyed by field and merges it
        over what shipped in git, so a bad edit can only ever change one value
        and putting it back deletes the row rather than restoring a copy. The
        rows live in the same in-memory store as everything else here, so an
        edit holds until the server restarts.
      </DemoNote>

      <div className="ad__stack">
        <Panel title="Editable content">
          <div className="ad__scroll" data-tour="settings-table">
            <table className="ad__t">
              <thead>
                <tr>
                  <th>What</th><th>Now</th><th>Key</th>
                  <th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const override = overrides[r.key] ?? null;
                  return (
                    <tr key={r.key}>
                      <td>
                        <b>{r.label}</b>
                        {r.note ? <small>{r.note}</small> : null}
                      </td>
                      <td>
                        {/* WHAT THE SITE IS SHOWING, AND WHAT IT SHIPPED AS.
                            A settings screen that shows only the current value
                            cannot answer the question people actually bring to
                            it, which is "did somebody change this". */}
                        {override ?? r.value}
                        {override ? (
                          <small>
                            <span className="ad__pill ad__pill--warn">Edited</span>
                            {" "}shipped as {r.value}
                          </small>
                        ) : null}
                      </td>
                      <td className="ad__dim ad__num">{r.key}</td>
                      <td className="ad__rmC">
                        <SettingMenu
                          settingKey={r.key} label={r.label}
                          shipped={r.value} override={override}
                        />
                      </td>
                    </tr>
                  );
                })}
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

        {/* WHAT CHANGED, WHO CHANGED IT, AND WHAT IT WAS BEFORE.

            It lives under Settings because that is where somebody goes when
            they are asking a question about the system rather than about a
            client, and because the settings above it are exactly the kind of
            edit that needs a record: one row changes what the public site
            says. The log is append-only by construction -- the array is
            module-private and the only export that touches it pushes -- so
            this screen has no controls at all. */}
        <AuditLog />

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
