"use client";

import { useSupportReadOnly } from "./support-context";
import { SUPPORT_EXIT } from "@/lib/users/support-policy";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ArrowLeft, ChevronDown, Globe, LogOut, Moon, PanelLeft, Sun } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { saveAppearance } from "@/lib/client-profile-actions";
import { WdcMark } from "@/components/brand/logo";
import { CLIENT_NAV, isClientNavActive } from "./client-nav";
import TourLauncher from "@/components/admin/tour/tour-launcher";
import TableScroll from "@/components/admin/table-scroll";
import { MenuButton, NavDrawer, useNavDrawer } from "@/components/admin/nav-drawer";
import { SideProfile, SideTourCard } from "@/components/admin/side-foot";
import { initialsOf } from "@/components/admin/focus";
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
let clientMounted = false;
function subscribeToClientMount(onChange: () => void) {
  if (!clientMounted) {
    clientMounted = true;
    queueMicrotask(onChange);
  }
  return () => undefined;
}

async function signOut(router: ReturnType<typeof useRouter>) {
  await authClient.signOut();
  router.replace("/login");
  router.refresh();
}

function Sidebar({
  collapsed = false, onTogglePin, pinnedCollapsed = false, clientCompany, user,
}: {
  collapsed?: boolean; onTogglePin?: () => void; pinnedCollapsed?: boolean;
  clientCompany: string | null; user: PortalUser;
}) {
  const supportReadOnly = useSupportReadOnly();
  const path = usePathname();
  const router = useRouter();

  return (
    <div className="ad__sideInner">
      <div className="ad__brand">
        <Link href="/portal" aria-label="WDC client portal">
          <WdcMark className="ad__brandMark" />
          {!collapsed ? (
            <span><b>We Dig Creativity</b><small>{clientCompany ?? "Client portal"}</small></span>
          ) : null}
        </Link>
        {onTogglePin && !collapsed ? (
          <button
            type="button"
            className="ad__iconButton"
            onClick={onTogglePin}
            aria-label={pinnedCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={pinnedCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="ad__sideScroll" data-lenis-prevent>
        <nav className="ad__nav" aria-label="Portal sections">
          {!collapsed ? <p className="ad__navLabel">Your work</p> : null}
          <div className="ad__navGroup">
            {CLIENT_NAV.map(({ href, label, Icon, tour }) => {
              const active = isClientNavActive(href, path);
              return (
                <Link
                  key={href}
                  href={href}
                  data-tour={tour}
                  className={`ad__link${active ? " is-on" : ""}`}
                  aria-current={path === href ? "page" : undefined}
                  title={collapsed ? label : undefined}
                >
                  <Icon aria-hidden="true" />
                  <span className={collapsed ? "ad__srOnly" : undefined}>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="ad__sideFoot">
        {!supportReadOnly ? <SideTourCard collapsed={collapsed} /> : null}
        <SideProfile user={user} role={clientCompany ?? "Client"} collapsed={collapsed} signOutLabel={supportReadOnly ? "Exit support view" : "Sign out"} onSignOut={() => { if (supportReadOnly) { const form = document.createElement("form"); form.method = "post"; form.action = SUPPORT_EXIT; document.body.append(form); form.submit(); } else void signOut(router); }} />
      </div>
    </div>
  );
}

/** The theme switch as a row of the account menu; the choice is saved to the account straight away. */
function MenuTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToClientMount, () => clientMounted, () => false);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button type="button" role="menuitem" onClick={() => { const next = dark ? "light" : "dark"; setTheme(next); void saveAppearance(next); }}>
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />} {mounted ? (dark ? "Light theme" : "Dark theme") : "Switch theme"}
    </button>
  );
}

function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToClientMount, () => clientMounted, () => false);
  if (!mounted) {
    return (
      <button type="button" className="ad__topIcon" aria-label="Switch theme" title="Switch theme">
        <Moon aria-hidden="true" />
      </button>
    );
  }
  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      className="ad__topIcon"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      title={`Switch to ${dark ? "light" : "dark"} theme`}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  );
}

function AccountMenu({ user, clientCompany }: { user: PortalUser; clientCompany: string | null }) {
  const supportReadOnly = useSupportReadOnly();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    function close(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", keydown);
    };
  }, [open]);

  return (
    <div className="ad__menuWrap" ref={ref}>
      <button ref={trigger} type="button" className="ad__account" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="ad__avatar" aria-hidden="true">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" />
          ) : initialsOf(user, "Client")}
        </span>
        <span className="ad__accountText">
          <b>{user.name || "Client"}</b>
          <small>{clientCompany ?? "Client"}</small>
        </span>
        <ChevronDown className="ad__accountChev" aria-hidden="true" />
      </button>
      {open ? (
        <div className="ad__popover ad__accountMenu" role="menu">
          <div className="ad__accountMeta">
            <b>{user.name || "Client"}</b>
            {user.email ? <span>{user.email}</span> : null}
          </div>
          {supportReadOnly ? <form action={SUPPORT_EXIT} method="post"><button type="submit" role="menuitem"><LogOut aria-hidden="true" /> Exit support view</button></form> : <><MenuTheme /><Link href="/" role="menuitem" onClick={() => setOpen(false)}><Globe aria-hidden="true" /> Back to website</Link><button type="button" role="menuitem" onClick={() => signOut(router)}><LogOut aria-hidden="true" /> Sign out</button></>}
        </div>
      ) : null}
    </div>
  );
}

export default function ClientShell({
  children, user, clientCompany,
}: { children: ReactNode; user: PortalUser; clientCompany: string | null }) {
  const supportReadOnly = useSupportReadOnly();
  const path = usePathname();
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const active = CLIENT_NAV.find((item) => isClientNavActive(item.href, path));
  const visuallyCollapsed = pinnedCollapsed && !hoverExpanded;
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
      <aside
        className={`ad__side${pinnedCollapsed && hoverExpanded ? " is-hoverExpanded" : ""}`}
        onMouseEnter={() => pinnedCollapsed && setHoverExpanded(true)}
        onMouseLeave={() => setHoverExpanded(false)}
      >
        <Sidebar collapsed={visuallyCollapsed} onTogglePin={togglePin} pinnedCollapsed={pinnedCollapsed} clientCompany={clientCompany} user={user} />
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
          <div className="ad__topActions">
            {!supportReadOnly ? <TourLauncher /> : null}
            <ThemeButton />
            <span className="ad__topRule" aria-hidden="true" />
            <AccountMenu user={user} clientCompany={clientCompany} />
          </div>
        </header>
        <main className="ad__main">{children}</main>
        <TableScroll />
        <ToastHost />
        <ConfirmHost />
      </div>

      <NavDrawer open={drawer.open} onClose={drawer.hide} label="Portal menu" tools={<ThemeButton />}>
        <Sidebar clientCompany={clientCompany} user={user} />
      </NavDrawer>
    </div>
  );
}
