"use client";

import { TopChoresSlot } from "./top-chores";
import { SheetDrag } from "@/components/admin/sheet-drag";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  ClipboardList,
  Newspaper,
  Search,
  X,
} from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { can, NAV_AREA, type AdminRole } from "@/lib/admin/permissions";
import { WdcMark } from "@/components/brand/logo";
import TableScroll from "./table-scroll";
import { MenuButton, NavDrawer, useNavDrawer } from "./nav-drawer";
import { FootRow, InstallCard, KitBrand, KitIcon, KitNav, ProfileCard, type KitIconName, type KitNavLink } from "./side-kit";
import { keepFocusInside } from "./focus";
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
  icon: KitIconName;
  group: "main" | "general";
  tour: string;
  sub?: NavSub[];
  also?: string[];
  /* Paths that match `href` by prefix but live under another item. */
  exclude?: string[];
};

/* Sub-pages appear under their section only while you are in it, and only
   pages that exist: a link to a screen that has not been built is a lie
   with a hover state. */
const NAV: NavItem[] = [
  { href: "/admin", label: "Today", icon: "home", group: "main", tour: "nav-dashboard" },
  /* Support sits in its own group below, so Clients must not light up on its pages. */
  { href: "/admin/clients", label: "Clients", icon: "users", group: "main", tour: "nav-clients", exclude: ["/admin/clients/support"] },
  {
    href: "/admin/projects", label: "Projects", icon: "folder", group: "main", tour: "nav-projects",
    sub: [
      { href: "/admin/projects", label: "All projects" },
      /* Reviews and handovers are meetings about a project. */
      { href: "/admin/meetings", label: "Meetings" },
    ],
    also: ["/admin/meetings"],
  },
  {
    href: "/admin/money", label: "Money", icon: "wallet", group: "main", tour: "nav-money",
    sub: [
      { href: "/admin/money", label: "Invoices and spend" },
      { href: "/admin/money/reconciliation", label: "Reconciliation" },
    ],
  },
  /* The books and the work, filtered and exportable. Owner only, like Money. */
  { href: "/admin/reports", label: "Reports", icon: "chart", group: "main", tour: "nav-reports" },
  /* Client questions and project channels in one list, for the owner and staff alike; each thread is scoped on the server. */
  { href: "/admin/messages", label: "Messages", icon: "msg", group: "main", tour: "nav-messages" },
  /* Campaigns, the calendar of sends, automations, templates and contacts. */
  { href: "/admin/email", label: "Marketing", icon: "mail", group: "main", tour: "nav-email" },
  /* Enquiries, the forms that collect them, subscribers and pre-filled links. */
  { href: "/admin/forms", label: "Forms", icon: "inbox", group: "main", tour: "nav-forms" },
  /* Posts are written weekly, which is not an "infrequent control" to bury under Settings. */
  {
    href: "/admin/blog", label: "Blog", icon: "pen", group: "main", tour: "nav-blog",
    sub: [
      { href: "/admin/blog", label: "Posts" },
      { href: "/admin/blog/work", label: "Case studies" },
    ],
  },
  /* No sub-links here: Settings carries its own section menu on the page
     (lib/settings/sections.ts). The team and its permissions are a section of
     it, so the Users pages belong to Settings and keep it lit. */
  { href: "/admin/settings", label: "Settings", icon: "gear", group: "main", tour: "nav-settings", also: ["/admin/users"] },
  { href: "/admin/clients/support", label: "Support", icon: "life", group: "general", tour: "nav-support" },
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
  /* Staff open to their own day, and their Support is the team's help centre (Ask Admin), not the client questions. */
  return useMemo(() => NAV.filter((item) => allowed(role, item.href)).map((item) => (role === "staff" && item.href === "/admin" ? { ...item, label: "My Day" } : role === "staff" && item.href === "/admin/clients/support" ? { ...item, href: "/admin/help" } : item)), [role]);
}
const ROLE_LABEL: Record<string, string> = { owner: "Owner", staff: "Staff" };

const SIDEBAR_KEY = "wdc:admin-sidebar-collapsed";
function isActive(href: string, path: string, also: string[] = [], exclude: string[] = []) {
  if (exclude.some((h) => path === h || path.startsWith(h + "/"))) return false;
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
  user,
  drawer = false,
  onClose,
  onExpand,
}: {
  collapsed?: boolean;
  counts?: Record<string, number>;
  onTogglePin?: () => void;
  user: AdminUser;
  /** The phone drawer: a head with the close cross, counts at the row's end, Tour this page and the theme by name. */
  drawer?: boolean;
  onClose?: () => void;
  /** The rail's expand button: widen a collapsed sidebar, or open the menu as a drawer on a tablet. */
  onExpand?: () => void;
}) {
  const path = usePathname();
  const router = useRouter();
  const support = useContext(SupportContext);
  const nav = useNav();
  const role = useAdminRole();
  const link = (item: NavItem): KitNavLink => {
    const on = isActive(item.href, path, item.also, item.exclude);
    const current = activeSub(item, path);
    return {
      href: item.href, label: item.label, icon: item.icon, on, current: path === item.href, tour: item.tour,
      count: counts?.[item.label] ?? 0, tone: item.label === "Money" ? "bad" : "brand",
      sub: item.sub?.filter((s) => allowed(role, s.href)).map((s) => ({ href: s.href, label: s.label, on: current === s.href, current: path === s.href })),
    };
  };
  const main = nav.filter((item) => item.group === "main").map(link);
  const general = nav.filter((item) => item.group === "general").map(link);
  const brand = <KitBrand href="/admin" name="WDC Studio" sub={ROLE_LABEL[role] ?? "Admin"} label="WDC admin dashboard" />;
  const foot = (
    <div className="adK__foot" data-tour="sidebar-foot">
      <InstallCard drawer={drawer} body="Open WDC from your home screen, like an app." />
      <FootRow drawer={drawer} onCollapse={drawer ? undefined : onTogglePin} onExpand={drawer ? undefined : onExpand} />
      <ProfileCard user={user} role={ROLE_LABEL[role] ?? "Admin"} href="/admin/settings/account" signOutLabel={support ? "Exit support view" : "Sign out"} onSignOut={() => signOut(router, support)} />
    </div>
  );
  if (drawer) {
    return (
      <div className="adK adK--drawer">
        <div className="adK__drawHead">
          {brand}
          <button type="button" className="adK__ibtn adK__xBtn" aria-label="Close the menu" onClick={onClose}><KitIcon name="x" size={18} /></button>
        </div>
        <div className="adK__scroll" data-lenis-prevent>
          <KitNav items={main} label="Admin sections" drawer />
          {general.length ? <KitNav items={general} label="Help" drawer /> : null}
        </div>
        {foot}
      </div>
    );
  }
  return (
    <div className={`adK${collapsed ? " is-mini" : ""}`}>
      {brand}
      {/* The menu scrolls; the foot below it never moves. */}
      <div className="adK__scroll" data-lenis-prevent>
        <KitNav items={main} label="Admin sections" mini={collapsed} />
        {general.length ? <KitNav items={general} label="Help" mini={collapsed} /> : null}
      </div>
      {foot}
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
      { href: item.href, label: item.label, icon: item.icon },
      ...(item.sub ?? []).filter((s) => s.href !== item.href).map((s) => ({ href: s.href, label: s.label, icon: item.icon })),
    ]);
    return pages.filter((item) => !needle || item.label.toLowerCase().includes(needle));
  }, [query, nav]);
  const role = useAdminRole();
  const recent = useMemo(() => (query.trim() ? [] : readRecent()), [query]);
  const q = encodeURIComponent(query.trim());
  const finds = [
    { href: `/admin/clients?q=${q}#client-list`, label: "Clients", icon: "users" as KitIconName, area: "clients" as const },
    { href: `/admin/projects?q=${q}#projects-table`, label: "Projects", icon: "folder" as KitIconName, area: "projects" as const },
    { href: `/admin/money?q=${q}#invoice-list`, label: "Invoices", icon: "wallet" as KitIconName, area: "money" as const },
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
          {results.length ? results.map(({ href, label, icon }) => (
            <Link key={href + label} href={href} onClick={onClose}>
              <KitIcon name={icon} size={16} /><span>{label}</span>
            </Link>
          )) : null}
          {/* NOTHING IN THE MENU MATCHES: the words are probably a name or a
              number, so offer to look for them in the records this person
              can open, rather than a dead "no match". */}
          {!results.length && query.trim() ? (
            <>
              <p>No page is called that. Look for it in:</p>
              {finds.map(({ href, label, icon }) => (
                <Link key={href} href={href} onClick={onClose}>
                  <KitIcon name={icon} size={16} /><span>{label} for “{query.trim()}”</span>
                </Link>
              ))}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export type ShellSupport = { name: string; actorName: string };

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
  const [commandOpen, setCommandOpen] = useState(false);
  const drawer = useNavDrawer();
  const nav = useNav();
  const active = nav.find((item) => isActive(item.href, path, item.also, item.exclude));
  const parent = parentOf(path);
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
        <Notifications openForms={counts.Forms ?? 0} failedMail={counts.FailedMail ?? 0} inReview={counts.Blog ?? 0} unchecked={Boolean(counts.Unchecked)} />
        <TopChoresSlot />
      </div>
    </header>
  );

  return (
    <div className={`ad__wrap${pinnedCollapsed ? " is-collapsed" : ""}`}>
      <SheetDrag />
      <aside className="ad__side" aria-label="Main">
        <Sidebar collapsed={pinnedCollapsed} counts={counts} onTogglePin={togglePin} onExpand={() => (pinnedCollapsed ? togglePin() : drawer.show())} user={user} />
      </aside>

      <div className="ad__column">
        {support ? <div className="ad__stickTop"><SupportBar name={support.name} actorName={support.actorName} />{topbar}</div> : topbar}
        <main className="ad__main">{children}</main>
        <TableScroll />
        <ToastHost />
        <ConfirmHost />
      </div>

      <NavDrawer open={drawer.open} onClose={drawer.hide} label="Admin menu">
        <Sidebar drawer counts={counts} user={user} onClose={drawer.hide} />
      </NavDrawer>
      {commandOpen ? <CommandPalette onClose={closeCommand} /> : null}
    </div>
  );
}
