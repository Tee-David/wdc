import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db/pool";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * MAINTENANCE MODE: the public site answers 503 while the studio works on it.
 *
 * Read by `proxy.ts` on public requests, so it has to be cheap: the setting
 * is held in memory for 30 seconds per instance, which is one primary-key
 * read per instance per half minute rather than one per request. Switching
 * it on or off takes effect within that half minute everywhere.
 *
 * NEVER IN THE WAY OF: the admin, the portal, signing in, every /api route
 * (the Paystack webhook among them), /pay, /i, /r and /q (money a client is
 * in the middle of), /unsubscribe, and static files. That list is the
 * proxy's matcher, not a condition here, so there is no code path that can
 * forget it.
 *
 * WHO STILL SEES THE SITE: anybody holding the pass cookie. An owner or
 * member of staff gets one from /api/maintenance/pass, and a reviewer from
 * the share link on Site and SEO. The pass is signed over the moment
 * maintenance was switched on, so switching it off and on again retires
 * every pass and link given out before.
 */

export const MAINTENANCE_KEY = "site.maintenance";
export const PASS_COOKIE = "wdc.site_pass";
export type Maintenance = { on: boolean; since?: string; by?: string; message?: string; backBy?: string };

const TTL = 30_000;
const held = globalThis as typeof globalThis & { __wdcMaintenance?: { at: number; value: Maintenance } };
const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);

/** The current setting. A database that does not answer means "off": the site stays up. */
export async function maintenance(opts: { fresh?: boolean } = {}): Promise<Maintenance> {
  const h = held.__wdcMaintenance;
  if (!opts.fresh && h && Date.now() - h.at < TTL) return h.value;
  let value: Maintenance = { on: false };
  if (configured()) {
    try {
      const r = await db.query<{ value: Maintenance }>("SELECT value FROM app_settings WHERE key = $1", [MAINTENANCE_KEY]);
      const v = r.rows[0]?.value;
      if (v && v.on === true && typeof v.since === "string") value = v;
    } catch { /* stays off */ }
  }
  held.__wdcMaintenance = { at: Date.now(), value };
  return value;
}

/** Forget the held value on this instance, after a change made here. */
export function forgetMaintenance() {
  delete held.__wdcMaintenance;
}

const secret = () => process.env.BETTER_AUTH_SECRET || "";

function sign(kind: "pass" | "link", since: string) {
  return createHmac("sha256", secret()).update(`maintenance-${kind}:${since}`).digest("base64url").slice(0, 43);
}

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** The cookie value that lets its holder through. Null without a secret: nobody bypasses. */
export function passFor(m: Maintenance): string | null {
  return secret() && m.since ? sign("pass", m.since) : null;
}

export function passValid(m: Maintenance, value: string | undefined): boolean {
  const want = passFor(m);
  return Boolean(want && value && same(value, want));
}

/** The reviewer's link token. */
export function linkToken(m: Maintenance): string | null {
  return secret() && m.since ? sign("link", m.since) : null;
}

export function linkValid(m: Maintenance, token: string | null): boolean {
  const want = linkToken(m);
  return Boolean(want && token && same(token, want));
}

/** Seconds until the studio said it would be back, for Retry-After; an hour if it did not say. */
export function retryAfter(m: Maintenance): number {
  const back = m.backBy ? Date.parse(m.backBy) : NaN;
  const s = Number.isNaN(back) ? 3600 : Math.round((back - Date.now()) / 1000);
  return Math.min(Math.max(s, 120), 86_400);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/**
 * The page a visitor gets: the template chosen in Settings, Site
 * (lib/maintenance-page), drawn with this maintenance's message and time.
 *
 * IF THAT FAILS, THE PLAIN PAGE BELOW. A template that throws, or a settings
 * read that does, must never turn a holding page into an error page, so the
 * fallback has no dependencies at all.
 */
export async function maintenancePage(m: Maintenance): Promise<string> {
  try {
    const { maintenanceDesign, renderMaintenancePage } = await import("@/lib/maintenance-page/render");
    return await renderMaintenancePage({ m, design: await maintenanceDesign() });
  } catch (error) {
    console.error("Maintenance template failed; serving the plain page", error instanceof Error ? error.message : "unknown error");
    return plainPage(m);
  }
}

/**
 * The plain page. Its own inline styles, no fonts, no script: it must work
 * whatever else is broken. Navy ground, white type, orange only as a rule.
 */
export function plainPage(m: Maintenance): string {
  const message = m.message?.trim() || "We are making some changes to the site and will be back shortly.";
  const back = m.backBy && !Number.isNaN(Date.parse(m.backBy))
    ? `<p class="s">Expected back by ${esc(new Date(m.backBy).toLocaleString("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }))}, Lagos time.</p>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Back shortly | We Dig Creativity</title><style>
html,body{margin:0;height:100%}body{display:grid;place-items:center;background:#000065;color:#fff;font:400 1.05rem/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:1rem}
main{max-width:34rem}h1{font:700 clamp(1.8rem,5vw,2.6rem)/1.15 system-ui,sans-serif;margin:0 0 .8rem}i{display:block;width:3rem;height:4px;background:#ff6500;margin-bottom:1.2rem}.s{opacity:.85;font-size:.95rem}a{color:#fff}
</style></head><body><main><i></i><h1>Back shortly</h1><p>${esc(message)}</p>${back}<p class="s">Need us now? <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p></main></body></html>`;
}
