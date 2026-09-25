import "server-only";

import { db } from "@/lib/db/pool";
import {
  audit, getMessages as memoryMessages, queueMessage as memoryQueue,
  retryMessage as memoryRetry, settleMessage as memorySettle, type QueueResult,
} from "@/lib/admin/store";
import type { Id, Message, MessageChannel, MessageState } from "@/lib/admin/types";

/**
 * The message log, kept in the database (migration 0013).
 *
 * Same contract the in-memory log had: a row is written before the provider is
 * called, one row per event (the dedupe key), then settled. What changed is
 * where it lives, so the log and its dedupe survive a cold start and are the
 * same on every server instance.
 *
 * THE MEMORY LOG IS THE FALLBACK, NOT A SECOND SOURCE. With no database
 * configured (a local checkout, a test run) or with the table not migrated yet,
 * a row goes to the in-memory log exactly as before, so a missing database
 * never costs a visitor their receipt. Reads merge both, newest first, so a row
 * written during a database outage is still somewhere a person can see it.
 */

const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
/* Ids from the in-memory log start with "m"; the table's are UUIDs. */
const isMemoryId = (id: string) => !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

type Row = {
  id: string; created_at: Date; channel: string; direction: string; to_addr: string; subject: string;
  summary: string; state: string; error: string | null; ms: string | number | null; sent_by: string;
  client_id: string | null; about: Message["about"] | null; dedupe_key: string;
  resends: Resend[] | null;
};

export type Resend = { at: string; to: string; by: string; sent: boolean; ms?: number; error?: string };
export type LoggedMessage = Message & { ms?: number; resends: Resend[] };

const toMessage = (r: Row): LoggedMessage => ({
  id: r.id, at: new Date(r.created_at).toISOString(),
  channel: r.channel as MessageChannel, direction: r.direction as Message["direction"],
  to: r.to_addr, subject: r.subject, summary: r.summary, state: r.state as MessageState,
  error: r.error ?? undefined, by: r.sent_by, clientId: r.client_id ?? undefined,
  about: r.about ?? undefined, dedupeKey: r.dedupe_key,
  ms: r.ms === null ? undefined : Number(r.ms),
  resends: Array.isArray(r.resends) ? r.resends : [],
});

const fromMemory = (m: Message): LoggedMessage => ({ ...m, resends: [] });

export type QueueInput = Parameters<typeof memoryQueue>[0];

/** Write the row, or say this event already has one. */
export async function queueLogged(d: QueueInput): Promise<QueueResult> {
  if (!configured()) return memoryQueue(d);
  const key = d.dedupeKey.trim();
  try {
    const inserted = await db.query<Row>(`
      INSERT INTO message_log (channel, direction, to_addr, subject, summary, state, error, sent_by, client_id, about, dedupe_key)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::JSONB, $11)
      ON CONFLICT (dedupe_key) DO NOTHING
      RETURNING *
    `, [
      d.channel, d.direction ?? "Outbound", d.to.trim(), d.subject.trim(), d.summary.trim(),
      d.state ?? "Queued", d.error?.trim().slice(0, 1000) || null, d.by?.trim() || "Studio",
      d.clientId ?? null, d.about ? JSON.stringify(d.about) : null, key,
    ]);
    if (inserted.rows[0]) return { ok: true, message: toMessage(inserted.rows[0]) };
    const seen = await db.query<Row>("SELECT * FROM message_log WHERE dedupe_key = $1", [key]);
    return { ok: false, reason: "duplicate", message: toMessage(seen.rows[0]) };
  } catch (error) {
    console.error("[message-log] database write failed; using the in-memory log:", error instanceof Error ? error.message : error);
    return memoryQueue(d);
  }
}

/** Queued -> Sent, Failed or Skipped, with the provider's time and words. */
export async function settleLogged(id: Id, state: Extract<MessageState, "Sent" | "Failed" | "Skipped">, error?: string, ms?: number) {
  if (isMemoryId(id)) return memorySettle(id, state, error);
  try {
    const r = await db.query(`
      UPDATE message_log SET state = $2, error = $3, ms = $4, settled_at = now() WHERE id = $1
    `, [id, state, error?.trim().slice(0, 1000) || null, ms ?? null]);
    return (r.rowCount ?? 0) > 0;
  } catch (e) {
    console.error("[message-log] could not settle", id, e instanceof Error ? e.message : e);
    return false;
  }
}

export async function listLogged(opts: {
  clientId?: Id; aboutIds?: readonly Id[]; state?: MessageState; limit?: number;
} = {}): Promise<LoggedMessage[]> {
  const { clientId, aboutIds, state, limit = 100 } = opts;
  const memory = memoryMessages({ clientId, aboutIds, state, limit }).map(fromMemory);
  if (!configured()) return memory;
  try {
    const where: string[] = [];
    const args: unknown[] = [];
    if (clientId) { args.push(clientId); where.push(`client_id = $${args.length}`); }
    if (state) { args.push(state); where.push(`state = $${args.length}`); }
    if (aboutIds) { args.push(aboutIds as string[]); where.push(`about->>'id' = ANY($${args.length})`); }
    args.push(limit);
    const r = await db.query<Row>(
      `SELECT * FROM message_log ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT $${args.length}`,
      args,
    );
    return [...r.rows.map(toMessage), ...memory]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit);
  } catch (error) {
    console.error("[message-log] read failed; showing the in-memory log only:", error instanceof Error ? error.message : error);
    return memory;
  }
}

/** Messages that did not go: the number worth a badge. */
export async function failedLoggedCount(): Promise<number> {
  const memory = memoryMessages({ state: "Failed", limit: 10_000 }).length;
  if (!configured()) return memory;
  try {
    const r = await db.query<{ n: string }>("SELECT count(*) AS n FROM message_log WHERE state = 'Failed'");
    return memory + Number(r.rows[0]?.n ?? 0);
  } catch (error) {
    console.error("[message-log] count failed:", error instanceof Error ? error.message : error);
    return memory;
  }
}

/**
 * A failed message cleared for another attempt. The failed row keeps its
 * words; its key is retired so the next attempt at the same event can write a
 * row of its own.
 */
export async function retryLogged(id: Id, actor = "Studio"): Promise<LoggedMessage | null> {
  if (isMemoryId(id)) {
    const m = memoryRetry(id, actor);
    return m ? fromMemory(m) : null;
  }
  try {
    const r = await db.query<Row>(`
      UPDATE message_log SET dedupe_key = dedupe_key || ':superseded:' || id::TEXT
      WHERE id = $1 AND state = 'Failed' AND dedupe_key NOT LIKE '%:superseded:%'
      RETURNING *
    `, [id]);
    const row = r.rows[0];
    if (!row) return null;
    const m = toMessage(row);
    audit({ actor, kind: "client", subjectId: m.clientId ?? m.id, subject: m.to, action: "queued a resend", note: m.subject });
    return m;
  } catch {
    return null;
  }
}

/** One resend, added to the row's trail (the last 20 are kept). */
export async function recordResend(id: Id, resend: Resend) {
  if (isMemoryId(id) || !configured()) return false;
  try {
    await db.query(`
      UPDATE message_log
      SET resends = (
        SELECT COALESCE(jsonb_agg(e ORDER BY n), '[]'::JSONB) FROM (
          SELECT e, n FROM jsonb_array_elements(resends || $2::JSONB) WITH ORDINALITY AS t(e, n)
          ORDER BY n DESC LIMIT 20
        ) kept
      )
      WHERE id = $1
    `, [id, JSON.stringify([resend])]);
    return true;
  } catch {
    return false;
  }
}

/** Every message about one record, found by its id at the end of the dedupe key. */
export async function listForRecord(id: string, limit = 30): Promise<LoggedMessage[]> {
  const memory = memoryMessages({ limit: 10_000 }).filter((m) => m.dedupeKey.endsWith(`:${id}`)).map(fromMemory);
  if (!configured()) return memory;
  try {
    const r = await db.query<Row>(
      "SELECT * FROM message_log WHERE dedupe_key LIKE $1 ORDER BY created_at DESC LIMIT $2",
      [`%:${id.replace(/[\\%_]/g, "")}`, limit],
    );
    return [...r.rows.map(toMessage), ...memory].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  } catch (error) {
    console.error("[message-log] record read failed:", error instanceof Error ? error.message : error);
    return memory;
  }
}
