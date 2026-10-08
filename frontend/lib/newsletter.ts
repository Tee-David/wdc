import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db/pool";
import { SITE_URL } from "@/lib/site";

/**
 * The newsletter list.
 *
 * SEPARATE FROM THE CONTACT FORM ON PURPOSE. An enquiry is a conversation
 * somebody started; a subscription is standing permission to write to them
 * whenever we choose. They have different rules, and the difference is the
 * unsubscribe: a person who asked us a question does not need one, a person on
 * a list always does. Sharing a table would have made that distinction a
 * column somebody eventually forgets to read.
 */

export type SubscribeResult =
  | { kind: "added" }
  /* On the list before, and came back after unsubscribing. Treated like a new
     subscriber for the welcome, and told "welcome back" rather than "already". */
  | { kind: "returned" }
  /* Already on the list and still subscribed. THE OWNER'S CALL (2026-10-05) is
     that the footer says so: "you are already subscribed" is the honest answer
     and the one a person expects. The cost is that the box can be used to ask
     whether an address is on the list, which is why the route keeps its
     3-in-10-minutes limit and the honeypot, and why this tells nobody anything
     else about the address (no name, no date, no source). */
  | { kind: "already" };

/**
 * Normalise for matching, never for sending.
 *
 * Case-folded and trimmed, and nothing else. Gmail's dot-and-plus rules are
 * deliberately NOT applied: `a.b@gmail.com` and `ab@gmail.com` do reach the
 * same inbox, but the same shapes at other providers are different people, and
 * a list that silently merges two strangers is worse than one that holds a
 * duplicate.
 */
export function normaliseEmail(raw: string) {
  return raw.trim().toLowerCase();
}

/**
 * A deliberately loose shape check, run BEFORE anything touches the database.
 *
 * There is no regular expression that matches the addresses RFC 5322 allows
 * and only those, and every attempt to write one rejects somebody's real
 * address. What this rules out is the typo and the paste accident: no @, no
 * dot after the @, whitespace in the middle, an absurd length. Whether the
 * mailbox exists is answered by mail arriving, not by a pattern.
 */
export function looksLikeEmail(value: string) {
  if (value.length < 6 || value.length > 254) return false;
  if (/\s/.test(value)) return false;
  const at = value.indexOf("@");
  if (at < 1 || at !== value.lastIndexOf("@")) return false;
  const domain = value.slice(at + 1);
  if (domain.length < 4 || !domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;
  return true;
}

export function newsletterIsConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
}

/**
 * Add an address, or bring a lapsed one back.
 *
 * ONE STATEMENT, NOT A READ THEN A WRITE. Two people submitting the same
 * address in the same second is the ordinary case for a footer form, and a
 * SELECT followed by an INSERT loses that race. The uniqueness rule is the
 * database's; `ON CONFLICT` makes the second submission idempotent rather than
 * a 500.
 *
 * WHICH OF THE THREE OUTCOMES HAPPENED is worked out from what came back
 * rather than from a second query: a row whose `created_at` equals its
 * `updated_at` was inserted just now, and a row that had an
 * `unsubscribed_at` before this statement ran is somebody coming back.
 */
export async function subscribe(
  emailAsTyped: string,
  source: string,
): Promise<SubscribeResult> {
  const email = normaliseEmail(emailAsTyped);
  /* THE PREVIOUS STATE IS READ IN THE SAME STATEMENT. `prev` sees the table as
     it was before the upsert, so a row that was unsubscribed is told apart from
     one that was merely present, which the upsert's own RETURNING cannot do
     (it hands back the NEW row, with `unsubscribed_at` already cleared). */
  const result = await db.query<{ created_at: Date; updated_at: Date; was_unsubscribed: boolean }>(
    `
    WITH prev AS (
      SELECT unsubscribed_at FROM newsletter_subscribers WHERE email = $1
    ), up AS (
      INSERT INTO newsletter_subscribers (email, email_as_typed, source)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE
        SET unsubscribed_at = NULL,
            updated_at = now(),
            /* The address they last typed wins, so a corrected capitalisation is
               not frozen at first signup. The SOURCE is not overwritten: where
               somebody first found us is a fact about that moment, not this one. */
            email_as_typed = EXCLUDED.email_as_typed
      RETURNING created_at, updated_at
    )
    SELECT up.created_at, up.updated_at,
           COALESCE((SELECT unsubscribed_at IS NOT NULL FROM prev), false) AS was_unsubscribed
    FROM up
    `,
    [email, emailAsTyped.trim().slice(0, 254), source],
  );

  const row = result.rows[0];
  if (!row) return { kind: "already" };
  /* WHICH ONE HAPPENED, READ OFF THE TIMESTAMPS AND THE PREVIOUS STATE. The
     obvious way to ask Postgres this is `RETURNING (xmax = 0)`, and it is wrong
     twice over here: CockroachDB does not expose the MVCC system columns at
     all, and RETURNING on a DO UPDATE hands back the NEW row.
     Both columns default to `now()`, which inside one statement is a single
     transaction timestamp -- so a row whose `created_at` still equals its
     `updated_at` was inserted by this statement. */
  if (row.created_at.getTime() === row.updated_at.getTime()) return { kind: "added" };
  return row.was_unsubscribed ? { kind: "returned" } : { kind: "already" };
}

/* ------------------------------------------------------- unsubscribing */


/**
 * The secret the unsubscribe links are signed with. `UNSUBSCRIBE_SECRET` when
 * set, otherwise the auth secret with this purpose mixed in, so a link signed
 * for unsubscribing is useless for anything else. None at all means no link:
 * the email falls back to the reply-to-unsubscribe address, which is honest,
 * rather than a link anybody could forge.
 */
function unsubscribeSecret() {
  return process.env.UNSUBSCRIBE_SECRET?.trim() || process.env.BETTER_AUTH_SECRET?.trim() || "";
}

function sign(email: string, secret: string) {
  return createHmac("sha256", secret).update(`newsletter-unsubscribe:${email}`).digest("base64url").slice(0, 32);
}

/** The one-click link for this address, or null when links cannot be signed. */
export function unsubscribeUrl(email: string): string | null {
  const secret = unsubscribeSecret();
  const normal = normaliseEmail(email);
  if (!secret || !normal) return null;
  const url = new URL("/unsubscribe", SITE_URL);
  url.searchParams.set("e", normal);
  url.searchParams.set("t", sign(normal, secret));
  return url.toString();
}

/** Whether a link's token is the one this address was given. Fails closed. */
export function unsubscribeTokenValid(email: string, token: string) {
  const secret = unsubscribeSecret();
  const normal = normaliseEmail(email);
  if (!secret || !normal || !token) return false;
  const a = Buffer.from(sign(normal, secret));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Take an address off the list. Returns false when it was not on it. */
export async function unsubscribe(email: string): Promise<boolean> {
  const normal = normaliseEmail(email);
  if (!normal) return false;
  const r = await db.query(
    "UPDATE newsletter_subscribers SET unsubscribed_at = now(), updated_at = now() WHERE email = $1 AND unsubscribed_at IS NULL",
    [normal],
  );
  /* The same fact on the person record and the suppression list (Email page), if they exist yet. */
  let known = (r.rowCount ?? 0) > 0;
  try {
    const contacts = await import("@/lib/contacts");
    /* A client marked as having asked to hear from us is not on the newsletter table, but can still unsubscribe. */
    if (!known) known = Boolean((await db.query(`SELECT 1 FROM contacts WHERE email = $1 AND status = 'subscribed'`, [normal])).rowCount);
    if (known) await contacts.suppress(normal, "unsubscribed", "unsubscribed from an email");
  } catch { /* tables arrive with migration 0045 */ }
  return known;
}

/**
 * Addresses from a CSV, added to the list without a welcome email.
 *
 * NOT A WAY TO SUBSCRIBE PEOPLE WHO DID NOT ASK. It is for moving a list the
 * studio already had permission for (from an old tool, an event sign-up
 * sheet). The first cell in each row that looks like an address is taken;
 * everything else in the file is ignored. Somebody who unsubscribed is NOT
 * put back: leaving is their decision, and an import must not undo it.
 */
export async function importSubscribers(csv: string): Promise<{ added: number; skipped: number; invalid: number }> {
  const found: string[] = [];
  let invalid = 0;
  for (const line of csv.split(/\r?\n/).slice(0, 20_000)) {
    const cells = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    const cell = cells.find((c) => c.includes("@"));
    if (!cell) continue;
    if (!looksLikeEmail(cell)) { invalid += 1; continue; }
    found.push(normaliseEmail(cell));
  }
  /* Somebody who asked to be erased is not put back by a list somebody kept. */
  const { erasedHashes, hashEmail } = await import("@/lib/privacy/requests");
  const erased = await erasedHashes([...new Set(found)]);
  const unique = [...new Set(found)].filter((e) => !erased.has(hashEmail(e)));
  let added = 0;
  for (let i = 0; i < unique.length; i += 500) {
    const batch = unique.slice(i, i + 500);
    const r = await db.query(
      `INSERT INTO newsletter_subscribers (email, email_as_typed, source)
       SELECT e, e, 'import' FROM unnest($1::TEXT[]) AS e
       ON CONFLICT (email) DO NOTHING`,
      [batch],
    );
    added += r.rowCount ?? 0;
  }
  return { added, skipped: unique.length - added + erased.size, invalid };
}
