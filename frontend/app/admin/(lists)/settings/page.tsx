import { adminRole } from "@/lib/admin/guard";
import { can, isAdminRole } from "@/lib/admin/permissions";
import { financeSettings, getSetting } from "@/lib/admin/store";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { mailIsConfigured } from "@/lib/email";
import { siteSeo } from "@/lib/site-seo";
import { maintenance } from "@/lib/maintenance";
import { config as meetingConfig } from "@/lib/meetings/store";
import { meetingsStatusLabel } from "@/lib/meetings/errors";
import { SETTINGS_SECTIONS } from "@/lib/settings/sections";
import { SettingsOverview } from "@/components/admin/settings/settings-overview";
import PageTourButton from "@/components/admin/tour/page-tour-button";

export const metadata = { title: "Settings" };

/**
 * The Meetings card's one word, from the stored row only: no call to Cal.com
 * on the index. A missing migration, a missing database or a slow answer all
 * read as "Not set up"; the Meetings page itself says which it is.
 */
async function meetingsStatus() {
  const hasKey = !!process.env.CAL_API_KEY?.trim();
  if (!hasKey) return meetingsStatusLabel({ hasKey, config: null });
  const stored = await Promise.race([
    meetingConfig().catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
  ]);
  return meetingsStatusLabel({ hasKey, config: stored });
}

/**
 * THE SETTINGS OVERVIEW (the Settings canvas): every section this role may
 * open, in its group, each with what it is set to now where one word says it
 * ("7.5% VAT", "Indexed"). On a phone this is the whole of Settings; on a
 * wide screen it sits beside the section menu. Staff see only what they can use.
 */
export default async function SettingsPage() {
  await syncStore();
  persistSoon();
  const role = await adminRole();
  const owner = can(role, "settings");
  const sections = SETTINGS_SECTIONS.filter((s) => (s.area ? can(role, s.area) : isAdminRole(role)));
  const values: Record<string, string> = {};
  if (owner) {
    const f = financeSettings();
    const [seo, m] = await Promise.all([siteSeo(), maintenance()]);
    values["/admin/settings/general"] = f.vatOn ? `${f.vatRate}% VAT` : "No VAT";
    values["/admin/settings/site"] = seo.noindex.on ? "Hidden" : "Indexed";
    values["/admin/settings/maintenance"] = m.on ? "On" : "Off";
    values["/admin/settings/email"] = mailIsConfigured() ? "Set up" : "Missing";
    values["/admin/settings/meetings"] = await meetingsStatus();
    values["/admin/settings/notifications"] = [getSetting("notify.tickets"), getSetting("notify.payments"), getSetting("notify.estimates")].includes("0") ? "Some off" : "On";
  }
  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Settings</h1>
          <p>{owner ? "How the studio, the site and the admin run." : "The FAQ and the media library are yours to edit."}</p>
        </div>
        <div className="ad__row"><PageTourButton /></div>
      </div>
      <SettingsOverview sections={sections} values={values} />
    </>
  );
}
