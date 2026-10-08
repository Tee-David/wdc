import "server-only";

import { cookies } from "next/headers";
import { siteSeo } from "@/lib/site-seo";
import { selectedPaystackMode } from "@/lib/paystack-mode";
import { failedLoggedCount } from "@/lib/message-log";
import type { AdminRole } from "./permissions";
import { migrationStatus } from "@/lib/system/migrations";
import { maintenance } from "@/lib/maintenance";
import { lastSaveFailure } from "./persist";

/**
 * Standing conditions the admin should not have to go looking for: the site
 * hidden from search, payments in test mode on the live site, emails that
 * did not go today.
 *
 * AT MOST TWO AT ONCE, worst first: a shell with five banners is a shell
 * people learn to scroll past. Each can be dismissed, by cookie, and the
 * key carries what makes it new (when noindex was switched on, today's
 * date), so a dismissed notice comes back when the condition does.
 */

export type AdminNotice = {
  key: string;
  tone: "bad" | "warn";
  title: string;
  body: string;
  href?: string;
  link?: string;
};

export const NOTICE_COOKIE = "wdc.notices";
const MAX = 2;

/** "YYYY-MM-DD" in Lagos. */
const lagosDay = () => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);

export async function adminNotices(role: AdminRole): Promise<AdminNotice[]> {
  const found: AdminNotice[] = [];
  const [seo, failed, migrations, m] = await Promise.all([
    siteSeo().catch(() => null),
    role === "owner"
      ? failedLoggedCount({ since: new Date(Date.now() - 24 * 60 * 60 * 1000) }).catch(() => 0)
      : Promise.resolve(0),
    role === "owner" && (process.env.DATABASE_URL || process.env.COCKROACHDB_URL) ? migrationStatus() : Promise.resolve(null),
    maintenance().catch(() => ({ on: false })),
  ]);

  if (role === "owner") {
    try {
      const { listConnections } = await import("@/lib/mail-connections");
      const bad = ((await listConnections()) ?? []).filter((c) => c.health?.status === "error");
      if (bad.length) found.push({ key: `mail-conn:${bad.map((c) => c.id + (c.health?.at ?? "")).join(",")}`.slice(0, 200), tone: "warn", title: `${bad[0].name} failed its mail check`, body: bad[0].health?.message ?? "", href: "/admin/settings/email/connections", link: "Connections" });
    } catch { /* not set up yet */ }
  }

  const lost = lastSaveFailure();
  if (lost) {
    found.push({ key: `save-failed:${lost.at}`, tone: "bad", title: "A recent change may not have been saved", body: "The database did not answer when it was saved. Check what you changed, make it again if it is missing, and tell the owner if this repeats.", href: role === "owner" ? "/admin/settings/system" : undefined, link: "System" });
  }

  if (m.on) {
    found.push({ key: `maintenance:${"since" in m ? m.since : "on"}`, tone: "bad", title: "The public site is in maintenance", body: "Visitors see a holding page. The admin, payments and invoices still work.", href: role === "owner" ? "/admin/settings/maintenance" : undefined, link: "Maintenance" });
  }

  if (migrations?.ok && migrations.pending.length) {
    found.push({ key: `migrations:${migrations.pending.at(-1)}`, tone: "bad", title: `${migrations.pending.length} database ${migrations.pending.length === 1 ? "change has" : "changes have"} not been applied`, body: "Screens that rely on them will fail until npm run db:migrate is run.", href: "/admin/settings/system", link: "System" });
  }

  const mode = await selectedPaystackMode().catch(() => null);
  if (!mode && role === "owner") found.push({key:"paystack-unavailable",tone:"bad",title:"Payment mode could not be loaded",body:"Check the database before accepting payments.",href:"/admin/settings/integrations",link:"Integrations"});
  if (role === "owner" && process.env.VERCEL_ENV === "production" && mode === "test") {
    found.push({ key: "paystack-test", tone: "bad", title: "Payments are in test mode", body: "Test checkout does not take real money or settle invoices. Change payment mode in Integrations when ready.", href: "/admin/settings/integrations", link: "Integrations" });
  }
  if (seo?.noindex.on) {
    found.push({ key: `noindex:${seo.noindex.since ?? "on"}`, tone: "warn", title: "Search engines are asked not to index the site", body: "Left on, the studio drops out of search results.", href: role === "owner" ? "/admin/settings/site" : undefined, link: "Site and SEO" });
  }
  if (failed > 0) {
    found.push({ key: `failed-mail:${lagosDay()}`, tone: "warn", title: `${failed} ${failed === 1 ? "email" : "emails"} did not go in the last day`, body: "Each one is in the message log with the mail server's reason.", href: "/admin/settings/email/log?state=Failed", link: "Message log" });
  }

  const dismissed = new Set(((await cookies()).get(NOTICE_COOKIE)?.value ?? "").split("|").filter(Boolean));
  return found.filter((n) => !dismissed.has(n.key)).slice(0, MAX);
}
