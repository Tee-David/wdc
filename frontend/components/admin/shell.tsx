"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote, ClipboardList, FolderKanban, LayoutDashboard, LogOut, Settings, Users,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

/**
 * The admin's navigation. SIX ITEMS, because you asked for few menus.
 *
 * Everything else hangs off one of them rather than earning its own line:
 * bookings live under Projects, receipts and expenses and reports under Money,
 * the onboarding submissions under Forms, and content editing under Settings.
 * A seventh item is a decision to make the sidebar the thing people navigate
 * rather than the work.
 *
 * The current page is FILLED rather than underlined. In a tool you should know
 * where you are from the corner of your eye, without reading.
 */

const NAV = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", Icon: Users },
  { href: "/admin/projects", label: "Projects", Icon: FolderKanban },
  { href: "/admin/money", label: "Money", Icon: Banknote },
  { href: "/admin/forms", label: "Forms", Icon: ClipboardList },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
];

export default function AdminNav({ counts }: { counts?: Record<string, number> }) {
  const path = usePathname();

  return (
    <aside className="ad__side">
      <div className="ad__brand">
        <Link href="/" aria-label="Back to the website">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={28} height={28} />
        </Link>
        <div>
          <b>WDC</b>
          <span>Studio admin</span>
        </div>
      </div>

      <nav className="ad__nav" aria-label="Admin sections">
        {NAV.map(({ href, label, Icon }) => {
          /* Exact for the dashboard, prefix for the rest: without the exact
             case, "/admin" would light up on every page below it. */
          const on = href === "/admin" ? path === href : path.startsWith(href);
          const n = counts?.[label];
          return (
            <Link
              key={href}
              href={href}
              className={`ad__link${on ? " is-on" : ""}`}
              aria-current={on ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
              {n ? <span className="ad__count">{n}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="ad__sideFoot">
        <Link href="/">Back to the website</Link>
        <button type="button" onClick={async () => {
          await authClient.signOut();
          window.location.assign("/login");
        }}>
          <LogOut aria-hidden="true" /> Sign out
        </button>
      </div>
    </aside>
  );
}
