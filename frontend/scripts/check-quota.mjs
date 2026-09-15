/**
 * Proves the shared counter against a REAL database.
 *
 * WHY THIS IS NOT A PLAYWRIGHT SPEC. Nothing here has a browser in it, and the
 * one property that matters cannot be observed through a page: that two
 * requests arriving at the same instant both get counted. That is a statement
 * property, and the only way to know it holds is to fire a burst at the
 * database the application will actually run on.
 *
 * WHY THE BURST IS THE WHOLE POINT. The failure this counter exists to prevent
 * is the lost update: two instances read 99, both decide there is room, both
 * write 100, and one paid lookup is spent without ever being counted. Run
 * enough of those and a daily cap of 500 lets through considerably more than
 * 500. The `concurrent` case below is that scenario; it passes only if every
 * one of the parallel hits came back with its own distinct number.
 *
 *   npm run db:check-quota
 *
 * Needs COCKROACHDB_URL (or DATABASE_URL) and migration 0005 applied. It
 * writes and deletes buckets under the `selftest:` prefix and touches nothing
 * else.
 */
import { pool } from "./cockroach-client.mjs";

const HITS = 200;
const PREFIX = "selftest:quota:";

/* The statement lib/quota.ts sends, character for character. A check running
   its own convenient variant of the query proves nothing about the one that
   ships. */
const CONSUME = `INSERT INTO rate_limit_counters AS c (bucket, window_start, hits)
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
       RETURNING hits, window_start`;

const db = pool();
let failures = 0;

function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

const hit = async (bucket, windowSeconds) =>
  (await db.query(CONSUME, [PREFIX + bucket, windowSeconds])).rows[0];

try {
  await db.query("DELETE FROM rate_limit_counters WHERE bucket LIKE $1", [`${PREFIX}%`]);

  /* 1. It counts. */
  const seq = [];
  for (let n = 0; n < 5; n += 1) seq.push(Number((await hit("seq", 3600)).hits));
  report("counts up in order", seq.join(",") === "1,2,3,4,5", seq.join(","));

  /* 2. IT DOES NOT LOSE UPDATES. The one that matters. */
  const burst = (await Promise.all(Array.from({ length: HITS }, () => hit("race", 3600))))
    .map((row) => Number(row.hits))
    .sort((a, b) => a - b);
  const distinct = new Set(burst).size;
  report(
    `${HITS} at once are counted exactly once each`,
    distinct === HITS && burst[burst.length - 1] === HITS,
    `distinct=${distinct} highest=${burst[burst.length - 1]}`,
  );

  /* 3. A new window starts over, in place, with no scheduled job and no second
        row left behind for the old one. */
  const before = Number((await hit("roll", 1)).hits);
  await new Promise((resolve) => setTimeout(resolve, 1300));
  const after = Number((await hit("roll", 1)).hits);
  const { rows: kept } = await db.query(
    "SELECT count(*)::int AS n FROM rate_limit_counters WHERE bucket = $1",
    [`${PREFIX}roll`],
  );
  report("a new window resets the count", before === 1 && after === 1, `${before} then ${after}`);
  report("and leaves one row, not one per window", kept[0].n === 1, `rows=${kept[0].n}`);

  /* 4. Windows are aligned to the clock, not to whenever a caller first
        arrived, so every instance agrees which window it is in. */
  const a = (await hit("align:a", 60)).window_start.getTime();
  const b = (await hit("align:b", 60)).window_start.getTime();
  report("windows are aligned across buckets", a === b, new Date(a).toISOString());

  /* 5. The sweep reclaims a bucket nobody has touched, and only that one. */
  await db.query(
    `INSERT INTO rate_limit_counters (bucket, window_start, hits, updated_at)
     VALUES ($1, now(), 1, now() - interval '72 hours')
     ON CONFLICT (bucket) DO UPDATE SET updated_at = now() - interval '72 hours'`,
    [`${PREFIX}stale`],
  );
  const swept = await db.query(
    `DELETE FROM rate_limit_counters
      WHERE bucket LIKE $2 AND updated_at < now() - ($1 || ' hours')::interval`,
    ["48", `${PREFIX}%`],
  );
  report("the sweep reclaims only stale buckets", swept.rowCount === 1, `removed=${swept.rowCount}`);

  await db.query("DELETE FROM rate_limit_counters WHERE bucket LIKE $1", [`${PREFIX}%`]);
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
} finally {
  await db.end();
}

process.exit(failures ? 1 : 0);
