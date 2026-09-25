import "server-only";

import { db } from "@/lib/db/pool";
import { stepsFor } from "@/lib/onboarding";
import { findDuplicateClient } from "@/lib/admin/store";
import type { ServiceSlug } from "@/lib/services";
import { PER_PAGE, tabsFor, type FormDef } from "./registry";

/**
 * Entries for every form, from the three tables they live in.
 *
 * ONE SHAPE OUT, THREE TABLES IN. Onboarding briefs, contact enquiries and
 * newsletter subscribers were written by three routes at three different
 * times and have different columns; the admin reads them all as `Entry` so the
 * table, the entry page and the export are built once.
 *
 * EVERY FILTER IS A PARAMETER. The tab, the search, the dates and the sort
 * come from the URL, so each is either matched against a fixed list or passed
 * as a bound value; nothing a visitor typed is ever spliced into the SQL.
 */

export type Box = "inbox" | "spam" | "trash";

export type Entry = {
  id: string;
  serial: number | null;
  /** Submitted (or last saved, for a draft), received, or subscribed. */
  at: string;
  name: string;
  email: string;
  phone: string;
  read: boolean;
  starred: boolean;
  box: Box;
  draft: boolean;
  /** Onboarding: what the client wrote, keyed by question. */
  answers: Record<string, string | string[]>;
  /** Contact: the enquiry itself. */
  topic?: string;
  message?: string;
  notice?: "pending" | "sent" | "failed" | "skipped";
  noticeError?: string | null;
  /** Newsletter. */
  source?: string;
  unsubscribedAt?: string | null;
  /** Onboarding drafts: which step they reached. */
  step?: number;
};

export type Filters = {
  tab: string;
  q: string;
  from: string;
  to: string;
  sort: "newest" | "oldest" | "name";
  page: number;
  per: number;
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime());

/** The URL's filters, each held to what it may be. */
export function readFilters(form: FormDef, sp: Params, perCookie?: string): Filters {
  const tabs = tabsFor(form).map((t) => t.key);
  const tab = tabs.includes(one(sp.tab)) ? one(sp.tab) : tabs[0];
  const sort = (["newest", "oldest", "name"] as const).find((s) => s === one(sp.sort)) ?? "newest";
  const perRaw = Number(one(sp.per) || perCookie);
  const per = (PER_PAGE as readonly number[]).includes(perRaw) ? perRaw : PER_PAGE[0];
  const page = Math.max(1, Math.min(10_000, Math.floor(Number(one(sp.page)) || 1)));
  let from = isDate(one(sp.from)) ? one(sp.from) : "";
  let to = isDate(one(sp.to)) ? one(sp.to) : "";
  /* The presets are written as a range, so a link to "last 7 days" means the
     same seven days to everybody who opens it today. */
  const preset = one(sp.range);
  const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  if (preset === "today") { from = day(0); to = day(0); }
  if (preset === "7d") { from = day(6); to = day(0); }
  if (preset === "30d") { from = day(29); to = day(0); }
  return { tab, q: one(sp.q).trim().slice(0, 120), from, to, sort, page, per };
}

/* ---------------------------------------------------------------- SQL */

type Built = { where: string[]; args: unknown[] };

function tabWhere(form: FormDef, tab: string): string {
  if (form.source === "newsletter") return tab === "unsubscribed" ? "unsubscribed_at IS NOT NULL" : "unsubscribed_at IS NULL";
  const done = form.source === "onboarding" ? "status = 'submitted' AND " : "";
  switch (tab) {
    case "unread": return `${done}box = 'inbox' AND read_at IS NULL`;
    case "starred": return `${done}box = 'inbox' AND starred`;
    case "drafts": return "status = 'in_progress' AND box = 'inbox'";
    case "spam": return "box = 'spam'";
    case "trash": return form.source === "onboarding" ? "(box = 'trash' OR status = 'archived')" : "box = 'trash'";
    default: return `${done}box = 'inbox'`;
  }
}

const TABLE = { onboarding: "onboarding_submissions", contact: "contact_enquiries", newsletter: "newsletter_subscribers" } as const;
const DATE = { onboarding: "COALESCE(submitted_at, updated_at)", contact: "created_at", newsletter: "created_at" } as const;
const NAME = {
  onboarding: "lower(COALESCE(answers->>'first_name', '') || ' ' || COALESCE(answers->>'last_name', ''))",
  contact: "lower(first_name || ' ' || last_name)",
  newsletter: "lower(email)",
} as const;
const SEARCH = {
  onboarding: "(answers::TEXT ILIKE $N OR COALESCE(email, '') ILIKE $N)",
  contact: "(first_name ILIKE $N OR last_name ILIKE $N OR email ILIKE $N OR topic ILIKE $N OR message ILIKE $N)",
  newsletter: "(email ILIKE $N OR email_as_typed ILIKE $N)",
} as const;

function base(form: FormDef): Built {
  const b: Built = { where: [], args: [] };
  if (form.source === "onboarding") { b.args.push(form.service); b.where.push(`service = $${b.args.length}`); }
  return b;
}

function filtered(form: FormDef, f: Filters, withTab = true): Built {
  const b = base(form);
  if (withTab) b.where.push(tabWhere(form, f.tab));
  if (f.q) {
    b.args.push(`%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    b.where.push(SEARCH[form.source].replaceAll("$N", `$${b.args.length}`));
  }
  const col = DATE[form.source];
  /* The end date is the whole of that day, not its first second. */
  if (f.from) { b.args.push(`${f.from}T00:00:00Z`); b.where.push(`${col} >= $${b.args.length}::TIMESTAMPTZ`); }
  if (f.to) { b.args.push(`${f.to}T23:59:59.999Z`); b.where.push(`${col} <= $${b.args.length}::TIMESTAMPTZ`); }
  return b;
}

const where = (b: Built) => (b.where.length ? `WHERE ${b.where.join(" AND ")}` : "");
const order = (form: FormDef, sort: Filters["sort"]) =>
  sort === "name" ? `${NAME[form.source]} ASC, id ASC`
    : sort === "oldest" ? `${DATE[form.source]} ASC, id ASC`
    : `${DATE[form.source]} DESC, id DESC`;

/* ----------------------------------------------------------- the rows */

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : "");
const text = (v: unknown) => (typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v));

function toEntry(form: FormDef, r: Row): Entry {
  if (form.source === "onboarding") {
    const answers = (r.answers && typeof r.answers === "object" ? r.answers : {}) as Record<string, string | string[]>;
    return {
      id: String(r.id), serial: r.serial == null ? null : Number(r.serial),
      at: iso(r.submitted_at ?? r.updated_at),
      name: `${text(answers.first_name)} ${text(answers.last_name)}`.trim(),
      email: text(answers.email) || text(r.email), phone: text(answers.phone),
      read: Boolean(r.read_at), starred: Boolean(r.starred),
      box: r.status === "archived" ? "trash" : (r.box as Box) ?? "inbox",
      draft: r.status === "in_progress", answers, step: Number(r.current_step ?? 0),
    };
  }
  if (form.source === "contact") {
    return {
      id: String(r.id), serial: r.serial == null ? null : Number(r.serial), at: iso(r.created_at),
      name: `${text(r.first_name)} ${text(r.last_name)}`.trim(), email: text(r.email), phone: text(r.phone),
      read: Boolean(r.read_at), starred: Boolean(r.starred), box: (r.box as Box) ?? "inbox", draft: false,
      answers: {}, topic: text(r.topic), message: text(r.message),
      notice: r.delivery as Entry["notice"], noticeError: (r.delivery_error as string | null) ?? null,
    };
  }
  return {
    id: String(r.id), serial: null, at: iso(r.created_at), name: "", email: text(r.email_as_typed) || text(r.email), phone: "",
    read: true, starred: false, box: "inbox", draft: false, answers: {},
    source: text(r.source), unsubscribedAt: r.unsubscribed_at ? iso(r.unsubscribed_at) : null,
  };
}

export type Page = { rows: Entry[]; total: number; counts: Record<string, number> };

/** One page of a form's entries, the total that matched, and every tab's count. */
export async function listEntries(form: FormDef, f: Filters): Promise<Page> {
  const table = TABLE[form.source];
  const b = filtered(form, f);
  const offset = (f.page - 1) * f.per;
  const rows = await db.query<Row>(
    `SELECT * FROM ${table} ${where(b)} ORDER BY ${order(form, f.sort)} LIMIT ${f.per} OFFSET ${offset}`,
    b.args,
  );
  const total = await db.query<{ n: string }>(`SELECT count(*) AS n FROM ${table} ${where(b)}`, b.args);
  return { rows: rows.rows.map((r) => toEntry(form, r)), total: Number(total.rows[0]?.n ?? 0), counts: await tabCounts(form) };
}

/** Every tab's count in one query, so the tabs never disagree with each other. */
export async function tabCounts(form: FormDef): Promise<Record<string, number>> {
  const tabs = tabsFor(form);
  const b = base(form);
  const cols = tabs.map((t, i) => `count(*) FILTER (WHERE ${tabWhere(form, t.key)}) AS t${i}`).join(", ");
  const r = await db.query<Record<string, string>>(`SELECT ${cols} FROM ${TABLE[form.source]} ${where(b)}`, b.args);
  return Object.fromEntries(tabs.map((t, i) => [t.key, Number(r.rows[0]?.[`t${i}`] ?? 0)]));
}

/** Every id the filter matches, in order, for previous and next. Bounded. */
export async function entryIds(form: FormDef, f: Filters): Promise<string[]> {
  const b = filtered(form, f);
  const r = await db.query<{ id: string }>(
    `SELECT id FROM ${TABLE[form.source]} ${where(b)} ORDER BY ${order(form, f.sort)} LIMIT 2000`, b.args,
  );
  return r.rows.map((x) => String(x.id));
}

/** Every entry the filter matches (or the ticked ones), for an export. Bounded. */
export async function exportEntries(form: FormDef, f: Filters, ids?: string[]): Promise<Entry[]> {
  const b = ids?.length ? base(form) : filtered(form, f);
  if (ids?.length) { b.args.push(ids); b.where.push(`id = ANY($${b.args.length}::UUID[])`); }
  const r = await db.query<Row>(
    `SELECT * FROM ${TABLE[form.source]} ${where(b)} ORDER BY ${order(form, f.sort)} LIMIT 10000`, b.args,
  );
  return r.rows.map((x) => toEntry(form, x));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isEntryId = (id: string) => UUID.test(id);

export async function getEntry(form: FormDef, id: string): Promise<Entry | null> {
  if (!isEntryId(id)) return null;
  const b = base(form);
  b.args.push(id); b.where.push(`id = $${b.args.length}`);
  const r = await db.query<Row>(`SELECT * FROM ${TABLE[form.source]} ${where(b)}`, b.args);
  return r.rows[0] ? toEntry(form, r.rows[0]) : null;
}

/** Which form an onboarding brief belongs to, for old /admin/forms/<id> links. */
export async function onboardingServiceOf(id: string): Promise<ServiceSlug | null> {
  if (!isEntryId(id)) return null;
  const r = await db.query<{ service: ServiceSlug }>("SELECT service FROM onboarding_submissions WHERE id = $1", [id]);
  return r.rows[0]?.service ?? null;
}

/** Opening an entry is reading it. Only unread becomes read, never the reverse. */
export async function markRead(form: FormDef, id: string) {
  if (!form.inbox || !isEntryId(id)) return;
  await db.query(`UPDATE ${TABLE[form.source]} SET read_at = now() WHERE id = $1 AND read_at IS NULL`, [id]);
}

export type BulkAction = "read" | "unread" | "star" | "unstar" | "spam" | "restore" | "trash" | "delete";
export const BULK_ACTIONS: readonly BulkAction[] = ["read", "unread", "star", "unstar", "spam", "restore", "trash", "delete"];

/**
 * One action over ticked entries. Returns how many rows it changed.
 *
 * Every id is matched against THIS form as well as its own id, so a posted id
 * from another form (or another service's briefs) changes nothing. Deleting
 * for good only touches rows already in Trash.
 */
export async function applyBulk(form: FormDef, action: BulkAction, ids: string[]): Promise<number> {
  if (!form.inbox) return 0;
  const clean = [...new Set(ids.filter(isEntryId))].slice(0, 500);
  if (!clean.length) return 0;
  const table = TABLE[form.source];
  const b = base(form);
  b.args.push(clean); b.where.push(`id = ANY($${b.args.length}::UUID[])`);
  const set: Record<Exclude<BulkAction, "delete">, string> = {
    read: "read_at = COALESCE(read_at, now())",
    unread: "read_at = NULL",
    star: "starred = true",
    unstar: "starred = false",
    spam: "box = 'spam', box_at = now()",
    trash: "box = 'trash', box_at = now()",
    restore: form.source === "onboarding"
      ? "box = 'inbox', box_at = now(), status = CASE WHEN status = 'archived' THEN 'submitted' ELSE status END"
      : "box = 'inbox', box_at = now()",
  };
  if (action === "delete") {
    b.where.push(form.source === "onboarding" ? "(box = 'trash' OR status = 'archived')" : "box = 'trash'");
    const r = await db.query(`DELETE FROM ${table} ${where(b)}`, b.args);
    return r.rowCount ?? 0;
  }
  const r = await db.query(`UPDATE ${table} SET ${set[action]} ${where(b)}`, b.args);
  return r.rowCount ?? 0;
}

/* --------------------------------------------------------- the cells */

const has = (v: unknown) => (Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim()));

/** "41 of 52": questions answered out of the ones this client was shown. */
export function answeredCount(service: ServiceSlug, answers: Entry["answers"]) {
  const fields = stepsFor(service).flatMap((s) => s.fields).filter((f) => {
    if (!f.showIf) return true;
    const v = answers[f.showIf.key];
    return Array.isArray(v) ? v.some((x) => f.showIf!.equals.includes(x)) : typeof v === "string" && f.showIf.equals.includes(v);
  });
  return { answered: fields.filter((f) => has(answers[f.key])).length, total: fields.length };
}

/** The client a brief or enquiry belongs to, by its email or phone. */
export const clientFor = (e: Entry) => (e.email || e.phone ? findDuplicateClient(e.email, e.phone) : null);

/** One cell as text: what the table shows and what the export writes. */
export function cellText(form: FormDef, e: Entry, key: string): string {
  switch (key) {
    case "serial": return e.serial ? String(e.serial) : "";
    case "name": return e.name;
    case "email": return e.email;
    case "phone": return e.phone;
    case "company": return text(e.answers.company);
    case "topic": return e.topic ?? "";
    case "message": return e.message ?? "";
    case "notice": return e.notice ?? "";
    case "source": return e.source ?? "";
    case "status": return e.unsubscribedAt ? "Unsubscribed" : "Subscribed";
    case "unsubscribed": return e.unsubscribedAt ?? "";
    case "when": return e.at;
    case "client": return clientFor(e)?.company ?? "";
    case "answered": {
      if (!form.service) return "";
      if (e.draft) return `Draft, step ${Math.min((e.step ?? 0) + 1, 4)} of 4`;
      const { answered, total } = answeredCount(form.service, e.answers);
      return `${answered} of ${total}`;
    }
    default:
      return key.startsWith("q:") ? text(e.answers[key.slice(2)]) : "";
  }
}

/* ------------------------------------------------------- the forms list */

export type FormSummary = {
  total: number;
  unread: number;
  drafts: number;
  /** Newsletter: added in the last 30 days. */
  recent: number;
  last: string | null;
  /** Contact: studio notices that failed, or never settled after an hour. */
  noticeProblems: number;
};

const EMPTY: FormSummary = { total: 0, unread: 0, drafts: 0, recent: 0, last: null, noticeProblems: 0 };

/** What each form's row on /admin/forms says, in three queries for all eight. */
export async function formSummaries(): Promise<Record<string, FormSummary>> {
  const out: Record<string, FormSummary> = {};
  const onboarding = await db.query<{ service: string; total: string; unread: string; drafts: string; last: Date | null }>(`
    SELECT service,
      count(*) FILTER (WHERE status = 'submitted' AND box = 'inbox') AS total,
      count(*) FILTER (WHERE status = 'submitted' AND box = 'inbox' AND read_at IS NULL) AS unread,
      count(*) FILTER (WHERE status = 'in_progress' AND box = 'inbox') AS drafts,
      max(submitted_at) FILTER (WHERE status = 'submitted') AS last
    FROM onboarding_submissions GROUP BY service
  `);
  for (const r of onboarding.rows) {
    out[`onboarding-${r.service}`] = { ...EMPTY, total: Number(r.total), unread: Number(r.unread), drafts: Number(r.drafts), last: r.last ? iso(r.last) : null };
  }
  const contact = await db.query<{ total: string; unread: string; last: Date | null; problems: string }>(`
    SELECT count(*) FILTER (WHERE box = 'inbox') AS total,
      count(*) FILTER (WHERE box = 'inbox' AND read_at IS NULL) AS unread,
      max(created_at) AS last,
      count(*) FILTER (WHERE box = 'inbox' AND (delivery = 'failed' OR (delivery = 'pending' AND created_at < now() - INTERVAL '1 hour'))) AS problems
    FROM contact_enquiries
  `);
  const c = contact.rows[0];
  if (c) out.contact = { ...EMPTY, total: Number(c.total), unread: Number(c.unread), last: c.last ? iso(c.last) : null, noticeProblems: Number(c.problems) };
  const news = await db.query<{ total: string; recent: string; last: Date | null }>(`
    SELECT count(*) FILTER (WHERE unsubscribed_at IS NULL) AS total,
      count(*) FILTER (WHERE unsubscribed_at IS NULL AND created_at > now() - INTERVAL '30 days') AS recent,
      max(created_at) AS last
    FROM newsletter_subscribers
  `);
  const n = news.rows[0];
  if (n) out.newsletter = { ...EMPTY, total: Number(n.total), recent: Number(n.recent), last: n.last ? iso(n.last) : null };
  return out;
}

/** Unread entries across every inbox form, for the Forms item in the nav. */
export async function unreadTotal(): Promise<number> {
  const r = await db.query<{ n: string }>(`
    SELECT (SELECT count(*) FROM onboarding_submissions WHERE status = 'submitted' AND box = 'inbox' AND read_at IS NULL)
         + (SELECT count(*) FROM contact_enquiries WHERE box = 'inbox' AND read_at IS NULL) AS n
  `);
  return Number(r.rows[0]?.n ?? 0);
}

export const summaryOf = (all: Record<string, FormSummary>, key: string) => all[key] ?? EMPTY;

/** Entries in Trash for longer than the form keeps them, deleted for good. Returns how many. */
export async function purgeTrash(form: FormDef, days: number): Promise<number> {
  if (!form.inbox) return 0;
  const b = base(form);
  b.args.push(days);
  b.where.push(`box = 'trash' AND box_at IS NOT NULL AND box_at < now() - ($${b.args.length}::INT8 * INTERVAL '1 day')`);
  const r = await db.query(`DELETE FROM ${TABLE[form.source]} ${where(b)}`, b.args);
  return r.rowCount ?? 0;
}
