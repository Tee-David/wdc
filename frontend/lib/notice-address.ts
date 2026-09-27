import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getAppSetting, setAppSetting } from "@/lib/app-settings";
import { SITE_URL } from "@/lib/site";

/**
 * A NEW "REPLIES GO TO" ADDRESS PROVES ITSELF BEFORE IT TAKES EFFECT.
 *
 * That address is where every studio notice goes (lib/email.ts
 * `studioInbox`): what clients wrote in an enquiry, a brief, a ticket. A typo
 * there sends them to a stranger. So a change is held as pending, a link goes
 * to the NEW address, and only opening it writes the setting. The token is 32
 * random bytes; only its SHA-256 is kept, so the settings row is not a way to
 * confirm. One pending change at a time: asking again replaces it.
 *
 * Going back to the default needs no proof, since it is an address already
 * trusted, and is applied at once.
 */

export const NOTICE_PENDING_KEY = "mail.replyTo.pending";
export const NOTICE_HOURS = 24;

export type PendingNotice = { to: string; hash: string; by: string; at: string; expires: string };

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function pendingNotice(): Promise<PendingNotice | null> {
  const p = await getAppSetting<PendingNotice | null>(NOTICE_PENDING_KEY, null);
  return p && typeof p === "object" && typeof p.hash === "string" && Date.parse(p.expires) > Date.now() ? p : null;
}

/** Hold `to` as pending and return the link to mail it. */
export async function holdNotice(to: string, by: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  await setAppSetting(NOTICE_PENDING_KEY, {
    to, hash: hash(token), by, at: new Date(now).toISOString(), expires: new Date(now + NOTICE_HOURS * 3_600_000).toISOString(),
  } satisfies PendingNotice, by);
  return new URL(`/confirm-notice-address?t=${encodeURIComponent(token)}`, SITE_URL).toString();
}

export async function dropNotice(by: string) {
  await setAppSetting(NOTICE_PENDING_KEY, null, by);
}

/**
 * The address a token confirms, or null. Fails closed: no pending change, an
 * expired one, or a token whose hash does not match is null.
 */
export async function matchNotice(token: string): Promise<PendingNotice | null> {
  if (!token || token.length > 100) return null;
  const p = await pendingNotice();
  if (!p) return null;
  const a = Buffer.from(hash(token), "hex");
  const b = Buffer.from(p.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b) ? p : null;
}
