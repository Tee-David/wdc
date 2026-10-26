"use client";

import { PortalSearch } from "./portal-search";
import { TopChoresSlot } from "@/components/admin/top-chores";
import { SheetDrag } from "@/components/admin/sheet-drag";
import { useSupportReadOnly } from "./support-context";
import { SUPPORT_EXIT } from "@/lib/users/support-policy";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { saveAppearance } from "@/lib/client-profile-actions";
import { WdcMark } from "@/components/brand/logo";
import { CLIENT_NAV, isClientNavActive } from "./client-nav";
import TableScroll from "@/components/admin/table-scroll";
import { MenuButton, NavDrawer, useNavDrawer } from "@/components/admin/nav-drawer";
import { FootRow, InstallCard, KitBrand, KitIcon, KitNav, ProfileCard, type KitNavLink } from "@/components/admin/side-kit";
import { ToastHost } from "@/components/admin/toast";
import { ConfirmHost } from "@/components/admin/confirm";

/**
 * THE CLIENT PORTAL'S OWN SHELL -- the admin's shell (`components/admin/
 * shell.tsx`) trimmed rather than rebuilt: the same sidebar with its pinned
 * foot, the same top bar, the same floating tab bar on a phone. No command
 * palette and no notification bell (a five-item nav has nothing worth a
 * Ctrl+K search for, and there is no unread-count source on this side yet),
 * and no More: five sections fit the bar exactly.
 */

export type PortalUser = { name?: string | null; email?: string | null; image?: string | null };

const SIDEBAR_KEY = "wdc:portal-sidebar-collapsed";
async function signOut(router: ReturnType<typeof useRouter>) {
  await authClient.signOut();
  router.replace("/login");
  router.refresh();
}

function Sidebar({
  collapsed = false, onTogglePin, onExpand, clientCompany, user, canSupport = true, canBilling = true, counts, drawer = false, onClose,
}: {
  collapsed?: boolean; onTogglePin?: () => void; onExpand?: () => void;
  clientCompany: string | null; user: PortalUser;
  canSupport?: boolean; canBilling?: boolean;
  counts?: Record<string, number>;
  /** The phone drawer: a head with the close cross, counts at the row's end. */
  drawer?: boolean; onClose?: () => void;
}) {
  const supportReadOnly = useSupportReadOnly();
  const path = usePathname();
  const router = useRouter();
  const all: (KitNavLink & { group?: string })[] = CLIENT_NAV
    .filter((item) => (item.href !== "/portal/support" || canSupport) && (item.href !== "/portal/billing" || canBilling))
    .map((item) => ({ href: item.href, label: item.label, icon: item.icon, tour: item.tour, on: isClientNavActive(item.href, path), current: path === item.href,
      count: counts?.[item.label] ?? 0, tone: item.label === "Billing" ? "warn" : "brand", group: item.group }));
  /* Support sits in its own group below, as on the admin. */
  const items = all.filter((i) => !i.group);
  const general = all.filter((i) => i.group);
  const brand = <KitBrand href="/portal" name={clientCompany ?? "Client portal"} sub={clientCompany ? "Client portal" : undefined} label="WDC client portal" />;
  const exit = () => { const form = document.createElement("form"); form.method = "post"; form.action = SUPPORT_EXIT; document.body.append(form); form.submit(); };
  const foot = (
    <div className="adK__foot">
      {!supportReadOnly ? <InstallCard drawer={drawer} body="Open your projects and invoices from your home screen, like an app." /> : null}
      <FootRow drawer={drawer} onCollapse={drawer ? undefined : onTogglePin} onExpand={drawer ? undefined : onExpand} onTheme={(next) => { void saveAppearance(next); }} />
      <ProfileCard user={user} role={clientCompany ?? "Client"} href="/portal/settings" signOutLabel={supportReadOnly ? "Exit support view" : "Sign out"} onSignOut={() => { if (supportReadOnly) exit(); else void signOut(router); }} />
    </div>
  );
  if (drawer) {
    return (
      <div className="adK adK--drawer">
        <div className="adK__drawHead">
          {brand}
          <button type="button" className="adK__ibtn adK__xBtn" aria-label="Close the menu" onClick={onClose}><KitIcon name="x" size={18} /></button>
        </div>
        <div className="adK__scroll" data-lenis-prevent><KitNav items={items} label="Portal sections" drawer />{general.length ? <KitNav items={general} label="Help" drawer /> : null}</div>
        {foot}
      </div>
    );
  }
  return (
    <div className={`adK${collapsed ? " is-mini" : ""}`}>
      {brand}
      <div className="adK__scroll" data-lenis-prevent><KitNav items={items} label="Portal sections" mini={collapsed} />{general.length ? <KitNav items={general} label="Help" mini={collapsed} /> : null}</div>
      {foot}
    </div>
  );
}

export default function ClientShell({
  children, user, clientCompany, canSupport = true, canBilling = true, counts,
}: { children: ReactNode; user: PortalUser; clientCompany: string | null; canSupport?: boolean; canBilling?: boolean; counts?: Record<string, number> }) {
  const path = usePathname();
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const active = CLIENT_NAV.find((item) => isClientNavActive(item.href, path));
  const drawer = useNavDrawer();
  /* Inside a section (a project, a conversation) the phone's arrow goes back
     to the section's list; on the list itself the mark stands in its place. */
  const parent = active && active.href !== "/portal" && path !== active.href ? active.href : undefined;

  useEffect(() => {
    const id = window.setTimeout(() => {
      try { setPinnedCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1"); } catch {}
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function togglePin() {
    setPinnedCollapsed((current) => {
      const next = !current;
      try { localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }

  return (
    <div className={`ad__wrap${pinnedCollapsed ? " is-collapsed" : ""}`}>
      <SheetDrag />
      <aside className="ad__side" aria-label="Main">
        <Sidebar collapsed={pinnedCollapsed} onTogglePin={togglePin} onExpand={() => (pinnedCollapsed ? togglePin() : drawer.show())} clientCompany={clientCompany} user={user} canSupport={canSupport} canBilling={canBilling} counts={counts} />
      </aside>

      <div className="ad__column">
        <header className="ad__topbar">
          <MenuButton onClick={drawer.show} expanded={drawer.open} tour="portal-mobile-menu" />
          {parent ? (
            <Link href={parent} className="ad__topIcon ad__topBack" aria-label="Back"><ArrowLeft aria-hidden="true" /></Link>
          ) : (
            <Link href="/portal" className="ad__topMark" aria-label="WDC client portal"><WdcMark /></Link>
          )}
          {/* The section name, not the page's heading: every page renders its own
              h1, and a second one here made two per page. */}
          <p className="ad__topTitle">{active?.label ?? "Portal"}</p>
          <PortalSearch />
          <div className="ad__topActions">
            <Link href="/portal/notifications" className="ad__topIcon" aria-label="Your project inbox" title="Your project inbox" data-tour="workspace-inbox-link"><Bell aria-hidden="true" /></Link>
            <TopChoresSlot />
          </div>
        </header>
        <main className="ad__main">{children}</main>
        <TableScroll />
        <ToastHost />
        <ConfirmHost />
      </div>

      <NavDrawer open={drawer.open} onClose={drawer.hide} label="Portal menu">
        <Sidebar drawer onClose={drawer.hide} clientCompany={clientCompany} user={user} canSupport={canSupport} canBilling={canBilling} counts={counts} />
      </NavDrawer>
    </div>
  );
}
