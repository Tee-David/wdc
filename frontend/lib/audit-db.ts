import "server-only";

import { db } from "@/lib/db/pool";
import { auditSettled, memoryAudit, unsavedAudit } from "@/lib/admin/store";
import { AUDIT_KINDS, type AuditEntry, type AuditKind } from "@/lib/admin/types";

/**
 * The audit log, kept in the database (migration 0021).
 *
 * `audit()` in lib/admin/store.ts still writes the in-memory copy first and
 * calls `persistAudit` behind it; this file is where the rows go and where
 * every screen reads them from. With no database, or with the table not
 * migrated yet, reads fall back to memory, so the log is never blank because
 * of a missing database. Entries that failed to insert are merged in, newest
 * first, so a change made during an outage is still visible here.
 */

const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);

type Row = {
  id: string; at: Date; actor: string; kind: string; subject_id: string; subject: string;
  action: string; field: string | null; from_value: string | null; to_value: string | null; note: string | null;
};

const toEntry = (r: Row): AuditEntry => ({
  id: r.id, at: new Date(r.at).toISOString(), actor: r.actor, kind: r.kind as AuditKind,
  subjectId: r.subject_id, subject: r.subject, action: r.action,
  field: r.field ?? undefined, from: r.from_value ?? undefined, to: r.to_value ?? undefined, note: r.note ?? undefined,
});

export async function persistAudit(e: AuditEntry) {
  const cut = (v: string | undefined, n: number) => (v === undefined ? null : v.slice(0, n));
  await db.query(
    `INSERT INTO audit_log (at, actor, kind, subject_id, subject, action, field, from_value, to_value, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [e.at, e.actor.slice(0, 200), e.kind, e.subjectId, e.subject.slice(0, 300), e.action.slice(0, 300),
      cut(e.field, 120), cut(e.from, 2000), cut(e.to, 2000), cut(e.note, 2000)],
  );
}

export const AUDIT_RANGES = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: 0 },
] as const;
export type AuditRange = (typeof AUDIT_RANGES)[number]["key"];

export type AuditFilters = {
  kind?: AuditKind;
  actor?: string;
  /** Words in the subject, the action, the note or the before and after. */
  q?: string;
  range?: AuditRange;
  subjectId?: string;
  subjectIds?: string[];
  limit?: number;
};

/** Read from a URL's query, keeping only what is valid. */
export function readAuditFilters(sp: Record<string, string | string[] | undefined>): AuditFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const kind = one("kind");
  const range = one("range");
  return {
    kind: (AUDIT_KINDS as readonly string[]).includes(kind) ? (kind as AuditKind) : undefined,
    actor: one("actor").slice(0, 200) || undefined,
    q: one("q").slice(0, 200) || undefined,
    range: AUDIT_RANGES.some((r) => r.key === range) ? (range as AuditRange) : "30d",
  };
}

function since(range: AuditRange | undefined): Date | null {
  const days = AUDIT_RANGES.find((r) => r.key === (range ?? "all"))?.days ?? 0;
  if (!days) return null;
  /* "Today" is today in Lagos, not the last 24 hours. */
  if (days === 1) {
    const lagos = new Date(Date.now() + 60 * 60 * 1000);
    return new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate()) - 60 * 60 * 1000);
  }
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function matches(e: AuditEntry, f: AuditFilters, from: Date | null) {
  const related = f.subjectIds?.length ? new Set(f.subjectIds) : null;
  const words = f.q?.toLowerCase();
  return (!f.kind || e.kind === f.kind)
    && (!f.actor || e.actor === f.actor)
    && (!f.subjectId || e.subjectId === f.subjectId)
    && (!related || related.has(e.subjectId))
    && (!from || new Date(e.at) >= from)
    && (!words || [e.subject, e.action, e.note, e.field, e.from, e.to].some((v) => v?.toLowerCase().includes(words)));
}

function fromMemory(list: readonly AuditEntry[], f: AuditFilters, limit: number) {
  const from = since(f.range);
  const hits = list.filter((e) => matches(e, f, from)).slice().reverse();
  return { entries: hits.slice(0, limit), total: hits.length };
}

export type AuditPage = { entries: AuditEntry[]; total: number; source: "database" | "memory" };

/** Newest first, bounded, with the count of everything that matched. */
export async function listAudit(f: AuditFilters = {}): Promise<AuditPage> {
  const limit = Math.min(Math.max(f.limit ?? 60, 1), 200);
  if (!configured()) return { ...fromMemory(memoryAudit(), f, limit), source: "memory" };
  await auditSettled();
  const where: string[] = [];
  const args: unknown[] = [];
  const add = (sql: string, v: unknown) => { args.push(v); where.push(sql.replace("?", `$${args.length}`)); };
  if (f.kind) add("kind = ?", f.kind);
  if (f.actor) add("actor = ?", f.actor);
  if (f.subjectId) add("subject_id = ?", f.subjectId);
  if (f.subjectIds?.length) add("subject_id = ANY(?::TEXT[])", f.subjectIds);
  const from = since(f.range);
  if (from) add("at >= ?", from);
  if (f.q) {
    args.push(`%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    const n = `$${args.length}`;
    where.push(`(subject ILIKE ${n} OR action ILIKE ${n} OR note ILIKE ${n} OR field ILIKE ${n} OR from_value ILIKE ${n} OR to_value ILIKE ${n})`);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  try {
    const [rows, count] = await Promise.all([
      db.query<Row>(`SELECT * FROM audit_log ${clause} ORDER BY at DESC, id DESC LIMIT ${limit}`, args),
      db.query<{ n: string }>(`SELECT count(*) AS n FROM audit_log ${clause}`, args),
    ]);
    const extra = fromMemory(unsavedAudit(), f, limit);
    const entries = [...rows.rows.map(toEntry), ...extra.entries]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit);
    return { entries, total: Number(count.rows[0].n) + extra.total, source: "database" };
  } catch (error) {
    console.error("[audit] database read failed; showing this instance's memory:", error instanceof Error ? error.message : error);
    return { ...fromMemory(memoryAudit(), f, limit), source: "memory" };
  }
}

/** Everybody who has changed something, for the filter. */
export async function auditActors(): Promise<string[]> {
  const mem = () => [...new Set(memoryAudit().map((e) => e.actor))].sort();
  if (!configured()) return mem();
  try {
    const r = await db.query<{ actor: string }>(`SELECT DISTINCT actor FROM audit_log ORDER BY actor LIMIT 200`);
    return r.rows.map((x) => x.actor);
  } catch {
    return mem();
  }
}

/** The latest entry about one subject, such as the daily tidy ("daily"). */
export async function lastAuditFor(subjectId: string): Promise<AuditEntry | null> {
  const r = await listAudit({ subjectId, limit: 1, range: "all" });
  return r.entries[0] ?? null;
}
