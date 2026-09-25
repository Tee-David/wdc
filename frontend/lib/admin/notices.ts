import "server-only";

import { cookies } from "next/headers";
import { siteSeo } from "@/lib/site-seo";
import { paystackMode } from "@/lib/paystack";
import { failedLoggedCount } from "@/lib/message-log";
import type { AdminRole } from "./permissions";

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
  const [seo, failed] = await Promise.all([
    siteSeo().catch(() => null),
    role === "owner"
      ? failedLoggedCount({ since: new Date(Date.now() - 24 * 60 * 60 * 1000) }).catch(() => 0)
      : Promise.resolve(0),
  ]);

  if (role === "owner" && process.env.VERCEL_ENV === "production" && paystackMode() === "test") {
    found.push({ key: "paystack-test", tone: "bad", title: "Payments are in test mode", body: "Pay links on this live site cannot take real money until PAYSTACK_MODE is live.", href: "/admin/settings/integrations", link: "Integrations" });
  }
  if (seo?.noindex.on) {
    found.push({ key: `noindex:${seo.noindex.since ?? "on"}`, tone: "warn", title: "Search engines are asked not to index the site", body: "Left on, the studio drops out of search results.", href: role === "owner" ? "/admin/settings/site" : undefined, link: "Site and SEO" });
  }
  if (failed > 0) {
    found.push({ key: `failed-mail:${lagosDay()}`, tone: "warn", title: `${failed} ${failed === 1 ? "email" : "emails"} did not go in the last day`, body: "Each one is in the message log with the mail server's reason.", href: "/admin/settings/email?state=Failed", link: "Message log" });
  }

  const dismissed = new Set(((await cookies()).get(NOTICE_COOKIE)?.value ?? "").split("|").filter(Boolean));
  return found.filter((n) => !dismissed.has(n.key)).slice(0, MAX);
}
