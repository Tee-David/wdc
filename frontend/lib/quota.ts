import "server-only";

import { db } from "@/lib/db/pool";

/**
 * A shared counter for anything that spends money per call.
 *
 * THIS IS NOT lib/rate-limit.ts AND IT IS NOT A REPLACEMENT FOR IT. That one
 * is a speed bump held in one instance's memory: cheap, instant, and forgiving
 * of a cold start, which is exactly right for a contact form. This one costs a
 * round trip and survives everything, which is exactly right for a metered key.
 * Put the in-memory limiter in front for the burst, and this one behind it for
 * the bill. See `db/migrations/0005_rate_limit_counters.sql`.
 *
 * IT FAILS CLOSED, AND THAT IS THE POINT. If the database cannot be reached,
 * `consume` denies. Every other failure mode here ends with somebody else's
 * meter running and an invoice we did not agree to, so an outage must not
 * become an open tap. A caller that would rather degrade than deny is asking
 * for the wrong tool and should use the in-memory limiter.
 *
 * WHAT IT CANNOT DO. It counts attempts, not naira. If a provider charges
 * differently per endpoint, the cap has to be set against the most expensive
 * one, or each endpoint needs its own scope.
 */

export type QuotaResult =
  | { ok: true; used: number; remaining: number }
  | { ok: false; reason: "spent"; retryAfterSeconds: number }
  /* Told apart from "spent" on purpose. One means the tool did its job; the
     other means we could not tell, and the caller should say so rather than
     claiming a limit was reached. */
  | { ok: false; reason: "unavailable"; retryAfterSeconds: number };

export function quotaIsConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
}

/* Stale buckets are swept on roughly one call in two hundred rather than on a
   timer. A timer keeps a serverless instance awake; a sweep on every call
   costs more than the rows it reclaims. */
const SWEEP_ODDS = 200;
const SWEEP_AFTER_HOURS = 48;

async function sweep() {
  try {
    await db.query(
      `DELETE FROM rate_limit_counters
        WHERE updated_at < now() - ($1 || ' hours')::interval`,
      [String(SWEEP_AFTER_HOURS)],
    );
  } catch {
    /* Housekeeping. A sweep that fails costs disk, not correctness, and it
       must never turn into the answer a caller gets. */
  }
}

/**
 * Records one use of `bucket` and says whether it was within `limit`.
 *
 * The whole thing is one statement so that two instances racing cannot both
 * read 99 and both write 100. The window start is computed by the DATABASE
 * clock rather than the caller's, so instances with slightly different time do
 * not disagree about which window they are in.
 *
 * `hits` comes back as the count AFTER this attempt, so the attempt that takes
 * the count to `limit + 1` is the one refused. An attempt that is refused is
 * still counted, deliberately: a caller that keeps hammering a spent quota
 * keeps it spent rather than being handed a fresh allowance the moment they
 * stop.
 */
export async function consume(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<QuotaResult> {
  if (!quotaIsConfigured()) {
    return { ok: false, reason: "unavailable", retryAfterSeconds: windowSeconds };
  }

  try {
    const { rows } = await db.query<{ hits: number; window_start: Date }>(
      `INSERT INTO rate_limit_counters AS c (bucket, window_start, hits)
       VALUES (
         $1,
         to_timestamp(floor(extract(epoch FROM now()) / $2::bigint) * $2::bigint),
         1
       )
       ON CONFLICT (bucket) DO UPDATE
         SET hits = CASE
                      WHEN c.window_start = excluded.window_start THEN c.hits + 1
                      ELSE 1
                    END,
             window_start = excluded.window_start,
             updated_at = now()
       RETURNING hits, window_start`,
      [bucket, windowSeconds],
    );

    if (Math.random() * SWEEP_ODDS < 1) await sweep();

    const row = rows[0];
    /* A write that reports nothing back is not a write we can reason about,
       and guessing "allowed" here is the one guess that costs money. */
    if (!row) return { ok: false, reason: "unavailable", retryAfterSeconds: windowSeconds };

    const hits = Number(row.hits);
    if (hits <= limit) return { ok: true, used: hits, remaining: limit - hits };

    const endsAt = new Date(row.window_start).getTime() + windowSeconds * 1000;
    return {
      ok: false,
      reason: "spent",
      retryAfterSeconds: Math.max(1, Math.ceil((endsAt - Date.now()) / 1000)),
    };
  } catch {
    /* Deliberately not logged with the bucket: a bucket carries a caller's IP
       address, and an error path is the last place that should be the thing
       that writes one down. */
    return { ok: false, reason: "unavailable", retryAfterSeconds: windowSeconds };
  }
}

/**
 * Reads a bucket without spending anything.
 *
 * For a status line or an admin panel, never as a check before a `consume`:
 * reading and then writing is two statements and the gap between them is where
 * two instances both decide there is room for one more.
 */
export async function peek(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<{ used: number; remaining: number } | null> {
  if (!quotaIsConfigured()) return null;
  try {
    const { rows } = await db.query<{ hits: number }>(
      `SELECT hits FROM rate_limit_counters
        WHERE bucket = $1
          AND window_start = to_timestamp(
                floor(extract(epoch FROM now()) / $2::bigint) * $2::bigint)`,
      [bucket, windowSeconds],
    );
    const used = rows[0] ? Number(rows[0].hits) : 0;
    return { used, remaining: Math.max(0, limit - used) };
  } catch {
    return null;
  }
}
