"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { WdcMark } from "@/components/brand/logo";
import { useOptionalAdminTour } from "./tour/tour-provider";
import TourLauncher from "./tour/tour-launcher";
import { initialsOf } from "./focus";
import { ask } from "./confirm";
import "./side-kit.css";

/**
 * THE SIDEBAR AND THE PHONE DRAWER, as the approved kit draws them
 * (design/dashboards/kit/shell.html and kit.css): the round mark and the
 * studio's name, the menu with its line icons drawn on as it arrives and
 * counts on the icon, Support in a second group, and a foot pinned to the
 * bottom with the install card, Tour, the theme switch, collapse, and the
 * person signed in with Sign out. Shared by the admin and the client portal,
 * so the two cannot drift apart.
 */

/* The kit's own line drawings, so `pathLength` can draw them on. */
export const KIT_ICONS = {
  home: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  folder: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
  wallet: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",
  chart: "M3 3v18h18M7 16V9M12 16V5M17 16v-6",
  msg: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  pen: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
  gear: "M20 7h-9M14 17H5M17 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  life: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M4.93 19.07l4.24-4.24",
  card: "M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 10h20",
  compass: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z",
  moon: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41",
  phone: "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2",
  collapse: "M3 5h18v14H3zM9 5v14M15 10l-2 2 2 2",
  expand: "M3 5h18v14H3zM9 5v14M13 10l2 2-2 2",
  out: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  x: "M18 6 6 18M6 6l12 12",
} as const;
export type KitIconName = keyof typeof KIT_ICONS;

export function KitIcon({ name, size = 20, draw = false }: { name: KitIconName; size?: number; draw?: boolean }) {
  return (
    <svg className="adK__ic" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={KIT_ICONS[name]} pathLength={draw ? 1 : undefined} />
    </svg>
  );
}

export type KitTone = "brand" | "bad" | "warn" | "live";
export type KitNavLink = {
  href: string; label: string; icon: KitIconName; on: boolean; current: boolean;
  count?: number; tone?: KitTone; tour?: string;
  sub?: { href: string; label: string; on: boolean; current: boolean }[];
};

/** One group of the menu. In the drawer the count sits at the row's end; on the sidebar it sits on the icon. */
export function KitNav({ items, label, drawer = false, mini = false }: { items: KitNavLink[]; label: string; drawer?: boolean; mini?: boolean }) {
  return (
    <nav className="adK__nav" aria-label={label}>
      {items.map((n) => {
        const count = n.count && n.count > 0 ? (n.count > 99 ? "99+" : String(n.count)) : "";
        return (
          <div key={n.href} className="adK__navItem">
            <Link href={n.href} className={`adK__link adK__tip${n.on ? " on" : ""}`} data-tip={n.label} data-tour={n.tour}
              aria-current={n.current ? "page" : undefined} aria-label={count ? `${n.label}, ${count} waiting` : undefined}>
              <span className="adK__icWrap"><KitIcon name={n.icon} draw />{count && !drawer ? <span className={`adK__count adK__count--${n.tone ?? "brand"}`} aria-hidden="true">{count}</span> : null}</span>
              <span className="adK__lbl">{n.label}</span>
              {count && drawer ? <span className={`adK__tag adK__count--${n.tone ?? "brand"}`} aria-hidden="true">{count}</span> : null}
            </Link>
            {n.sub && n.on && !mini ? (
              <div className="adK__sub adK__lbl">
                {n.sub.map((s) => (
                  <Link key={s.href} href={s.href} className={`adK__subLink${s.on ? " on" : ""}`} aria-current={s.current ? "page" : undefined}>{s.label}</Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

/** The round mark and the name, the sidebar's head. */
export function KitBrand({ href, name, sub, label }: { href: string; name: string; sub?: string; label: string }) {
  return (
    <Link href={href} className="adK__brand" aria-label={label}>
      <span className="adK__mark"><WdcMark /></span>
      <span className="adK__lbl adK__brandText"><b>{name}</b>{sub ? <small>{sub}</small> : null}</span>
    </Link>
  );
}

/* ---------------------------------------------------------------- install */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const HIDE_KEY = "wdc:install-hidden";
const HIDE_DAYS = 30;
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as InstallEvent; listeners.forEach((f) => f()); });
  window.addEventListener("appinstalled", () => { deferred = null; listeners.forEach((f) => f()); });
}
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

/** Installable here: the browser offered it, or an iPhone that is not already running it from the home screen. */
function useInstall() {
  const offered = useSyncExternalStore(subscribe, () => deferred !== null, () => false);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIos(!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent));
      try { const at = Number(localStorage.getItem(HIDE_KEY) || 0); setHidden(Date.now() - at < HIDE_DAYS * 86_400_000); } catch { setHidden(false); }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  const hide = () => { setHidden(true); try { localStorage.setItem(HIDE_KEY, String(Date.now())); } catch { /* best effort */ } };
  return { show: !hidden && (offered || ios), offered, ios, hide };
}

export function InstallCard({ body, drawer = false }: { body: string; drawer?: boolean }) {
  const { show, offered, hide } = useInstall();
  const [busy, setBusy] = useState(false);
  const [howTo, setHowTo] = useState(false);
  if (!show) return null;
  const install = async () => {
    if (!offered || !deferred) { setHowTo(true); return; }
    setBusy(true);
    try { await deferred.prompt(); await deferred.userChoice; } finally { deferred = null; setBusy(false); listeners.forEach((f) => f()); }
  };
  const note = howTo ? "On iPhone: tap Share, then Add to Home Screen." : body;
  if (drawer) {
    return (
      <div className="adK__installRow">
        <button type="button" className="adK__btn2" onClick={install}><KitIcon name="phone" size={18} />Install the app</button>
        <button type="button" className="adK__ibtn adK__xBtn" aria-label="Hide the install prompt" onClick={hide}><KitIcon name="x" size={16} /></button>
        {howTo ? <p className="adK__installNote">{note}</p> : null}
      </div>
    );
  }
  return (
    <>
      <div className="adK__install adK__lbl">
        <button type="button" className="adK__xmini" aria-label="Hide the install card" onClick={hide}><KitIcon name="x" size={15} /></button>
        <span className="adK__installHead"><span className="adK__installTile"><KitIcon name="phone" size={18} /></span><strong>Get WDC on your phone</strong></span>
        {busy ? <><span className="adK__dim">Adding WDC to this device…</span><span className="adK__instBar"><span /></span></> : (
          <><span className="adK__dim">{note}</span><button type="button" className="adK__btn2" onClick={install}>Install app</button></>
        )}
      </div>
      <button type="button" className="adK__ibtn adK__railOnly adK__tip" data-tip="Install app" aria-label="Install app" onClick={install}><KitIcon name="phone" size={18} /></button>
    </>
  );
}

/* ------------------------------------------------------------------ foot */

let mountedOnce = false;
const onMount = (f: () => void) => { if (!mountedOnce) { mountedOnce = true; queueMicrotask(f); } return () => undefined; };

/** Tour, the theme switch and (on the sidebar) collapse. In the drawer: Tour this page and the theme with its name. */
export function FootRow({ drawer = false, onCollapse, onExpand, onTheme }: {
  drawer?: boolean; onCollapse?: () => void; onExpand?: () => void; onTheme?: (next: "light" | "dark") => void;
}) {
  const tours = useOptionalAdminTour();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(onMount, () => mountedOnce, () => false);
  const dark = mounted && resolvedTheme === "dark";
  const themeLabel = dark ? "Switch to light mode" : "Switch to dark mode";
  const toggle = () => { const next = dark ? "light" : "dark"; setTheme(next); onTheme?.(next); };
  return (
    <div className="adK__footRow">
      {tours && !tours.active ? (
        <TourLauncher foot={{ icon: <KitIcon name="compass" size={18} />, label: drawer ? "Tour this page" : "Tour", labelClass: drawer ? undefined : "adK__lbl" }} />
      ) : null}
      <button type="button" className="adK__footBtn adK__tip" data-tip={themeLabel} aria-label={themeLabel} onClick={toggle}>
        <KitIcon name={dark ? "sun" : "moon"} size={18} /><span className={drawer ? undefined : "adK__lbl"}>{drawer ? (dark ? "Light mode" : "Dark mode") : (dark ? "Light" : "Dark")}</span>
      </button>
      {!drawer && onCollapse ? (
        <button type="button" className="adK__footBtn adK__collapse adK__lbl adK__tip" data-tip="Collapse menu" aria-label="Collapse menu" onClick={onCollapse}><KitIcon name="collapse" size={18} /></button>
      ) : null}
      {!drawer && onExpand ? (
        <button type="button" className="adK__footBtn adK__railOnly adK__tip" data-tip="Expand menu" aria-label="Expand menu" onClick={onExpand}><KitIcon name="expand" size={18} /></button>
      ) : null}
    </div>
  );
}

/** Who is signed in, and Sign out (asked first, red on hover). In a support view it is Exit, asked nothing. */
export function ProfileCard({ user, role, onSignOut, signOutLabel = "Sign out", href }: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  role: string; onSignOut: () => void; signOutLabel?: string;
  /** Your account's settings: the name and photo open it. */
  href?: string;
}) {
  const out = async () => {
    if (signOutLabel !== "Sign out" || await ask("Sign out of WDC on this device? You will need your email and password to come back in. Drafts you have open are kept.", { verb: "Sign out" })) onSignOut();
  };
  return (
    <div className="adK__profile">
      <Link href={href ?? "#"} className="adK__me adK__tip" data-tip="Your account" aria-label={`Your account: ${user.name || role}`} onClick={href ? undefined : (e) => e.preventDefault()}>
        <span className="adK__av" aria-hidden="true">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" />
          ) : initialsOf(user, role)}
        </span>
        <span className="adK__lbl adK__who"><strong>{user.name || role}</strong><span>{role}</span></span>
      </Link>
      <button type="button" className="adK__ibtn adK__signOut adK__tip" data-tip={signOutLabel} aria-label={signOutLabel} onClick={out}><KitIcon name="out" size={18} /></button>
    </div>
  );
}
