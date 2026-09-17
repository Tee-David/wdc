"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Banknote,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Compass,
  FolderKanban,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { useAdminTour } from "./tour/tour-provider";

export type AdminUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

const NAV = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard, group: "main", tour: "nav-dashboard" },
  { href: "/admin/clients", label: "Clients", Icon: Users, group: "main", tour: "nav-clients" },
  { href: "/admin/projects", label: "Projects", Icon: FolderKanban, group: "main", tour: "nav-projects" },
  { href: "/admin/money", label: "Money", Icon: Banknote, group: "main", tour: "nav-money" },
  { href: "/admin/forms", label: "Forms", Icon: ClipboardList, group: "main", tour: "nav-forms" },
  { href: "/admin/settings", label: "Settings", Icon: Settings, group: "general", tour: "nav-settings" },
] as const;

const SIDEBAR_KEY = "wdc:admin-sidebar-collapsed";
let clientMounted = false;

function subscribeToClientMount(onChange: () => void) {
  if (!clientMounted) {
    clientMounted = true;
    queueMicrotask(onChange);
  }
  return () => undefined;
}

function isActive(href: string, path: string) {
  return href === "/admin" ? path === href : path.startsWith(href);
}

function initials(user: AdminUser) {
  const source = user.name?.trim() || user.email?.split("@")[0] || "Admin";
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
  collapsed = false,
  canPin = false,
  counts,
  onNavigate,
  onTogglePin,
  pinnedCollapsed = false,
}: {
  collapsed?: boolean;
  canPin?: boolean;
  counts?: Record<string, number>;
  onNavigate?: () => void;
  onTogglePin?: () => void;
  pinnedCollapsed?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const main = NAV.filter((item) => item.group === "main");
  const general = NAV.filter((item) => item.group === "general");

  const renderItem = ({ href, label, Icon, tour }: (typeof NAV)[number]) => {
    const active = isActive(href, path);
    const count = counts?.[label] ?? 0;
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        className={`ad__link${active ? " is-on" : ""}`}
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : undefined}
        data-tour={tour}
      >
        <Icon aria-hidden="true" />
        <span className={collapsed ? "ad__srOnly" : undefined}>{label}</span>
        {count > 0 ? <span className="ad__count">{count > 99 ? "99+" : count}</span> : null}
      </Link>
    );
  };

  return (
    <div className="ad__sideInner">
      <div className="ad__brand">
        <Link href="/admin" onClick={onNavigate} aria-label="WDC admin dashboard">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={32} height={32} />
          {!collapsed ? (
            <span><b>WDC</b><small>Agency admin</small></span>
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

      <nav className="ad__nav" aria-label="Admin sections">
        <div className="ad__navGroup">{main.map(renderItem)}</div>
        <div className="ad__navGroup ad__navGroup--general">
          {!collapsed ? <p>General</p> : <span className="ad__navRule" />}
          {general.map(renderItem)}
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
  const mounted = useSyncExternalStore(
    subscribeToClientMount,
    () => clientMounted,
    () => false,
  );
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

function AccountMenu({ user }: { user: AdminUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const { active, fullTourCompleted, startFullTour, restartFullTour } = useAdminTour();

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
            <b>{user.name || "Admin"}</b>
            {user.email ? <span>{user.email}</span> : null}
          </div>
          <Link href="/" role="menuitem" onClick={() => setOpen(false)}><Home aria-hidden="true" /> Back to website</Link>
          {/* THE PERSISTENT ENTRY POINT section 5.1 asks for. Reads its own
              label off whether this browser has finished the full
              walkthrough before, so it never claims "take a tour" to
              someone who already has -- "replay" is the honest word then. */}
          {!active ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); (fullTourCompleted ? restartFullTour : startFullTour)(); }}
            ><Compass aria-hidden="true" /> {fullTourCompleted ? "Replay the tour" : "Take a tour"}</button>
          ) : null}
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

function Notifications({ openForms }: { openForms: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

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
      <button ref={trigger} type="button" className="ad__topIcon" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Bell aria-hidden="true" />
        {openForms > 0 ? <span className="ad__notificationDot">{openForms > 9 ? "9+" : openForms}</span> : null}
      </button>
      {open ? (
        <div className="ad__popover ad__notifications">
          <div className="ad__popoverHead"><b>Notifications</b></div>
          {openForms > 0 ? (
            <Link href="/admin/forms" onClick={() => setOpen(false)}>
              <span className="ad__noticeIcon"><ClipboardList aria-hidden="true" /></span>
              <span><b>{openForms} onboarding {openForms === 1 ? "form is" : "forms are"} in progress</b><small>Review incomplete submissions</small></span>
            </Link>
          ) : (
            <div className="ad__popoverEmpty"><b>You’re all caught up.</b><span>New activity will show up here.</span></div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return NAV.filter((item) => !needle || item.label.toLowerCase().includes(needle));
  }, [query]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => input.current?.focus(), 0);
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      keepFocusInside(event, dialog.current);
    }
    document.addEventListener("keydown", keydown);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="ad__overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialog} className="ad__command" role="dialog" aria-modal="true" aria-label="Search admin">
        <div className="ad__commandInput">
          <Search aria-hidden="true" />
          <input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages and actions…" />
          <button type="button" onClick={onClose} aria-label="Close search"><X aria-hidden="true" /></button>
        </div>
        <div className="ad__commandResults">
          {results.length ? results.map(({ href, label, Icon }) => (
            <Link key={href} href={href} onClick={onClose}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </Link>
          )) : <p>No matching admin page or action.</p>}
        </div>
      </section>
    </div>
  );
}

export default function AdminShell({ children, counts = {}, user }: { children: ReactNode; counts?: Record<string, number>; user: AdminUser }) {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const mobileClose = useRef<HTMLButtonElement>(null);
  const mobileDialog = useRef<HTMLElement>(null);
  const active = NAV.find((item) => isActive(item.href, path));
  const visuallyCollapsed = pinnedCollapsed && !hoverExpanded;

  useEffect(() => {
    const id = window.setTimeout(() => {
      try { setPinnedCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1"); } catch {}
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
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
        <Sidebar collapsed={visuallyCollapsed} canPin counts={counts} onTogglePin={togglePin} pinnedCollapsed={pinnedCollapsed} />
      </aside>

      {mobileOpen ? (
        <div className="ad__mobileLayer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setMobileOpen(false)}>
          <aside ref={mobileDialog} className="ad__mobileDrawer" role="dialog" aria-modal="true" aria-label="Admin navigation">
            <button ref={mobileClose} type="button" className="ad__mobileClose" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X aria-hidden="true" />
            </button>
            <Sidebar counts={counts} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="ad__column">
        <header className="ad__topbar">
          <button type="button" className="ad__topIcon ad__mobileMenu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu aria-hidden="true" /></button>
          <h1>{active?.label ?? "Admin"}</h1>
          <button type="button" className="ad__search" data-tour="topbar-search" onClick={() => setCommandOpen(true)}><Search aria-hidden="true" /><span>Search…</span><kbd>Ctrl K</kbd></button>
          <div className="ad__topActions">
            <ThemeButton />
            <Notifications openForms={counts.Forms ?? 0} />
            <AccountMenu user={user} />
          </div>
        </header>
        <main className="ad__main">{children}</main>
      </div>

      {commandOpen ? <CommandPalette onClose={() => setCommandOpen(false)} /> : null}
    </div>
  );
}
