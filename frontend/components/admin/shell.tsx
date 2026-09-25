"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Banknote,
  Bell,
  ChevronDown,
  ClipboardList,
  FolderKanban,
  Globe,
  House,
  Images,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MessagesSquare,
  Moon,
  Newspaper,
  PanelLeft,
  LifeBuoy,
  Scale,
  Search,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { can, NAV_AREA, type AdminRole } from "@/lib/admin/permissions";
import { WdcMark } from "@/components/brand/logo";
import TourLauncher from "./tour/tour-launcher";
import TableScroll from "./table-scroll";
import { BottomSheet, TabBar } from "./tab-bar";
import { SideProfile, SideTourCard } from "./side-foot";
import { initialsOf, keepFocusInside } from "./focus";
import { ToastHost } from "./toast";

export type AdminUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type NavSub = { href: string; label: string };
type NavItem = {
  href: string;
  label: string;
  Icon: typeof Users;
  group: "main" | "general";
  tour: string;
  sub?: NavSub[];
};

/* Sub-pages appear under their section only while you are in it, and only
   pages that exist: a link to a screen that has not been built is a lie
   with a hover state. */
const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard, group: "main", tour: "nav-dashboard" },
  {
    href: "/admin/clients", label: "Clients", Icon: Users, group: "main", tour: "nav-clients",
    sub: [
      { href: "/admin/clients", label: "All clients" },
      /* Support sits with the people asking, not as an eighth page. */
      { href: "/admin/clients/support", label: "Support" },
    ],
  },
  { href: "/admin/projects", label: "Projects", Icon: FolderKanban, group: "main", tour: "nav-projects" },
  {
    href: "/admin/money", label: "Money", Icon: Banknote, group: "main", tour: "nav-money",
    sub: [
      { href: "/admin/money", label: "Invoices and spend" },
      { href: "/admin/money/reconciliation", label: "Reconciliation" },
    ],
  },
  { href: "/admin/forms", label: "Forms", Icon: ClipboardList, group: "main", tour: "nav-forms" },
  /* A seventh primary page, asked for by name: posts are written weekly,
     which is not an "infrequent control" to bury under Settings. */
  { href: "/admin/blog", label: "Blog", Icon: Newspaper, group: "main", tour: "nav-blog" },
  /* No sub-links here: Settings carries its own section menu on the page
     (lib/settings/sections.ts), and a second copy of twelve links in the
     sidebar would be the same list twice. */
  { href: "/admin/settings", label: "Settings", Icon: Settings, group: "general", tour: "nav-settings" },
];

/* The phone's bar: the four places visited daily, then More. */
const TABS = ["/admin", "/admin/clients", "/admin/projects", "/admin/money"];

/* What More holds on a phone, in the order a studio reaches for it. */
const MORE: { href: string; label: string; hint: string; Icon: typeof Users; count?: string; area: string }[] = [
  { href: "/admin/forms", label: "Forms", hint: "Briefs and enquiries", Icon: ClipboardList, count: "Forms", area: "/admin/forms" },
  { href: "/admin/blog", label: "Blog", hint: "Posts and drafts", Icon: Newspaper, count: "Blog", area: "/admin/blog" },
  { href: "/admin/clients/support", label: "Support", hint: "Client questions", Icon: LifeBuoy, area: "/admin/clients" },
  { href: "/admin/money/reconciliation", label: "Reconciliation", hint: "Payments to check", Icon: Scale, area: "/admin/money" },
  { href: "/admin/settings", label: "Settings", hint: "Studio and site", Icon: Settings, area: "/admin/settings" },
  { href: "/admin/settings/faq", label: "FAQ", hint: "Questions on the site", Icon: MessagesSquare, area: "/admin/blog" },
  { href: "/admin/settings/media", label: "Media", hint: "Images and files", Icon: Images, area: "/admin/blog" },
];

/* The pages this role may open. A courtesy, not the permission: every write
   is checked again on the server (lib/admin/guard.ts). */
const RoleContext = createContext<AdminRole>("owner");
/** The signed-in admin's role, for client components inside the shell. */
export function useAdminRole() {
  return useContext(RoleContext);
}
function allowed(role: AdminRole, href: string) {
  const area = NAV_AREA[href];
  return !area || can(role, area);
}
function useNav() {
  const role = useContext(RoleContext);
  return useMemo(() => NAV.filter((item) => allowed(role, item.href)), [role]);
}
const ROLE_LABEL: Record<string, string> = { owner: "Owner", staff: "Staff" };

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
  return href === "/admin" ? path === href : path === href || path.startsWith(href + "/");
}

/* The sub-page you are on: the longest one that matches, so "Invoices and
   spend" is not lit while you are in Reconciliation. */
function activeSub(item: NavItem, path: string) {
  return item.sub
    ?.filter((s) => path === s.href || path.startsWith(s.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/* Where the phone's back arrow goes: the nearest page above this one that
   the navigation knows about. A section's own front page has none. */
function parentOf(path: string) {
  const known = NAV.flatMap((item) => [item.href, ...(item.sub?.map((s) => s.href) ?? [])]);
  return known
    .filter((href) => href !== path && (href === "/admin" ? false : path.startsWith(href + "/")))
    .sort((a, b) => b.length - a.length)[0];
}

async function signOut(router: ReturnType<typeof useRouter>) {
  await authClient.signOut();
  router.replace("/login");
  router.refresh();
}

function Sidebar({
  collapsed = false,
  counts,
  onTogglePin,
  pinnedCollapsed = false,
  user,
}: {
  collapsed?: boolean;
  counts?: Record<string, number>;
  onTogglePin?: () => void;
  pinnedCollapsed?: boolean;
  user: AdminUser;
}) {
  const path = usePathname();
  const router = useRouter();
  const nav = useNav();
  const role = useAdminRole();
  const main = nav.filter((item) => item.group === "main");
  const general = nav.filter((item) => item.group === "general");

  const renderItem = (item: NavItem) => {
    const { href, label, Icon, tour, sub } = item;
    const active = isActive(href, path);
    const count = counts?.[label] ?? 0;
    const current = activeSub(item, path);
    return (
      <div key={href} className="ad__navItem">
        <Link
          href={href}
          className={`ad__link${active ? " is-on" : ""}`}
          aria-current={path === href ? "page" : undefined}
          title={collapsed ? label : undefined}
          data-tour={tour}
        >
          <Icon aria-hidden="true" />
          <span className={collapsed ? "ad__srOnly" : undefined}>{label}</span>
          {count > 0 ? <span className="ad__count">{count > 99 ? "99+" : count}</span> : null}
        </Link>
        {sub && active && !collapsed ? (
          <div className="ad__sub">
            {sub.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={`ad__subLink${current === s.href ? " is-on" : ""}`}
                aria-current={path === s.href ? "page" : undefined}
              >
                {s.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="ad__sideInner">
      <div className="ad__brand">
        <Link href="/admin" aria-label="WDC admin dashboard">
          <WdcMark className="ad__brandMark" />
          {!collapsed ? (
            <span><b>We Dig Creativity</b><small>Studio admin</small></span>
          ) : null}
        </Link>
        {onTogglePin && !collapsed ? (
          <button
            type="button"
            className="ad__iconButton"
            data-tour="sidebar-pin"
            onClick={onTogglePin}
            aria-label={pinnedCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={pinnedCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* The menu scrolls; the foot below it never moves. */}
      <div className="ad__sideScroll" data-lenis-prevent>
        <nav className="ad__nav" aria-label="Admin sections">
          {!collapsed ? <p className="ad__navLabel">Workspace</p> : null}
          <div className="ad__navGroup">{main.map(renderItem)}</div>
          {!collapsed ? <p className="ad__navLabel">General</p> : <span className="ad__navRule" />}
          <div className="ad__navGroup">{general.map(renderItem)}</div>
        </nav>
      </div>

      <div className="ad__sideFoot">
        <SideTourCard collapsed={collapsed} />
        <SideProfile user={user} role={ROLE_LABEL[role] ?? "Admin"} collapsed={collapsed} onSignOut={() => signOut(router)} />
      </div>
    </div>
  );
}

function useThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToClientMount,
    () => clientMounted,
    () => false,
  );
  const dark = mounted && resolvedTheme === "dark";
  return { mounted, dark, toggle: () => setTheme(dark ? "light" : "dark") };
}

function ThemeButton() {
  const { mounted, dark, toggle } = useThemeSwitch();
  if (!mounted) {
    return (
      <button type="button" className="ad__topIcon ad__themeBtn" aria-label="Switch theme" title="Switch theme">
        <Moon aria-hidden="true" />
      </button>
    );
  }
  return (
    <button
      type="button"
      className="ad__topIcon ad__themeBtn"
      onClick={toggle}
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      title={`Switch to ${dark ? "light" : "dark"} theme`}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  );
}

function AccountMenu({ user }: { user: AdminUser }) {
  const role = useAdminRole();
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
          ) : initialsOf(user, "Admin")}
        </span>
        <span className="ad__accountText">
          <b>{user.name || "Admin"}</b>
          <small>{ROLE_LABEL[role] ?? "Admin"}</small>
        </span>
        <ChevronDown className="ad__accountChev" aria-hidden="true" />
      </button>
      {open ? (
        <div className="ad__popover ad__accountMenu" role="menu">
          <div className="ad__accountMeta">
            <b>{user.name || "Admin"}</b>
            {user.email ? <span>{user.email}</span> : null}
          </div>
          <Link href="/" role="menuitem" onClick={() => setOpen(false)}><Globe aria-hidden="true" /> Back to website</Link>
          <button type="button" role="menuitem" onClick={() => signOut(router)}><LogOut aria-hidden="true" /> Sign out</button>
        </div>
      ) : null}
    </div>
  );
}

function Notifications({ openForms, failedMail = 0 }: { openForms: number; failedMail?: number }) {
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
      <button
        ref={trigger}
        type="button"
        className="ad__topIcon"
        aria-label={openForms + failedMail > 0 ? `Notifications, ${openForms + failedMail} waiting` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden="true" />
        {openForms + failedMail > 0 ? <span className="ad__notificationDot" aria-hidden="true">{openForms + failedMail > 9 ? "9+" : openForms + failedMail}</span> : null}
      </button>
      {open ? (
        <div className="ad__popover ad__notifications">
          <div className="ad__popoverHead"><b>Notifications</b></div>
          {failedMail > 0 ? (
            <Link href="/admin/settings/email?state=Failed" onClick={() => setOpen(false)}>
              <span className="ad__noticeIcon"><Bell aria-hidden="true" /></span>
              <span><b>{failedMail} {failedMail === 1 ? "email" : "emails"} did not send</b><small>See why in the message log, and retry</small></span>
            </Link>
          ) : null}
          {openForms > 0 ? (
            <Link href="/admin/forms" onClick={() => setOpen(false)}>
              <span className="ad__noticeIcon"><ClipboardList aria-hidden="true" /></span>
              <span><b>{openForms} unread form {openForms === 1 ? "entry" : "entries"}</b><small>Briefs and enquiries nobody has opened yet</small></span>
            </Link>
          ) : failedMail > 0 ? null : (
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
  const nav = useNav();
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pages = nav.flatMap((item) => [
      { href: item.href, label: item.label, Icon: item.Icon },
      ...(item.sub ?? []).filter((s) => s.href !== item.href).map((s) => ({ href: s.href, label: s.label, Icon: item.Icon })),
    ]);
    return pages.filter((item) => !needle || item.label.toLowerCase().includes(needle));
  }, [query, nav]);

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
          <input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages and actions…" aria-label="Search pages and actions" />
          <button type="button" onClick={onClose} aria-label="Close search"><X aria-hidden="true" /></button>
        </div>
        <div className="ad__commandResults">
          {results.length ? results.map(({ href, label, Icon }) => (
            <Link key={href + label} href={href} onClick={onClose}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </Link>
          )) : <p>No matching admin page or action.</p>}
        </div>
      </section>
    </div>
  );
}

function MoreSheet({ counts, onClose }: { counts: Record<string, number>; onClose: () => void }) {
  const path = usePathname();
  const router = useRouter();
  const theme = useThemeSwitch();
  const role = useAdminRole();
  const more = MORE.filter((m) => allowed(role, m.area));
  return (
    <BottomSheet title="More" onClose={onClose}>
      <nav className="ad__moreGrid" aria-label="More sections">
        {more.map(({ href, label, hint, Icon, count }) => {
          const n = count ? counts[count] ?? 0 : 0;
          const on = isActive(href, path) && !MORE.some((m) => m.href !== href && m.href.startsWith(href + "/") && isActive(m.href, path));
          return (
            <Link key={href} href={href} onClick={onClose} className={`ad__moreTile${on ? " is-on" : ""}`} aria-current={on ? "page" : undefined}>
              <span className="ad__moreIcon" aria-hidden="true"><Icon /></span>
              <b>{label}</b>
              <small>{hint}</small>
              {n > 0 ? <span className="ad__count" aria-label={`${n} waiting`}>{n > 99 ? "99+" : n}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="ad__moreList">
        <button type="button" onClick={theme.toggle} disabled={!theme.mounted}>
          {theme.dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          {theme.dark ? "Switch to light theme" : "Switch to dark theme"}
        </button>
        <Link href="/" onClick={onClose}><Globe aria-hidden="true" /> Back to website</Link>
        <button type="button" className="ad__moreOut" onClick={() => signOut(router)}><LogOut aria-hidden="true" /> Sign out</button>
      </div>
    </BottomSheet>
  );
}

export default function AdminShell({ children, counts = {}, user, role = "owner" }: { children: ReactNode; counts?: Record<string, number>; user: AdminUser; role?: AdminRole }) {
  return (
    <RoleContext.Provider value={role}>
      <ShellFrame counts={counts} user={user}>{children}</ShellFrame>
    </RoleContext.Provider>
  );
}

function ShellFrame({ children, counts, user }: { children: ReactNode; counts: Record<string, number>; user: AdminUser }) {
  const path = usePathname();
  const nav = useNav();
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const active = NAV.find((item) => isActive(item.href, path));
  const parent = parentOf(path);
  const visuallyCollapsed = pinnedCollapsed && !hoverExpanded;
  const closeMore = useCallback(() => setMoreOpen(false), []);
  const closeCommand = useCallback(() => setCommandOpen(false), []);

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

  function togglePin() {
    setPinnedCollapsed((current) => {
      const next = !current;
      try { localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }

  const inMore = !TABS.some((href) => isActive(href, path));
  const tabs = [
    ...nav.filter((item) => TABS.includes(item.href)).map((item) => ({
      label: item.href === "/admin" ? "Home" : item.label,
      Icon: item.href === "/admin" ? House : item.Icon,
      href: item.href,
      active: !moreOpen && !inMore && isActive(item.href, path),
      count: counts[item.label],
      tour: `tab-${item.label.toLowerCase()}`,
    })),
    {
      label: "More",
      Icon: LayoutGrid,
      active: moreOpen || inMore,
      count: (counts.Forms ?? 0) + (counts.Blog ?? 0) || undefined,
      onSelect: () => setMoreOpen(true),
      expanded: moreOpen,
      tour: "tab-more",
    },
  ];

  return (
    <div className={`ad__wrap${pinnedCollapsed ? " is-collapsed" : ""}`}>
      <aside
        className={`ad__side${pinnedCollapsed && hoverExpanded ? " is-hoverExpanded" : ""}`}
        onMouseEnter={() => pinnedCollapsed && setHoverExpanded(true)}
        onMouseLeave={() => setHoverExpanded(false)}
      >
        <Sidebar collapsed={visuallyCollapsed} counts={counts} onTogglePin={togglePin} pinnedCollapsed={pinnedCollapsed} user={user} />
      </aside>

      <div className="ad__column">
        <header className="ad__topbar">
          {/* On a phone: back to the page above, or the mark on a section's
              front page. The desktop has the sidebar for both. */}
          {parent ? (
            <Link href={parent} className="ad__topIcon ad__topBack" aria-label="Back"><ArrowLeft aria-hidden="true" /></Link>
          ) : (
            <Link href="/admin" className="ad__topMark" aria-label="WDC admin dashboard"><WdcMark /></Link>
          )}
          {/* The section name, not the page's heading: every page renders its own
              h1, and a second one here made two per page. */}
          <p className="ad__topTitle">{active?.label ?? "Admin"}</p>
          <button type="button" className="ad__search" data-tour="topbar-search" onClick={() => setCommandOpen(true)} aria-label="Search, Ctrl K">
            <Search aria-hidden="true" /><span>Search clients, projects, invoices</span><kbd>Ctrl K</kbd>
          </button>
          <div className="ad__topActions">
            <TourLauncher />
            <ThemeButton />
            <Notifications openForms={counts.Forms ?? 0} failedMail={counts.FailedMail ?? 0} />
            <span className="ad__topRule" aria-hidden="true" />
            <AccountMenu user={user} />
          </div>
        </header>
        <main className="ad__main">{children}</main>
        <TableScroll />
        <ToastHost />
      </div>

      <TabBar items={tabs} label="Admin sections" tour="mobile-menu" />
      {moreOpen ? <MoreSheet counts={counts} onClose={closeMore} /> : null}
      {commandOpen ? <CommandPalette onClose={closeCommand} /> : null}
    </div>
  );
}
