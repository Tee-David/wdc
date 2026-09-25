import { adminRole } from "@/lib/admin/guard";
import { AdminState } from "@/components/admin/admin-state";
import { getSettings } from "@/lib/admin/store";
import { SETTINGS } from "@/lib/settings/registry";
import { hydrateSettings } from "@/lib/settings/store";
import { DemoNote, Panel } from "@/components/admin/bits";
import { SettingMenu } from "@/components/admin/row-actions";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { persistSoon, syncStore } from "@/lib/admin/persist";

export const metadata = { title: "Content and defaults" };

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
  await syncStore();
  persistSoon();
  /* Staff reach the content tools that live under Settings (the FAQ, the
     media library) and nothing else here: site settings, finance defaults,
     integrations, the team and the audit log are the owner's. */
  if ((await adminRole()) !== "owner") {
    return (
      <section className="ad__panel">
        <AdminState kind="forbidden" title="Content and defaults are for the owner"
          description="The FAQ and the media library are yours to edit, from the list of sections." />
      </section>
    );
  }
  await hydrateSettings();
  const overrides = getSettings();

  const rows = SETTINGS.map((d) => ({ key: d.key, label: d.label, value: d.shipped(), note: d.note, editable: Boolean(d.parse), readOnly: d.readOnly }));

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Content and defaults</h1>
          <p>What the public site says, and the defaults for new invoices and estimates.</p>
        </div>
        <div className="ad__row"><PageTourButton /></div>
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

      </div>
    </>
  );
}
