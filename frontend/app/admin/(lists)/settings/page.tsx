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
import { Head } from "@/components/admin/settings/kit";
import { SettingsNeeds, type SettingsNeed } from "@/components/admin/settings/settings-needs";
import { migrationStatus } from "@/lib/system/migrations";
import { lastProbes } from "@/lib/system/probes";
import { failedLoggedCount } from "@/lib/message-log";

export const metadata = { title: "Settings" };

const dayAgo = () => new Date(Date.now() - 86_400_000);
/** "Payments", "Payments and file storage", "Database, payments and file storage". */
const listed = (names: string[]) => {
  const all = names.map((x, i) => (i ? x.toLowerCase() : x));
  return all.length < 2 ? all.join("") : `${all.slice(0, -1).join(", ")} and ${all[all.length - 1]}`;
};

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
  const needs: SettingsNeed[] = [];
  if (owner) {
    const f = financeSettings();
    const [seo, m] = await Promise.all([siteSeo(), maintenance()]);
    values["/admin/settings/general"] = f.vatOn ? `${f.vatRate}% VAT` : "No VAT";
    values["/admin/settings/site"] = seo.noindex.on ? "Hidden" : "Indexed";
    values["/admin/settings/maintenance"] = m.on ? "On" : "Off";
    values["/admin/settings/email"] = mailIsConfigured() ? "Set up" : "Missing";
    values["/admin/settings/meetings"] = await meetingsStatus();
    values["/admin/settings/notifications"] = [getSetting("notify.tickets"), getSetting("notify.payments"), getSetting("notify.estimates")].includes("0") ? "Some off" : "On";
    /* What needs the owner, from stored state only: no outside service is called from this page. */
    const [migrations, probes, failed] = await Promise.all([
      migrationStatus().catch(() => null), lastProbes().catch(() => ({})), failedLoggedCount({ since: dayAgo() }).catch(() => 0),
    ]);
    const n = migrations?.ok ? migrations.pending.length : 0;
    if (n) needs.push({ href: "/admin/settings/system", icon: "database", tone: "live", title: `${n} database ${n === 1 ? "update is" : "updates are"} waiting`, line: "Apply it from System when nobody is mid payment. It takes under a minute." });
    if (!mailIsConfigured()) needs.push({ href: "/admin/settings/email", icon: "mail", tone: "bad", title: "Email is not set up", line: "Invoices, receipts and sign-in codes cannot be sent until it is." });
    else if (failed) needs.push({ href: "/admin/settings/email/log?state=Failed", icon: "mail", tone: "bad", title: `${failed} ${failed === 1 ? "email" : "emails"} did not go in the last day`, line: "Each is tried again on its own. The message log has the server's reason." });
    const down = Object.entries(probes).filter(([, r]) => r && !r.ok).map(([k]) => ({ database: "Database", email: "Mail server", payments: "Payments", storage: "File storage" })[k] ?? k);
    if (down.length) needs.push({ href: "/admin/settings/system", icon: "service", tone: "bad", title: `${listed(down)} did not answer at the last check`, line: "System health shows what it said and can check again." });
    if (m.on) needs.push({ href: "/admin/settings/maintenance", icon: "maintenance", tone: "warn", title: "The public site is in maintenance", line: "Visitors see the maintenance page until you switch it off." });
    if (seo.noindex.on) needs.push({ href: "/admin/settings/site", icon: "hidden", tone: "warn", title: "The site is hidden from search", line: "Search engines are asked not to list it." });
  }
  return (
    <>
      <Head title="Settings" line={owner ? "How the studio, the site and the admin run." : "The help centre and the media library are yours to edit."} />
      <SettingsNeeds items={needs} />
      <SettingsOverview sections={sections} values={values} />
    </>
  );
}
