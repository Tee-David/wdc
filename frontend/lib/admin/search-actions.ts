"use server";

import { db } from "@/lib/db/pool";
import { rateLimit } from "@/lib/rate-limit";
import { adminRole } from "./guard";
import { getAdminRequest } from "./session";
import { can, type Area } from "./permissions";
import { syncStore } from "./persist";
import * as store from "./store";
import { invoiceStatus, invoiceTotals, naira } from "./types";
import { noticeBlock } from "./money-rules";
import { QUERY_MAX, SEARCH_LIMIT, cleanQuery, likeOf, rankRows, type SearchRow } from "./search-rank";

/**
 * THE SERVER SIDE OF THE SEARCHED PICKERS (components/admin/remote-pick.tsx).
 *
 * A long list (clients, projects, staff, contacts, tags, invoices) is never
 * shipped to the browser to be scrolled: the picker asks here, as the person
 * types, and gets at most twenty rows back, best match first.
 *
 *  - WHO MAY ASK is decided here, for the kind asked about, with the same
 *    table as every other admin action (lib/admin/permissions.ts). Staff get
 *    clients, projects and the team; contacts, tags and invoices are the
 *    owner's, like the pages behind them. Nothing carries a budget, a price
 *    or a balance that the asker could not already see; the one money figure
 *    (what an invoice still owes) goes only to someone with the money area.
 *    A read-only support view and a signed-out request get "denied".
 *  - WHAT IS MATCHED is the label, then the email, phone and company. The
 *    store kinds are ranked in memory (lib/admin/search-rank.ts, no pattern is
 *    built from the text); the two database kinds escape % _ \ and let the
 *    database narrow to sixty before the same ranking picks twenty.
 *  - THE CHOSEN VALUES COME BACK TOO (`selectedIds`), so a client who is not in
 *    the first twenty of this search still reads by name in the field.
 *
 * RATE LIMIT: loose on purpose (240 a minute per person). Typing is chatty and
 * each keystroke is a request after the picker's 200ms pause; this is abuse
 * control, not a quota. lib/rate-limit.ts keeps its counts in one instance's
 * memory, so on Vercel the real ceiling is this number times the warm
 * instances and a cold start forgives everything.
 */

export type SearchKind = "clients" | "projects" | "staff" | "contacts" | "tags" | "invoices";
/** Narrowing a kind: a client's projects, or which invoices count (open = something still owed). */
export type SearchScope = { clientId?: string; invoices?: "open" | "issued"; /** A record to leave out (the client being kept in a merge). */ exclude?: string };
export type SearchResult = {
  rows: SearchRow[];
  /** The rows for `selectedIds`, in the order asked. */
  selected: SearchRow[];
  /** More matched than the twenty returned: say "type more to narrow". */
  more: boolean;
  error?: "denied" | "busy" | "failed";
};

const AREA: Record<SearchKind, Area> = {
  clients: "clients",
  projects: "projects",
  staff: "projects", // the same rule staffPeople() always had: anyone who runs projects may name an owner
  contacts: "settings", // /admin/email is the owner's (permissions.ts NAV_AREA)
  tags: "settings",
  invoices: "money",
};
const KINDS = new Set<string>(Object.keys(AREA));
const EMPTY = (error?: SearchResult["error"]): SearchResult => ({ rows: [], selected: [], more: false, error });

/* A database narrows to this many before the ranking keeps twenty. */
const POOL = 60;
const SELECTED_MAX = 50;

export async function searchOptions(kind: SearchKind, q: string, selectedIds?: string[], scope?: SearchScope): Promise<SearchResult> {
  if (!KINDS.has(kind)) return EMPTY("failed");
  const role = await adminRole();
  if (!can(role, AREA[kind])) return EMPTY("denied");

  let who = "admin";
  try { who = (await getAdminRequest()).session?.user?.id ?? who; } catch { /* the role check above already passed */ }
  if (!rateLimit(`pick:${who}`, 240, 60_000).ok) return EMPTY("busy");

  const text = cleanQuery(q);
  const ids = Array.isArray(selectedIds)
    ? selectedIds.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 120).slice(0, SELECTED_MAX)
    : [];
  const narrow: SearchScope = {
    clientId: typeof scope?.clientId === "string" ? scope.clientId.slice(0, 120) : undefined,
    exclude: typeof scope?.exclude === "string" ? scope.exclude.slice(0, 120) : undefined,
    invoices: scope?.invoices === "open" ? "open" : "issued",
  };

  try {
    switch (kind) {
      case "clients": return await clients(text, ids, narrow);
      case "projects": return await projects(text, ids, narrow);
      case "invoices": return await invoices(text, ids, narrow);
      case "staff": return await staff(text, ids);
      case "contacts": return await contacts(text, ids);
      case "tags": return await tags(text, ids);
    }
  } catch (e) {
    console.error(`[search] ${kind} failed:`, e instanceof Error ? e.message : e);
    return EMPTY("failed");
  }
}

/**
 * WHY THE CLIENT OF THIS INVOICE CANNOT BE EMAILED A RECEIPT (no address, updates
 * off), or undefined when they can. The "Record a payment" form picks its invoice
 * from the search, so it no longer holds the client list the tick used to read; it
 * asks here once the invoice is chosen. Money area only, like the invoice search.
 */
export async function invoiceReceiptReason(id: string): Promise<string | undefined> {
  if (typeof id !== "string" || !id || id.length > 120) return undefined;
  if (!can(await adminRole(), "money")) return undefined;
  let who = "admin";
  try { who = (await getAdminRequest()).session?.user?.id ?? who; } catch { /* the role check above already passed */ }
  if (!rateLimit(`pick:${who}`, 240, 60_000).ok) return undefined;
  await syncStore();
  const inv = store.getInvoice(id);
  return inv ? noticeBlock(store.getClient(inv.clientId)) : undefined;
}

/* ------------------------------------------------------------------ store */

const join = (...bits: (string | undefined)[]) => bits.filter(Boolean).join(" · ");

async function clients(q: string, ids: string[], scope: SearchScope): Promise<SearchResult> {
  await syncStore();
  const row = (c: ReturnType<typeof store.getClients>[number]): SearchRow => ({ value: c.id, label: c.company || c.name, hint: join(c.name !== c.company ? c.name : undefined, c.email) || undefined });
  /* A client folded into another is not offered (it is archived there too). */
  const live = store.getClients().filter((c) => !c.mergedInto && c.id !== scope.exclude);
  const { rows, total } = rankRows(live, q, (c) => ({
    primary: c.company || c.name,
    others: [c.name, c.email, c.phone, ...(c.contacts ?? []).flatMap((p) => [p.name, p.email ?? ""])],
  }), { tie: "label" });
  const selected = ids.map((id) => store.getClient(id)).filter((c): c is NonNullable<typeof c> => Boolean(c)).map(row);
  return { rows: rows.map(row), selected, more: total > SEARCH_LIMIT };
}

async function projects(q: string, ids: string[], scope: SearchScope): Promise<SearchResult> {
  await syncStore();
  /* Never the budget, owner or history: a project is its title and whose it is. */
  const row = (p: NonNullable<ReturnType<typeof store.getProject>>): SearchRow => ({ value: p.id, label: p.title, hint: store.getClient(p.clientId)?.company });
  const pool = scope.clientId ? store.getProjectsFor(scope.clientId) : store.getProjects();
  const { rows, total } = rankRows(pool, q, (p) => ({ primary: p.title, others: [store.getClient(p.clientId)?.company ?? ""] }), { tie: "input" });
  const selected = ids.map((id) => store.getProject(id)).filter((p): p is NonNullable<typeof p> => Boolean(p)).map(row);
  return { rows: rows.map(row), selected, more: total > SEARCH_LIMIT };
}

async function invoices(q: string, ids: string[], scope: SearchScope): Promise<SearchResult> {
  await syncStore();
  type Inv = NonNullable<ReturnType<typeof store.getInvoice>>;
  const company = (i: Inv) => store.getClient(i.clientId)?.company ?? "Unknown client";
  const row = (i: Inv): SearchRow => {
    const due = invoiceTotals(i, store.getPaymentsFor(i.id)).due;
    return { value: i.id, label: `${i.number} · ${company(i)}`, hint: due > 0 ? `${invoiceStatus(i)} · ${naira(due)} owed` : invoiceStatus(i) };
  };
  const pool = store.getInvoices().filter((i) => {
    if (i.status === "Draft" || i.voided) return false;
    return scope.invoices === "open" ? invoiceTotals(i, store.getPaymentsFor(i.id)).due > 0 : true;
  }).filter((i) => !scope.clientId || i.clientId === scope.clientId);
  const { rows, total } = rankRows(pool, q, (i) => ({ primary: i.number, others: [company(i)] }), { tie: "input" });
  const selected = ids.map((id) => store.getInvoice(id)).filter((i): i is Inv => Boolean(i)).map(row);
  return { rows: rows.map(row), selected, more: total > SEARCH_LIMIT };
}

/* --------------------------------------------------------------- database */

async function staff(q: string, ids: string[]): Promise<SearchResult> {
  type R = { id: string; name: string; email: string; role: string; gone: boolean };
  const row = (r: R): SearchRow => ({ value: r.id, label: r.gone ? `${r.name} (deactivated)` : r.name, hint: r.role === "owner" ? "Owner" : "Staff" });
  const found = await db.query<R>(
    `SELECT "id","name","email","role",("deactivatedAt" IS NOT NULL) AS gone FROM "user"
     WHERE "role" IN ('owner','staff') AND "deactivatedAt" IS NULL AND "name" <> ''
       AND ($1 = '' OR "name" ILIKE $2 OR "email" ILIKE $2)
     ORDER BY (CASE WHEN "name" ILIKE $3 THEN 0 ELSE 1 END), lower("name") LIMIT ${POOL}`,
    [q, likeOf(q, "contains"), likeOf(q, "prefix")]);
  const { rows, total } = rankRows(found.rows, q, (r) => ({ primary: r.name, others: [r.email] }), { tie: "label" });
  /* A person who has left stays readable where they are already chosen. */
  const sel = ids.length
    ? (await db.query<R>(`SELECT "id","name","email","role",("deactivatedAt" IS NOT NULL) AS gone FROM "user" WHERE "id" = ANY($1::TEXT[]) AND "role" IN ('owner','staff')`, [ids])).rows
    : [];
  return { rows: rows.map(row), selected: ids.map((id) => sel.find((s) => s.id === id)).filter((s): s is R => Boolean(s)).map(row), more: total > SEARCH_LIMIT || found.rows.length >= POOL };
}

async function contacts(q: string, ids: string[]): Promise<SearchResult> {
  type R = { id: string; name: string; email: string; phone: string };
  const row = (r: R): SearchRow => ({ value: r.id, label: r.name || r.email, hint: r.name ? r.email : r.phone || undefined });
  const found = await db.query<R>(
    `SELECT id, name, email, phone FROM contacts
     WHERE ($1 = '' OR name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2)
     ORDER BY (CASE WHEN name ILIKE $3 OR email ILIKE $3 THEN 0 ELSE 1 END), created_at DESC LIMIT ${POOL}`,
    [q, likeOf(q, "contains"), likeOf(q, "prefix")]);
  const { rows, total } = rankRows(found.rows, q, (r) => ({ primary: r.name || r.email, others: [r.email, r.phone] }), { tie: "input" });
  const sel = ids.length ? (await db.query<R>(`SELECT id, name, email, phone FROM contacts WHERE id = ANY($1::TEXT[])`, [ids])).rows : [];
  return { rows: rows.map(row), selected: ids.map((id) => sel.find((s) => s.id === id)).filter((s): s is R => Boolean(s)).map(row), more: total > SEARCH_LIMIT || found.rows.length >= POOL };
}

async function tags(q: string, ids: string[]): Promise<SearchResult> {
  type R = { tag: string; n: string };
  const found = await db.query<R>(
    `SELECT tag, count(*) AS n FROM contact_tags
     WHERE ($1 = '' OR tag ILIKE $2) GROUP BY tag
     ORDER BY (CASE WHEN tag ILIKE $3 THEN 0 ELSE 1 END), tag LIMIT ${POOL}`,
    [q, likeOf(q, "contains"), likeOf(q, "prefix")]);
  const { rows, total } = rankRows(found.rows, q, (r) => ({ primary: r.tag }), { tie: "label" });
  const count = (n: string) => `${Number(n).toLocaleString("en-NG")} ${Number(n) === 1 ? "person" : "people"}`;
  /* A tag is its own label, and a step may name one nobody has been given yet. */
  const selected = ids.map((t) => t.slice(0, QUERY_MAX)).map((t) => ({ value: t, label: t }));
  return { rows: rows.map((r) => ({ value: r.tag, label: r.tag, hint: count(r.n) })), selected, more: total > SEARCH_LIMIT || found.rows.length >= POOL };
}
