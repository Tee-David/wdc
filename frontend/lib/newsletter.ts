import "server-only";

import { db } from "@/lib/db/pool";

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
  /* Not an error, and deliberately NOT distinguished to the visitor. Telling
     somebody "that address is already subscribed" turns a public box into a
     way of asking whether a given person is on our list. Both answers look
     identical from outside; the difference only decides whether the studio
     gets told. */
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
  const result = await db.query<{ created_at: Date; updated_at: Date }>(
    `
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
    `,
    [email, emailAsTyped.trim().slice(0, 254), source],
  );

  const row = result.rows[0];
  if (!row) return { kind: "already" };
  /* WHICH ONE HAPPENED, READ OFF THE TIMESTAMPS. The obvious way to ask
     Postgres this is `RETURNING (xmax = 0)`, and it is wrong twice over here:
     CockroachDB does not expose the MVCC system columns at all, and RETURNING
     on a DO UPDATE hands back the NEW row, so anything the update just wrote
     reads as though it was always that way.
     Both columns default to `now()`, which inside one statement is a single
     transaction timestamp -- so a row whose `created_at` still equals its
     `updated_at` is one this statement inserted, and any other row already
     existed. */
  return row.created_at.getTime() === row.updated_at.getTime()
    ? { kind: "added" }
    : { kind: "already" };
}
