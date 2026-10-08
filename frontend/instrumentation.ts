/**
 * Next calls this for every unhandled server error. One row per distinct error
 * per day (a counter, not a flood), with the message and the first stack lines.
 * It never throws and never waits on the database: logging an error must not
 * be able to cause one. Secrets are not read here; the message is trimmed.
 */
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routeType: string },
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!(process.env.DATABASE_URL || process.env.COCKROACHDB_URL)) return;
  try {
    const e = error as { message?: string; stack?: string; digest?: string };
    const message = String(e?.message ?? error).slice(0, 500);
    const digest = String(e?.digest ?? message).slice(0, 120);
    const stack = String(e?.stack ?? "").split("\n").slice(0, 8).join("\n").slice(0, 2000);
    const { randomUUID } = await import("node:crypto");
    const { db } = await import("@/lib/db/pool");
    await db.query(
      `INSERT INTO error_log (id, digest, message, stack, path, method, route_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (digest, day) DO UPDATE SET count = error_log.count + 1, last_at = now()`,
      [randomUUID(), digest, message, stack, String(request.path).slice(0, 300), request.method, context.routeType],
    );
  } catch { /* the log is best effort */ }
}
