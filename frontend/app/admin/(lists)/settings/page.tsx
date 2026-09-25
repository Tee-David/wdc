import Link from "next/link";
import { Images, Mail, MessagesSquare } from "lucide-react";
import { adminRole } from "@/lib/admin/guard";
import { AdminState } from "@/components/admin/admin-state";
import { getSettings } from "@/lib/admin/store";
import { SETTINGS } from "@/lib/settings/registry";
import { hydrateSettings } from "@/lib/settings/store";
import { DemoNote, Panel } from "@/components/admin/bits";
import { SettingMenu } from "@/components/admin/row-actions";
import AuditLog from "@/components/admin/audit-log";
import { IntegrationsPanel } from "@/components/admin/integrations-panel";
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
export default async function SettingsPage() {
  /* Staff reach the content tools that live under Settings (the FAQ, the
     media library) and nothing else here: site settings, finance defaults,
     integrations, the team and the audit log are the owner's. */
  if ((await adminRole()) !== "owner") {
    return (
      <>
        <div className="ad__head">
          <div>
            <h1>Settings</h1>
            <p>The site&rsquo;s content you can edit. Everything else here is the owner&rsquo;s.</p>
          </div>
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <Link className="ad__btn" href="/admin/settings/faq"><MessagesSquare aria-hidden="true" /> FAQ</Link>
            <Link className="ad__btn" href="/admin/settings/media"><Images aria-hidden="true" /> Media</Link>
          </div>
        </div>
        <section className="ad__panel">
          <AdminState kind="forbidden" title="Site settings are for the owner"
            description="The FAQ and the media library above are yours to edit. Contact details, services, finance defaults, integrations and the team are changed by the owner." />
        </section>
      </>
    );
  }
  await hydrateSettings();
  const overrides = getSettings();

  const rows = SETTINGS.map((d) => ({ key: d.key, label: d.label, value: d.shipped(), note: d.note, editable: Boolean(d.parse), readOnly: d.readOnly }));

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Settings</h1>
          <p>Content on the public site, and how the agency runs.</p>
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <Link className="ad__btn" href="/admin/settings/faq"><MessagesSquare aria-hidden="true" /> FAQ</Link>
          <Link className="ad__btn" href="/admin/settings/media"><Images aria-hidden="true" /> Media</Link>
          <Link className="ad__btn" href="/admin/settings/email"><Mail aria-hidden="true" /> Email</Link>
          <PageTourButton />
        </div>
      </div>

      <DemoNote>
        Only the finance defaults are editable, because they are the only rows
        the site reads. An edit is saved to the database as one row keyed by
        field and merged over what shipped in git; putting it back deletes the
        row. The other rows say why they cannot be changed here yet.
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
                        {!r.editable ? (
                          <small><span className="ad__pill ad__pill--flat">Not editable yet</span> {r.readOnly}</small>
                        ) : null}
                        {override ? (
                          <small>
                            <span className="ad__pill ad__pill--warn">Edited</span>
                            {" "}shipped as {r.value}
                          </small>
                        ) : null}
                      </td>
                      <td className="ad__dim ad__num">{r.key}</td>
                      <td className="ad__rmC">
                        {r.editable ? (
                          <SettingMenu
                            settingKey={r.key} label={r.label}
                            shipped={r.value} override={override}
                          />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* WHAT EACH OUTSIDE SERVICE IS, NOT WHAT IT WILL BE. This slot used to
            describe a Cal.com booking webhook as though it existed; there is
            no such code. */}
        <IntegrationsPanel />

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
              Three roles exist on the user table -- <b>owner</b>,{" "}
              <b>staff</b> and <b>client</b> -- and a <b>client</b> sees only
              their own portal. Gated in two layers: a cheap cookie check in
              the proxy to keep an unauthenticated request from reaching the
              route at all, and a real session check in the layout, because a
              cookie check alone is a redirect and not a permission.
            </p>
            <p style={{ margin: ".6rem 0 0" }}>
              <b>Not yet true, said plainly rather than implied:</b> the
              layout&rsquo;s own permission check only lets <b>owner</b> through
              today -- a least-privilege <b>staff</b> role that can reach
              clients and projects but not the books does not exist yet, and
              neither does a way to create a staff account, invite one, or
              revoke a session from this screen. Building it properly means
              gating every money-related write in{" "}
              <code>lib/admin/actions.ts</code> by role, not only the pages,
              since a server action is reachable on its own.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
