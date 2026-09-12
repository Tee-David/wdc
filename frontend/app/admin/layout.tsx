import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AdminNav from "@/components/admin/shell";
import { getSubmissions } from "@/lib/admin/store";
import { auth } from "@/lib/auth";
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as typeof session.user & { role?: string }).role !== "owner") {
    redirect("/login?redirect=/admin");
  }
  /* Counts that belong on the nav rather than on a screen: an admin should
     say what is waiting before you go looking for it. */
  const open = getSubmissions().filter((s) => s.status === "In progress").length;

  return (
    <div className="ad">
      <div className="ad__wrap">
        <AdminNav counts={{ Forms: open }} />
        <main className="ad__main">{children}</main>
      </div>
    </div>
  );
}
