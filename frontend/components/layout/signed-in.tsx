"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

export type SiteUser = { name: string; email: string; image: string | null };

/* One question per page load, shared by every caller on it. */
let asked: Promise<SiteUser | null> | null = null;

function ask(): Promise<SiteUser | null> {
  asked ??= fetch("/api/auth/get-session", { credentials: "same-origin", headers: { accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { user?: { name?: string; email?: string; image?: string | null } } | null) =>
      d?.user?.email ? { name: d.user.name || d.user.email, email: d.user.email, image: d.user.image ?? null } : null)
    .catch(() => null);
  return asked;
}

/**
 * WHO IS SIGNED IN, for the public site's header. Asked once the browser is
 * idle, so it never competes with the page's first paint, and answered as
 * null for everybody who is not: the header then says "Log in" exactly as it
 * did before. The session cookie is httpOnly, so asking is the only honest way
 * to know.
 */
export function useSiteUser() {
  const [user, setUser] = useState<SiteUser | null>(null);
  useEffect(() => {
    let live = true;
    const run = () => { void ask().then((u) => { if (live) setUser(u); }); };
    /* Safari has no requestIdleCallback; a short timeout stands in. */
    const idle = typeof window.requestIdleCallback === "function";
    const id = idle ? window.requestIdleCallback(run, { timeout: 2500 }) : window.setTimeout(run, 600);
    return () => {
      live = false;
      if (idle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);
  return user;
}

export function initials(name: string) {
  return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

/* Signing out throws the whole document away, for the reason written at
   components/auth/sign-out-button.tsx: the router's cache holds pages
   rendered for somebody signed in. The auth client is loaded on the click,
   so the public site does not carry it for everybody else. */
async function signOut() {
  try {
    const { authClient } = await import("@/lib/auth-client");
    await authClient.signOut();
  } finally {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }
}

/**
 * The signed-in row at the foot of the phone menu: who you are, and a way
 * out. The dashboard is not here: it is the last item in the menu's own
 * list, since it is a place like every other item there.
 *
 * LOG OUT IS RED, the one labelled control on the public site outside the
 * black and white pair (see AGENTS.md), at the owner's request: it is the
 * action nobody should take by accident, and it should read as that at a
 * glance. #c62828 under a white label measures 5.6:1.
 */
export function MenuAccount({ user }: { user: SiteUser }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="sm-account">
      <span className="sm-account__av" aria-hidden="true">
        {user.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={user.image} alt="" />
          : initials(user.name)}
      </span>
      <span className="sm-account__who">
        <b>{user.name}</b>
        <small>{user.email}</small>
      </span>
      <button type="button" className="sm-account__out" disabled={busy} onClick={() => { setBusy(true); void signOut(); }}>
        <LogOut aria-hidden="true" /> {busy ? "Signing out…" : "Log out"}
      </button>
    </div>
  );
}
