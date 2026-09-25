import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/shell";
import AdminTourProvider from "@/components/admin/tour/tour-provider";
import { unreadTotal } from "@/lib/forms/entries";
import { failedLoggedCount } from "@/lib/message-log";
import { reviewCount } from "@/lib/blog-db";
import { getAdminRequest } from "@/lib/admin/session";
import { isAdminRole } from "@/lib/admin/permissions";
import { adminNotices } from "@/lib/admin/notices";
import AdminNotices from "@/components/admin/notices";
import "@/components/admin/admin.css";

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
  const { session } = await getAdminRequest();
  const role = (session?.user as { role?: string } | undefined)?.role;
  /* Owner and staff. What staff may do inside is lib/admin/permissions.ts,
     enforced at every action by lib/admin/guard.ts; this only keeps everyone
     else out of the building. */
  if (!session?.user || !isAdminRole(role)) {
    redirect("/login?redirect=/admin");
  }
  /* Counts that belong on the nav rather than on a screen: an admin should
     say what is waiting before you go looking for it. */
  /* Unread entries across the forms: what arrived that nobody has opened.
     A database that does not answer shows no badge rather than a wrong one. */
  const open = await unreadTotal().catch(() => 0);
  /* Emails that did not go, for the bell: the owner's to deal with. */
  const failedMail = role === "owner" ? await failedLoggedCount().catch(() => 0) : 0;
  /* Posts staff submitted, waiting on the owner to publish or send back. */
  const inReview = role === "owner" && (process.env.DATABASE_URL || process.env.COCKROACHDB_URL) ? await reviewCount().catch(() => 0) : 0;
  /* Standing conditions: the site hidden from search, test payments on the
     live site, mail that did not go today. */
  const notices = await adminNotices(role).catch(() => []);

  return (
    <div className="ad">
      <AdminTourProvider role={role}>
        <AdminShell
          counts={{ Forms: open, FailedMail: failedMail, Blog: inReview }}
          user={{ name: session.user.name, email: session.user.email, image: session.user.image }}
          role={role}
        >
          <AdminNotices notices={notices} />
          {children}
        </AdminShell>
      </AdminTourProvider>
    </div>
  );
}
