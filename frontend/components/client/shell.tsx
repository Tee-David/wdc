"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronLeft, ChevronRight, Home, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { CLIENT_NAV, isClientNavActive } from "./client-nav";
import TourLauncher from "@/components/admin/tour/tour-launcher";

/**
 * THE CLIENT PORTAL'S OWN SHELL -- the same sidebar/topbar/mobile-drawer
 * skeleton `components/admin/shell.tsx` already built, trimmed rather than
 * duplicated from scratch: no command palette and no notification bell (a
 * five-item nav has nothing worth a Ctrl+K search for, and there is no
 * unread-count source on this side yet), everything else -- the collapse
 * behaviour, the hover-expand on a pinned-collapsed rail, the focus trap in
 * the mobile drawer, the theme toggle -- carried over because it is the
 * same shell, not a client-flavoured guess at one.
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

function initials(user: PortalUser) {
  const source = user.name?.trim() || user.email?.split("@")[0] || "Client";
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function keepFocusInside(event: KeyboardEvent, container: HTMLElement | null) {
  if (event.key !== "Tab" || !container) return;
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function Sidebar({
  collapsed = false, canPin = false, onNavigate, onTogglePin, pinnedCollapsed = false, clientCompany,
}: {
  collapsed?: boolean; canPin?: boolean; onNavigate?: () => void; onTogglePin?: () => void;
  pinnedCollapsed?: boolean; clientCompany: string | null;
}) {
  const path = usePathname();
  const router = useRouter();

  return (
    <div className="ad__sideInner">
      <div className="ad__brand">
        <Link href="/portal" onClick={onNavigate} aria-label="WDC client portal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={32} height={32} />
          {!collapsed ? (
            <span><b>WDC</b><small>{clientCompany ?? "Client portal"}</small></span>
          ) : null}
        </Link>
        {canPin && !collapsed ? (
          <button
            type="button"
            className="ad__iconButton"
            onClick={onTogglePin}
            aria-label={pinnedCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={pinnedCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {pinnedCollapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
          </button>
        ) : null}
      </div>

      <nav className="ad__nav" aria-label="Portal sections">
        <div className="ad__navGroup">
          {CLIENT_NAV.map(({ href, label, Icon, tour }) => {
            const active = isClientNavActive(href, path);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                /* Only the rail's copy is a tour target; the drawer renders
                   the same links again and two matches would be ambiguous. */
                data-tour={onNavigate ? undefined : tour}
                className={`ad__link${active ? " is-on" : ""}`}
                aria-current={active ? "page" : undefined}
                title={collapsed ? label : undefined}
              >
                <Icon aria-hidden="true" />
                <span className={collapsed ? "ad__srOnly" : undefined}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="ad__sideFoot">
        <button
          type="button"
          className="ad__link ad__logout"
          title={collapsed ? "Sign out" : undefined}
          onClick={async () => {
            await authClient.signOut();
            router.replace("/login");
            router.refresh();
          }}
        >
          <LogOut aria-hidden="true" />
          <span className={collapsed ? "ad__srOnly" : undefined}>Sign out</span>
        </button>
      </div>
    </div>
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

function AccountMenu({ user }: { user: PortalUser }) {
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
      <button ref={trigger} type="button" className="ad__avatar" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" />
        ) : initials(user)}
      </button>
      {open ? (
        <div className="ad__popover ad__account" role="menu">
          <div className="ad__accountMeta">
            <b>{user.name || "Client"}</b>
            {user.email ? <span>{user.email}</span> : null}
          </div>
          <Link href="/" role="menuitem" onClick={() => setOpen(false)}><Home aria-hidden="true" /> Back to website</Link>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await authClient.signOut();
              router.replace("/login");
              router.refresh();
            }}
          ><LogOut aria-hidden="true" /> Sign out</button>
        </div>
      ) : null}
    </div>
  );
}

export default function ClientShell({
  children, user, clientCompany,
}: { children: ReactNode; user: PortalUser; clientCompany: string | null }) {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const mobileClose = useRef<HTMLButtonElement>(null);
  const mobileDialog = useRef<HTMLElement>(null);
  const active = CLIENT_NAV.find((item) => isClientNavActive(item.href, path));
  const visuallyCollapsed = pinnedCollapsed && !hoverExpanded;

  useEffect(() => {
    const id = window.setTimeout(() => {
      try { setPinnedCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1"); } catch {}
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileClose.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
      keepFocusInside(event, mobileDialog.current);
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [mobileOpen]);

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
        <Sidebar collapsed={visuallyCollapsed} canPin onTogglePin={togglePin} pinnedCollapsed={pinnedCollapsed} clientCompany={clientCompany} />
      </aside>

      {mobileOpen ? (
        <div className="ad__mobileLayer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setMobileOpen(false)}>
          <aside ref={mobileDialog} className="ad__mobileDrawer" role="dialog" aria-modal="true" aria-label="Portal navigation">
            <button ref={mobileClose} type="button" className="ad__mobileClose" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X aria-hidden="true" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} clientCompany={clientCompany} />
          </aside>
        </div>
      ) : null}

      <div className="ad__column">
        <header className="ad__topbar">
          <button type="button" className="ad__topIcon ad__mobileMenu" data-tour="portal-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu aria-hidden="true" /></button>
          <h1>{active?.label ?? "Portal"}</h1>
          <div className="ad__topActions">
            <TourLauncher />
            <ThemeButton />
            <AccountMenu user={user} />
          </div>
        </header>
        <main className="ad__main">{children}</main>
      </div>
    </div>
  );
}
