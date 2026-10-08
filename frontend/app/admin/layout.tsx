import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AdminShell from "@/components/admin/shell";
import AdminTourProvider from "@/components/admin/tour/tour-provider";
import { unreadTotal } from "@/lib/forms/entries";
import { failedLoggedCount } from "@/lib/message-log";
import { reviewCount } from "@/lib/blog-db";
import { getAdminRequest } from "@/lib/admin/session";
import { isAdminRole } from "@/lib/admin/permissions";
import { adminNotices } from "@/lib/admin/notices";
import AdminNotices from "@/components/admin/notices";
import SupportBar from "@/components/admin/support-bar";
import "@/components/admin/admin.css";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { db } from "@/lib/db/pool";

/**
 * The admin's own shell.
 *
 * IT DELIBERATELY DOES NOT INHERIT THE SITE'S FURNITURE. The root layout
 * mounts the smooth scroll, the draw gate, the preloader, the custom cursor,
 * the AI agent, the accessibility corner and the back-to-top button, and every
 * one of them is wrong here: a preloader in front of a dashboard you open
 * forty times a day, a cursor that lags a table, reveal-on-scroll on rows
 * somebody is trying to read. Those are all mounted inside `ThemeProvider` in
 * the root layout, which this route still nests under -- so rather than
 * unmounting them one by one, `.ad` simply does not use the `.pv` token scope
 * they style against, and admin.css hides what would otherwise leak in.
 *
 * NOINDEX AND NO-STORE, set here and again in next.config.ts. A dashboard that
 * turns up in a search result is a dashboard somebody found without being sent
 * a link.
 */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · WDC Admin" },
  robots: { index: false, follow: false, nocache: true },
};

/* Never cached, never prerendered: the numbers are the point. */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await syncStore();
  persistSoon();
  const { session, support, supportUnavailable } = await getAdminRequest();
  /* A SUPPORT COOKIE THAT CANNOT BE VERIFIED (ended, expired, the owner signed
     out, the person was deactivated) gets the Exit screen, never the login
     page: a signed-in owner sent to /login is sent straight back, and that is
     a redirect loop. Exit clears the cookie and lands on their own session. */
  if (supportUnavailable) return <div className="ad"><main className="ad__main"><SupportBar /></main></div>;
  const role = (session?.user as { role?: string } | undefined)?.role;
  /* Owner and staff. What staff may do inside is lib/admin/permissions.ts,
     enforced at every action by lib/admin/guard.ts; this only keeps everyone
     else out of the building. */
  if (!session?.user || !isAdminRole(role)) {
    /* A CLIENT ON A STUDIO LINK goes to their own portal, which says why,
       rather than round the log-in page and silently elsewhere. */
    if (session?.user && role === "client") redirect("/portal?studio=1");
    const asked = (await headers()).get("x-wdc-path");
    const back = asked?.startsWith("/admin") ? asked : "/admin";
    redirect(`/login?redirect=${encodeURIComponent(back)}`);
  }
  /* A new member of staff meets the welcome page once (set when they accept
     their invitation; people who joined earlier are never sent there). */
  if (role === "staff" && !support) {
    const asked = (await headers()).get("x-wdc-path") ?? "";
    if (!asked.startsWith("/admin/welcome")) {
      const pending = await db.query(`SELECT 1 FROM client_profile_preferences WHERE user_id = $1 AND setup_state = 'pending'`, [session.user.id])
        .then((r) => Boolean(r.rowCount)).catch(() => false);
      if (pending) redirect("/admin/welcome");
    }
  }
  /* Counts that belong on the nav rather than on a screen: an admin should
     say what is waiting before you go looking for it. */
  /* Unread entries across the forms: what arrived that nobody has opened.
     A database that does not answer shows no badge rather than a wrong one. */
  /* A count that could not be read is remembered as such, so the bell can say
     "could not check" rather than "all caught up" over a database that is
     down. */
  const openRead = await unreadTotal().catch(() => null);
  const open = openRead ?? 0;
  /* Emails that did not go, for the bell: the owner's to deal with. */
  const failedRead = role === "owner" ? await failedLoggedCount().catch(() => null) : 0;
  const failedMail = failedRead ?? 0;
  /* Only a database that is set up and did not answer; a site run without one
     has nothing to check. */
  const hasDb = Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
  const unchecked = hasDb && (openRead === null || failedRead === null) ? 1 : 0;
  /* Posts staff submitted, waiting on the owner to publish or send back. */
  const inReview = role === "owner" && (process.env.DATABASE_URL || process.env.COCKROACHDB_URL) ? await reviewCount().catch(() => 0) : 0;
  /* Standing conditions: the site hidden from search, test payments on the
     live site, mail that did not go today. */
  const notices = await adminNotices(role).catch(() => []);

  return (
    <div className="ad">
      <AdminTourProvider role={role}>
        <AdminShell
          counts={{ Forms: open, FailedMail: failedMail, Blog: inReview, Unchecked: unchecked }}
          user={{ name: session.user.name, email: session.user.email, image: session.user.image }}
          role={role}
          support={support ? { name: session.user.name, expiresAt: support.expiresAt, minutes: support.minutes } : null}
        >
          <AdminNotices notices={notices} />
          {children}
        </AdminShell>
      </AdminTourProvider>
    </div>
  );
}
