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
  CalendarDays,
  FolderKanban,
  Globe,
  LayoutDashboard,
  LogOut,
  Mail,
  Moon,
  Newspaper,
  PanelLeft,
  Search,
  Settings,
  Sun,
  UserRound,
  Users,
  X,
  UserCog,
} from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { can, NAV_AREA, type AdminRole } from "@/lib/admin/permissions";
import { WdcMark } from "@/components/brand/logo";
import TourLauncher from "./tour/tour-launcher";
import TableScroll from "./table-scroll";
import { MenuButton, NavDrawer, useNavDrawer } from "./nav-drawer";
import { SideProfile, SideTourCard } from "./side-foot";
import { initialsOf, keepFocusInside } from "./focus";
import { ToastHost } from "./toast";
import { ConfirmHost } from "./confirm";
import SupportBar, { exitSupportView } from "./support-bar";

export type AdminUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type NavSub = { href: string; label: string };
/* `also`: other sections that belong under this one, so it stays lit and open while you are in them. */
type NavItem = {
  href: string;
  label: string;
  Icon: typeof Users;
  group: "main" | "general";
  tour: string;
  sub?: NavSub[];
  also?: string[];
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
      /* Leads and forms, and meetings, are conversations with clients and people who may become one. */
      { href: "/admin/forms", label: "Leads and forms" },
      { href: "/admin/meetings", label: "Meetings" },
      /* Support sits with the people asking, not as an eighth page. */
      { href: "/admin/clients/support", label: "Support" },
    ],
    also: ["/admin/forms", "/admin/meetings"],
  },
  { href: "/admin/projects", label: "Projects", Icon: FolderKanban, group: "main", tour: "nav-projects" },
  {
    href: "/admin/money", label: "Money", Icon: Banknote, group: "main", tour: "nav-money",
    sub: [
      { href: "/admin/money", label: "Invoices and spend" },
      { href: "/admin/money/reconciliation", label: "Reconciliation" },
    ],
  },
  { href: "/admin/email", label: "Email", Icon: Mail, group: "main", tour: "nav-email" },
  /* A seventh primary page, asked for by name: posts are written weekly,
     which is not an "infrequent control" to bury under Settings. */
  { href: "/admin/blog", label: "Blog", Icon: Newspaper, group: "main", tour: "nav-blog" },
  /* People are managed daily enough (invitations, access, recovery) that they are a page, not a setting. */
  { href: "/admin/users", label: "Users", Icon: UserCog, group: "main", tour: "nav-users" },
  /* No sub-links here: Settings carries its own section menu on the page
     (lib/settings/sections.ts), and a second copy of twelve links in the
     sidebar would be the same list twice. */
  { href: "/admin/settings", label: "Settings", Icon: Settings, group: "general", tour: "nav-settings" },
];

/* The pages this role may open. A courtesy, not the permission: every write
   is checked again on the server (lib/admin/guard.ts). */
const RoleContext = createContext<AdminRole>("owner");
/** True while the owner is looking at the admin as somebody else: "Sign out" becomes "Exit support view". */
const SupportContext = createContext(false);
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

function isActive(href: string, path: string, also: string[] = []) {
  return href === "/admin" ? path === href : [href, ...also].some((h) => path === h || path.startsWith(h + "/"));
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

async function signOut(router: ReturnType<typeof useRouter>, support = false) {
  /* In a support view this is Exit: signing out would end the OWNER's session, not the view. */
  if (support) { exitSupportView(); return; }
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
  const support = useContext(SupportContext);
  const nav = useNav();
  const role = useAdminRole();
  const main = nav.filter((item) => item.group === "main");
  const general = nav.filter((item) => item.group === "general");

  const renderItem = (item: NavItem) => {
    const { href, label, Icon, tour, sub } = item;
    const active = isActive(href, path, item.also);
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
            {sub.filter((s) => allowed(role, s.href)).map((s) => (
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
        <SideProfile user={user} role={ROLE_LABEL[role] ?? "Admin"} collapsed={collapsed} signOutLabel={support ? "Exit support view" : "Sign out"} onSignOut={() => signOut(router, support)} />
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

/** The theme switch as a row of the account menu, for staff and owner. */
function MenuTheme() {
  const { mounted, dark, toggle } = useThemeSwitch();
  return (
    <button type="button" role="menuitem" onClick={toggle}>
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />} {mounted ? (dark ? "Light theme" : "Dark theme") : "Switch theme"}
    </button>
  );
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
  const support = useContext(SupportContext);

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
          <Link href="/admin/settings/account" role="menuitem" onClick={() => setOpen(false)}><UserRound aria-hidden="true" /> Your name and password</Link>
          <MenuTheme />
          <Link href="/" role="menuitem" onClick={() => setOpen(false)}><Globe aria-hidden="true" /> Back to website</Link>
          <button type="button" role="menuitem" onClick={() => signOut(router, support)}><LogOut aria-hidden="true" /> {support ? "Exit support view" : "Sign out"}</button>
        </div>
      ) : null}
    </div>
  );
}

function Notifications({ openForms, failedMail = 0, inReview = 0, unchecked = false }: { openForms: number; failedMail?: number; inReview?: number; unchecked?: boolean }) {
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
        aria-label={openForms + failedMail + inReview > 0 ? `Notifications, ${openForms + failedMail + inReview} waiting` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden="true" />
        {openForms + failedMail + inReview > 0 ? <span className="ad__notificationDot" aria-hidden="true">{openForms + failedMail + inReview > 9 ? "9+" : openForms + failedMail + inReview}</span> : null}
      </button>
      {open ? (
        <div className="ad__popover ad__notifications">
          <div className="ad__popoverHead"><b>Notifications</b></div>
          <Link href="/admin/notifications" onClick={() => setOpen(false)} data-tour="workspace-inbox-link">
            <span className="ad__noticeIcon"><Bell aria-hidden="true" /></span>
            <span><b>Your project inbox</b><small>Decisions, team handovers and personal email preferences</small></span>
          </Link>
          {failedMail > 0 ? (
            <Link href="/admin/settings/email/log?state=Failed" onClick={() => setOpen(false)}>
              <span className="ad__noticeIcon"><Bell aria-hidden="true" /></span>
              <span><b>{failedMail} {failedMail === 1 ? "email" : "emails"} did not send</b><small>See why in the message log, and retry</small></span>
            </Link>
          ) : null}
          {openForms > 0 ? (
            <Link href="/admin/forms" onClick={() => setOpen(false)}>
              <span className="ad__noticeIcon"><ClipboardList aria-hidden="true" /></span>
              <span><b>{openForms} unread form {openForms === 1 ? "entry" : "entries"}</b><small>Briefs and enquiries nobody has opened yet</small></span>
            </Link>
          ) : null}
          {inReview > 0 ? (
            <Link href="/admin/blog?state=review" onClick={() => setOpen(false)}>
              <span className="ad__noticeIcon"><Newspaper aria-hidden="true" /></span>
              <span><b>{inReview} {inReview === 1 ? "post" : "posts"} waiting for review</b><small>Publish them or send them back</small></span>
            </Link>
          ) : null}
          {/* "All caught up" only when every count was actually read. */}
          {unchecked ? (
            <div className="ad__popoverEmpty"><b>Couldn’t check for new activity.</b><span>The database did not answer. <a href="">Reload</a> to try again.</span></div>
          ) : openForms + failedMail + inReview === 0 ? (
            <div className="ad__popoverEmpty"><b>You’re all caught up.</b><span>New activity will show up here.</span></div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* RECENT RECORDS: the last few clients, projects and invoices opened, kept in this
   browser. Recorded from the page's own title, shown when search is empty. */
const RECENT_KEY = "wdc-admin-recent";
type Recent = { href: string; title: string };
function readRecent(): Recent[] {
  try { return (JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as Recent[]).filter((r) => r && typeof r.href === "string" && typeof r.title === "string").slice(0, 6); } catch { return []; }
}
function useRecordRecent(pathname: string) {
  useEffect(() => {
    if (!/^\/admin\/(clients|projects|money)\/[^/]+$/.test(pathname) || /\/(support|reconciliation|export)$/.test(pathname)) return;
    const t = window.setTimeout(() => {
      const title = document.title.replace(/\s*·\s*WDC Admin$/, "").trim();
      if (!title || title === "Admin") return;
      try {
        const next = [{ href: pathname, title }, ...readRecent().filter((r) => r.href !== pathname)].slice(0, 6);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch { /* a private window simply has no recents */ }
    }, 600);
    return () => window.clearTimeout(t);
  }, [pathname]);
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
  const role = useAdminRole();
  const recent = useMemo(() => (query.trim() ? [] : readRecent()), [query]);
  const q = encodeURIComponent(query.trim());
  const finds = [
    { href: `/admin/clients?q=${q}#client-list`, label: "Clients", Icon: Users, area: "clients" as const },
    { href: `/admin/projects?q=${q}#projects-table`, label: "Projects", Icon: FolderKanban, area: "projects" as const },
    { href: `/admin/money?q=${q}#invoice-list`, label: "Invoices", Icon: Banknote, area: "money" as const },
  ].filter((f) => can(role, f.area));

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
          {recent.length ? <p>Recently opened</p> : null}
          {recent.map((r) => (
            <Link key={r.href} href={r.href} onClick={onClose}><Search aria-hidden="true" /><span>{r.title}</span></Link>
          ))}
          {results.length ? results.map(({ href, label, Icon }) => (
            <Link key={href + label} href={href} onClick={onClose}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </Link>
          )) : null}
          {/* NOTHING IN THE MENU MATCHES: the words are probably a name or a
              number, so offer to look for them in the records this person
              can open, rather than a dead "no match". */}
          {!results.length && query.trim() ? (
            <>
              <p>No page is called that. Look for it in:</p>
              {finds.map(({ href, label, Icon }) => (
                <Link key={href} href={href} onClick={onClose}>
                  <Icon aria-hidden="true" /><span>{label} for “{query.trim()}”</span>
                </Link>
              ))}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export type ShellSupport = { name: string; expiresAt: string; minutes: number };

export default function AdminShell({ children, counts = {}, user, role = "owner", support }: { children: ReactNode; counts?: Record<string, number>; user: AdminUser; role?: AdminRole; support?: ShellSupport | null }) {
  return (
    <RoleContext.Provider value={role}>
      <SupportContext.Provider value={Boolean(support)}>
        <ShellFrame counts={counts} user={user} support={support ?? null}>{children}</ShellFrame>
      </SupportContext.Provider>
    </RoleContext.Provider>
  );
}

function ShellFrame({ children, counts, user, support }: { children: ReactNode; counts: Record<string, number>; user: AdminUser; support: ShellSupport | null }) {
  const path = usePathname();
  useRecordRecent(path);
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const drawer = useNavDrawer();
  const active = NAV.find((item) => isActive(item.href, path, item.also));
  const parent = parentOf(path);
  const visuallyCollapsed = pinnedCollapsed && !hoverExpanded;
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

  const topbar = (
    <header className="ad__topbar">
      {/* On a phone: the menu (the sidebar, in a drawer), then back to the
          page above or the mark on a section's front page. */}
      <MenuButton onClick={drawer.show} expanded={drawer.open} tour="mobile-menu" />
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
        <Notifications openForms={counts.Forms ?? 0} failedMail={counts.FailedMail ?? 0} inReview={counts.Blog ?? 0} unchecked={Boolean(counts.Unchecked)} />
        <span className="ad__topRule" aria-hidden="true" />
        <AccountMenu user={user} />
      </div>
    </header>
  );

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
        {support ? <div className="ad__stickTop"><SupportBar name={support.name} expiresAt={support.expiresAt} minutes={support.minutes} />{topbar}</div> : topbar}
        <main className="ad__main">{children}</main>
        <TableScroll />
        <ToastHost />
        <ConfirmHost />
      </div>

      <NavDrawer open={drawer.open} onClose={drawer.hide} label="Admin menu" tools={<ThemeButton />}>
        <Sidebar counts={counts} user={user} />
      </NavDrawer>
      {commandOpen ? <CommandPalette onClose={closeCommand} /> : null}
    </div>
  );
}
