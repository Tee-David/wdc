import type {
  Approval, AuditEntry, AuditKind, Channel, Client, Deliverable, Expense,
  Health, Id, Invoice, Payment, Priority, Project, Stage, Submission, Task,
  Update,
} from "./types";
import { invoiceTotals, naira } from "./types";

/**
 * THE ONE PLACE THE ADMIN GETS ITS DATA, and the only file that has to change
 * when the database arrives.
 *
 * Every screen calls these functions. None of them knows whether the answer
 * came from memory or from CockroachDB, because the return types are declared
 * in ./types.ts and lib/db/schema.ts already declares columns that produce
 * exactly those shapes. Replacing the bodies below with Drizzle queries is a
 * mechanical change the compiler will check.
 *
 * WHY IT IS IN MEMORY TODAY, said plainly rather than dressed up: there is no
 * database provisioned, no connection string, and no migration run. Building
 * the screens against a store that does not exist yet would mean building them
 * blind; building them against this one means every list, total, filter and
 * empty state is real and reviewable now, and the swap is one module.
 *
 * The seed below is fiction. It is shaped like real work -- a client with two
 * projects, an invoice part paid, one overdue, a submission still open -- so
 * the screens are exercised rather than flattered.
 */

/* --------------------------------------------------------------- the seed */

const iso = (d: string) => new Date(d).toISOString();
/** Naira to kobo, so the seed reads in the unit a person would say. */
const N = (naira: number) => Math.round(naira * 100);

const CLIENTS: Client[] = [
  {
    id: "c1", name: "Tobi Adeyemi", company: "Moore Designs",
    email: "tobi@mooredesigns.ng", phone: "+234 802 123 4567",
    services: ["branding", "web"], sector: "Fashion and apparel",
    since: iso("2026-02-11"),
    notes: "Wants the identity settled before the site build starts.",
  },
  {
    id: "c2", name: "Amaka Obi", company: "Marfaa Foods",
    email: "amaka@marfaa.com", phone: "+234 703 998 1122",
    services: ["social", "seo"], sector: "Food and drink",
    since: iso("2026-04-02"),
  },
  {
    id: "c3", name: "Chidi Nwosu", company: "Millcon Properties",
    email: "chidi@millcon.ng", phone: "+234 812 445 0090",
    services: ["web", "seo", "social"], sector: "Property and construction",
    since: iso("2025-11-20"),
  },
  {
    id: "c4", name: "Dhiol Ayen", company: "Dhiol World",
    email: "hello@dhiolworld.com", phone: "+211 920 300 118",
    services: ["branding"], sector: "Non-profit",
    since: iso("2026-06-30"),
  },
  {
    id: "c5", name: "Femi Bakare", company: "Traxstaff",
    email: "femi@traxstaff.io", phone: "+234 909 771 3355",
    services: ["software", "apps"], sector: "Technology",
    since: iso("2025-08-14"),
  },
];

const PROJECTS: Project[] = [
  {
    id: "p1", clientId: "c1", title: "Identity system", service: "branding",
    stage: "Review", due: iso("2026-09-26"),
    owner: "Babatope", health: "Waiting on client", channel: "WhatsApp group",
    budget: N(630_000), scope: "Logo, palette, type scale and a short guideline set.",
    events: [
      { at: iso("2026-08-02"), text: "Moved to Discovery" },
      { at: iso("2026-08-19"), text: "Moved to In progress" },
      { at: iso("2026-09-08"), text: "Moved to Review. Three routes sent." },
    ],
  },
  {
    id: "p2", clientId: "c1", title: "Shop rebuild", service: "web",
    stage: "Onboarding", due: null,
    owner: "Babatope", health: "On track", channel: "Client dashboard",
    budget: null, scope: "Shopify storefront rebuild on the new identity.",
    events: [{ at: iso("2026-09-09"), text: "Project opened" }],
  },
  {
    id: "p3", clientId: "c2", title: "Always-on social", service: "social",
    stage: "In progress", due: iso("2026-12-19"),
    owner: "Ada", health: "On track", channel: "WhatsApp group",
    budget: N(3_000_000), scope: "Twelve posts and four reels a month, plus community replies.",
    events: [
      { at: iso("2026-04-08"), text: "Moved to Discovery" },
      { at: iso("2026-04-30"), text: "Moved to In progress" },
    ],
  },
  {
    id: "p4", clientId: "c3", title: "Listings site", service: "web",
    stage: "Delivered", due: iso("2026-07-31"),
    owner: "Ada", health: "On track", channel: "Email",
    budget: N(1_620_000), scope: "Listings site with search, agent profiles and enquiry routing.",
    events: [
      { at: iso("2026-03-01"), text: "Moved to In progress" },
      { at: iso("2026-07-24"), text: "Moved to Delivered" },
    ],
  },
  {
    id: "p5", clientId: "c5", title: "Dispatch platform", service: "software",
    stage: "Revisions", due: iso("2026-10-10"),
    owner: "Femi", health: "At risk", channel: "Direct chat",
    budget: N(4_800_000), scope: "Driver dispatch, live tracking and a back office.",
    events: [
      { at: iso("2026-06-02"), text: "Moved to In progress" },
      { at: iso("2026-09-01"), text: "Moved to Revisions" },
    ],
  },
  {
    id: "p6", clientId: "c4", title: "Charity mark", service: "branding",
    stage: "Discovery", due: iso("2026-10-31"),
    owner: "Babatope", health: "Blocked", channel: "Email",
    budget: N(420_000), scope: "Wordmark and a one-page usage sheet.",
    events: [{ at: iso("2026-09-02"), text: "Moved to Discovery" }],
  },
];

const INVOICES: Invoice[] = [
  {
    id: "i1", token: "seedInv1AAAAAAAAAAAAAAA", number: "INV-2026-001", clientId: "c1", projectId: "p1",
    status: "Sent", issued: iso("2026-08-01"), due: iso("2026-08-31"), vatRate: 7.5,
    lines: [
      { description: "Identity system, first stage", qty: 1, unit: N(450_000) },
      { description: "Brand guidelines", qty: 1, unit: N(180_000) },
    ],
    paid: N(300_000),
  },
  {
    id: "i2", token: "seedInv2AAAAAAAAAAAAAAA", number: "INV-2026-002", clientId: "c2", projectId: "p3",
    status: "Sent", issued: iso("2026-07-05"), due: iso("2026-08-04"), vatRate: 7.5,
    lines: [{ description: "Social management, July", qty: 1, unit: N(250_000) }],
    paid: 0,
  },
  {
    id: "i3", token: "seedInv3AAAAAAAAAAAAAAA", number: "INV-2026-003", clientId: "c3", projectId: "p4",
    status: "Sent", issued: iso("2026-07-25"), due: iso("2026-08-24"), vatRate: 7.5,
    lines: [
      { description: "Listings site build", qty: 1, unit: N(1_400_000) },
      { description: "Search optimisation setup", qty: 1, unit: N(220_000) },
    ],
    paid: N(1_741_000),
  },
  {
    id: "i4", token: "seedInv4AAAAAAAAAAAAAAA", number: "INV-2026-004", clientId: "c5", projectId: "p5",
    status: "Draft", issued: iso("2026-09-09"), due: iso("2026-10-09"), vatRate: 7.5,
    lines: [{ description: "Dispatch platform, milestone two", qty: 1, unit: N(900_000) }],
    paid: 0,
  },
];

const PAYMENTS: Payment[] = [
  { id: "y1", invoiceId: "i1", at: iso("2026-08-06"), amount: N(300_000), method: "Paystack",
    reference: "PSK_8fj2k1", receiptNo: "RCT-2026-001", token: "seedRct1AAAAAAAAAAAAAAA", by: "Paystack webhook" },
  { id: "y2", invoiceId: "i3", at: iso("2026-07-30"), amount: N(1_000_000), method: "Transfer",
    reference: "TRF_0091", receiptNo: "RCT-2026-002", token: "seedRct2AAAAAAAAAAAAAAA", by: "Babatope",
    note: "Paid into the Zenith account." },
  { id: "y3", invoiceId: "i3", at: iso("2026-08-14"), amount: N(741_000), method: "Paystack",
    reference: "PSK_11ba7c", receiptNo: "RCT-2026-003", token: "seedRct3AAAAAAAAAAAAAAA", by: "Paystack webhook" },
];

const EXPENSES: Expense[] = [
  { id: "e1", at: iso("2026-08-01"), description: "Adobe Creative Cloud", category: "Software", amount: N(38_000) },
  { id: "e2", at: iso("2026-08-03"), description: "Vercel Pro", category: "Hosting", amount: N(31_000) },
  { id: "e3", at: iso("2026-08-12"), description: "Stock photography", category: "Assets", amount: N(24_500) },
  { id: "e4", at: iso("2026-09-01"), description: "Contract illustrator", category: "Contractors", amount: N(180_000) },
  { id: "e5", at: iso("2026-09-04"), description: "Meta ads, agency test", category: "Marketing", amount: N(60_000) },
];

const SUBMISSIONS: Submission[] = [
  {
    id: "s1", clientId: "c1", service: "branding", status: "Submitted",
    startedAt: iso("2026-07-28"), submittedAt: iso("2026-07-29"),
    answers: {
      first_name: "Tobi", last_name: "Adeyemi", company: "Moore Designs",
      email: "tobi@mooredesigns.ng", phone: "+234 802 123 4567",
      industry: "Fashion and apparel",
      brand_state: "A logo only",
      deliverables: ["Logo", "Full identity system", "Brand guidelines"],
      surfaces: ["Embroidery", "Print", "Screen", "Packaging"],
      untouchable: "The name, and the green we already use on the labels.",
    },
  },
  {
    id: "s2", clientId: "c4", service: "branding", status: "Submitted",
    startedAt: iso("2026-09-01"), submittedAt: iso("2026-09-02"),
    answers: {
      first_name: "Dhiol", last_name: "Ayen", company: "Dhiol World",
      email: "hello@dhiolworld.com", industry: "Non-profit",
      brand_state: "Nothing yet",
      deliverables: ["Logo", "Social templates"],
    },
  },
  {
    id: "s3", clientId: null, service: "web", status: "In progress",
    startedAt: iso("2026-09-10"), submittedAt: null,
    answers: { first_name: "Ngozi", company: "Ngozi Interiors", email: "ngozi@example.com" },
  },
];

/* ------------------------------------------------------------- the reads */

/* Sorted at the boundary rather than in each screen, so two lists of the same
   thing cannot disagree about their order. */
const byNewest = <T extends { since?: string; startedAt?: string; issued?: string }>(a: T, b: T) =>
  String(b.since ?? b.startedAt ?? b.issued ?? "").localeCompare(String(a.since ?? a.startedAt ?? a.issued ?? ""));

export function getClients() {
  return CLIENTS.filter((c) => !c.archived).slice().sort(byNewest);
}
export function getClient(id: Id) {
  return CLIENTS.find((c) => c.id === id) ?? null;
}
/**
 * Every project that is still being worked on.
 *
 * Archived ones are excluded here, the same way archived clients are excluded
 * above, so no list screen has to remember to filter. `includeArchived` is
 * what the archive view asks for; `getProject` by id still returns an archived
 * one, because a link to it has to keep working.
 */
export function getProjects(includeArchived = false) {
  return includeArchived ? PROJECTS.slice() : PROJECTS.filter((p) => !p.archived);
}
export function getProjectsFor(clientId: Id, includeArchived = false) {
  return PROJECTS.filter((p) => p.clientId === clientId && (includeArchived || !p.archived));
}
export function getProject(id: Id) {
  return PROJECTS.find((p) => p.id === id) ?? null;
}
export function getInvoices() {
  return INVOICES.slice().sort(byNewest);
}
export function getInvoice(id: Id) {
  return INVOICES.find((i) => i.id === id) ?? null;
}
export function getInvoicesFor(clientId: Id) {
  return INVOICES.filter((i) => i.clientId === clientId).sort(byNewest);
}
/**
 * THE PUBLIC LOOKUPS, and the rule they follow.
 *
 * A token is the whole of the authorisation, so these compare the FULL token
 * and nothing else: no prefix match, no "starts with", no fallback to the
 * invoice number if the token misses. A near miss is a miss.
 *
 * They return the record or null, and the pages above them render a plain 404
 * for null rather than "no invoice with that token" -- which would confirm to
 * somebody guessing that the format was right.
 */
export function getInvoiceByToken(t: string) {
  if (!t || t.length < 20) return null;
  return INVOICES.find((i) => i.token === t) ?? null;
}
export function getPaymentByToken(t: string) {
  if (!t || t.length < 20) return null;
  return PAYMENTS.find((p) => p.token === t) ?? null;
}

/**
 * What an invoice has actually kept.
 *
 * ONE FUNCTION, USED EVERYWHERE A TOTAL IS TAKEN. Reversed payments stay on
 * the books as rows -- see the note on `Payment.reversed` -- so every sum has
 * to skip them, and a second place that forgot to is a set of books that says
 * money arrived when it went back. There is no version of this that filters
 * inline at the call site.
 */
function collected(invoiceId: Id) {
  return PAYMENTS
    .filter((p) => p.invoiceId === invoiceId && !p.reversed)
    .reduce((n, p) => n + p.amount, 0);
}

export function getPaymentsFor(invoiceId: Id) {
  return PAYMENTS.filter((p) => p.invoiceId === invoiceId);
}
export function getPayments() {
  return PAYMENTS.slice();
}
export function getExpenses() {
  return EXPENSES.slice().sort((a, b) => b.at.localeCompare(a.at));
}
export function getSubmissions() {
  return SUBMISSIONS.slice().sort(byNewest);
}
export function getSubmission(id: Id) {
  return SUBMISSIONS.find((s) => s.id === id) ?? null;
}

/* ----------------------------------------------------------- the figures */

/**
 * The numbers the dashboard leads with.
 *
 * COLLECTED, NOT INVOICED, is the headline. Invoiced revenue is a number that
 * feels good and cannot pay anybody: the only figure that matters to a studio
 * on a given morning is what has actually landed, and what is owed. Both are
 * summed from the same rows the money screens show, so a tile and a table can
 * never tell different stories.
 */
export function getSummary(today = new Date()) {
  const invoices = getInvoices();
  let invoiced = 0, collected = 0, outstanding = 0, overdue = 0;
  for (const inv of invoices) {
    if (inv.status === "Draft") continue;
    const t = invoiceTotals(inv);
    invoiced += t.total;
    collected += inv.paid;
    outstanding += t.due;
    if (t.due > 0 && new Date(inv.due) < today) overdue += t.due;
  }
  const spend = getExpenses().reduce((n, e) => n + e.amount, 0);
  const live = getProjects().filter((p) => p.stage !== "Delivered");

  return {
    invoiced, collected, outstanding, overdue, spend,
    profit: collected - spend,
    clients: getClients().length,
    liveProjects: live.length,
    /* What is actually waiting on somebody, which is the only project count
       worth putting on a dashboard. */
    needsUs: live.filter((p) => p.stage === "Onboarding" || p.stage === "Revisions").length,
    openForms: getSubmissions().filter((s) => s.status === "In progress").length,
  };
}

/** Projects grouped by stage, in the order the stages actually run. */
export function getBoard() {
  const board = new Map<Stage, Project[]>();
  for (const p of getProjects()) {
    const list = board.get(p.stage) ?? [];
    list.push(p);
    board.set(p.stage, list);
  }
  return board;
}

/**
 * WHO OWES WHAT, AND FOR HOW LONG.
 *
 * Accounts-receivable aging, which is the one report that answers "is this
 * money coming" rather than "how much is outstanding". A single outstanding
 * figure treats an invoice sent last Tuesday and one sent in March as the same
 * thing, and they are not: the first is a cashflow line and the second is a
 * conversation somebody has to have.
 *
 * The buckets are the conventional ones -- current, then 30-day steps -- so
 * the numbers mean the same thing they mean to an accountant looking at them.
 * Everything is DERIVED from the invoices and today's date, never stored, for
 * the same reason `invoiceStatus` derives "overdue": a stored bucket is stale
 * the morning after it is written.
 *
 * Drafts are excluded throughout. A draft has not been sent to anybody, so
 * nobody owes it.
 */
export type AgingBucket = {
  label: string;
  /** Kobo still owed in this bucket. */
  amount: number;
  invoices: Invoice[];
};

export function getAging(today = new Date()) {
  const buckets: AgingBucket[] = [
    { label: "Not due yet", amount: 0, invoices: [] },
    { label: "1-30 days late", amount: 0, invoices: [] },
    { label: "31-60 days late", amount: 0, invoices: [] },
    { label: "61-90 days late", amount: 0, invoices: [] },
    { label: "Over 90 days late", amount: 0, invoices: [] },
  ];

  for (const inv of INVOICES) {
    if (inv.status === "Draft") continue;
    const { due } = invoiceTotals(inv);
    if (due <= 0) continue;
    const days = Math.floor((today.getTime() - new Date(inv.due).getTime()) / 86_400_000);
    const at = days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
    buckets[at].amount += due;
    buckets[at].invoices.push(inv);
  }

  /* Oldest first inside each bucket: within "over 90 days" the one from March
     is the call to make before the one from June. */
  for (const b of buckets) b.invoices.sort((a, c) => a.due.localeCompare(c.due));
  return buckets;
}

/**
 * HOW MUCH OF WHAT WE BILLED HAS ACTUALLY ARRIVED.
 *
 * Collection rate, as a fraction. Deliberately measured against what was
 * INVOICED rather than against what is overdue: a studio that bills a million
 * and collects nine hundred thousand is at 90%, whatever the age of the rest.
 *
 * Returns null rather than 0 when nothing has been invoiced. Zero would draw a
 * red 0% on a screen for a studio that has simply not billed anything yet,
 * which is a different thing and not a problem.
 */
export function getCollectionRate(): number | null {
  let invoiced = 0, collected = 0;
  for (const inv of INVOICES) {
    if (inv.status === "Draft") continue;
    invoiced += invoiceTotals(inv).total;
    collected += inv.paid;
  }
  if (invoiced <= 0) return null;
  /* Capped at 1. An overpaid invoice is real and is flagged where it happens,
     but a headline saying the studio collects 104% of what it bills is a
     number that makes somebody distrust the whole screen. */
  return Math.min(1, collected / invoiced);
}

/** Clients grouped by service, which is how you asked to see them. */
export function getClientsByService() {
  const out = new Map<string, Client[]>();
  for (const c of getClients()) {
    for (const s of c.services) {
      const list = out.get(s) ?? [];
      list.push(c);
      out.set(s, list);
    }
  }
  return out;
}

/** Money in and out by month, newest last, for the chart on the money screen. */
export function getMonthly(months = 6) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const key = (s: string) => s.slice(0, 7);
  return keys.map((k) => ({
    month: k,
    label: new Date(`${k}-01`).toLocaleString("en-GB", { month: "short" }),
    /* `!p.reversed`: a bounced transfer is not income in the month it bounced,
       and it was never income in the month it arrived either. A cashflow chart
       that counts it is a chart that disagrees with the invoice totals beside
       it, which is the sort of thing somebody spots in a board meeting. */
    in: getPayments().filter((p) => key(p.at) === k && !p.reversed).reduce((n, p) => n + p.amount, 0),
    out: getExpenses().filter((e) => key(e.at) === k).reduce((n, e) => n + e.amount, 0),
  }));
}

/* ------------------------------------------------------------- the writes */

/**
 * EVERYTHING THAT CHANGES A ROW GOES THROUGH HERE.
 *
 * Said plainly, because a screen that looks like it saves and does not is
 * worse than one that never offered: these write to the arrays above, which
 * live in a module. That means the change is real for this server process and
 * survives navigation, and it does NOT survive a redeploy, a cold start, or a
 * second instance picking up the next request. It is the shape of the write
 * path, with the storage still to be plugged in underneath. When the database
 * is provisioned, each body below becomes the Drizzle statement that already
 * has a table waiting for it in lib/db/schema.ts, and no caller changes.
 *
 * The rules the storage swap must preserve are the ones enforced here rather
 * than in the screens:
 *
 *   - an id is minted here, never accepted from a caller
 *   - an invoice number is issued in sequence and never reused
 *   - `paid` is a SUM OF PAYMENTS, recomputed, never adjusted in place
 *   - a payment lands at most once per reference
 */

/* Monotonic within the process, prefixed so an id says what it is. Real rows
   get a UUID from the database default; this only has to be unique here. */
let seq = 1000;
const mint = (p: string) => `${p}${++seq}`;
const now = () => new Date().toISOString();

/**
 * The unguessable half of a public document URL.
 *
 * FROM A CRYPTOGRAPHIC SOURCE, NOT Math.random. This is the ONLY thing
 * standing between a printed invoice's QR code and every other invoice the
 * studio has raised, so its randomness is the whole security property.
 *
 * BASE64URL, NOT HEX, AND THE REASON IS THE QR CODE. 16 bytes is 128 bits
 * either way -- guessing one is not a thing that happens -- but hex spends 32
 * characters saying it and base64url spends 22. Those ten characters are not
 * cosmetic: the token goes in a URL that goes in a QR code, a longer string
 * needs more modules, and more modules at the same printed size is a code a
 * camera cannot read. Measured: the hex version would not decode below 160px.
 *
 * `+` and `/` are replaced because this ends up in a path, and `=` padding is
 * dropped because it carries no information.
 */
const token = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/* --------------------------------------------------------------- clients */

export type ClientDraft = Omit<Client, "id" | "since" | "archived">;

export function addClient(d: ClientDraft, actor = "Studio"): Client {
  const c: Client = { ...d, id: mint("c"), since: now() };
  audit({ actor, kind: "client", subjectId: c.id, subject: c.company, action: "added" });
  CLIENTS.push(c);
  return c;
}

export function patchClient(id: Id, d: Partial<ClientDraft>, actor = "Studio"): Client | null {
  const c = getClient(id);
  if (!c) return null;
  /* ONE ENTRY PER FIELD THAT ACTUALLY MOVED. A single "edited" entry cannot
     answer the question the log exists for, which is always about one field;
     and writing an entry for a field somebody opened and left alone fills the
     record with noise that hides the changes that matter. */
  for (const [k, v] of Object.entries(d) as [keyof ClientDraft, unknown][]) {
    const before = c[k];
    const from = Array.isArray(before) ? before.join(", ") : String(before ?? "");
    const to = Array.isArray(v) ? v.join(", ") : String(v ?? "");
    if (from === to) continue;
    audit({ actor, kind: "client", subjectId: c.id, subject: c.company, action: "edited", field: k, from, to });
  }
  Object.assign(c, d);
  return c;
}

/**
 * Archive, not delete.
 *
 * A client is referenced by projects, invoices and payments, and those are the
 * financial record. Removing the row would orphan them and quietly break the
 * year's reporting, so the row stays and drops out of the lists.
 */
export function archiveClient(id: Id, archived = true, actor = "Studio"): Client | null {
  const c = getClient(id);
  if (!c) return null;
  c.archived = archived;
  audit({ actor, kind: "client", subjectId: c.id, subject: c.company,
          action: archived ? "archived" : "taken out of the archive" });
  return c;
}

/* -------------------------------------------------------------- projects */

export function addProject(d: {
  clientId: Id; title: string; service: Project["service"];
  stage: Stage; due: string | null;
  owner?: string; health?: Health; channel?: Channel;
  budget?: number | null; scope?: string;
}): Project {
  /* DEFAULTS THAT ARE HONEST. A new project is on track because nothing has
     gone wrong yet, and its channel is the dashboard because that is the one
     route we can be sure exists before anybody has agreed anything else. An
     owner and a budget are left as the caller gave them: inventing either
     would put a name and a figure on a record that nobody agreed to. */
  const p: Project = {
    ...d, id: mint("p"),
    owner: d.owner ?? "",
    health: d.health ?? "On track",
    channel: d.channel ?? "Client dashboard",
    budget: d.budget ?? null,
    events: [{ at: now(), text: `Project opened at ${d.stage}` }],
  };
  PROJECTS.push(p);
  audit({ actor: p.owner || "Studio", kind: "project", subjectId: p.id, subject: p.title,
          action: "opened", note: `at ${d.stage}` });
  return p;
}

/**
 * Moving a stage is an EVENT, not a field assignment.
 *
 * The stage on the row is only ever the latest entry in a history that is
 * appended to and never rewritten, which is what makes "how long did this sit
 * in Review" answerable later. Moving to the stage it is already on is a
 * no-op rather than a duplicate line in the history.
 */
export function setStage(id: Id, stage: Stage, note?: string, actor = "Studio"): Project | null {
  const p = getProject(id);
  if (!p || p.stage === stage) return p;
  const was = p.stage;
  p.stage = stage;
  p.events.push({ at: now(), text: note ? `Moved to ${stage}. ${note}` : `Moved to ${stage}` });
  audit({ actor, kind: "project", subjectId: p.id, subject: p.title,
          action: "moved", field: "stage", from: was, to: stage, note });
  return p;
}

export function addProjectNote(id: Id, text: string): Project | null {
  const p = getProject(id);
  if (!p) return null;
  p.events.push({ at: now(), text });
  return p;
}

export function setProjectDue(id: Id, due: string | null): Project | null {
  const p = getProject(id);
  if (!p) return null;
  p.due = due;
  p.events.push({ at: now(), text: due ? `Due date set to ${due.slice(0, 10)}` : "Due date cleared" });
  return p;
}

/* --------------------------------------------------------------- invoices */

/**
 * The next number in the year's run.
 *
 * INV-YYYY-NNN, taken from the highest number already issued in that year
 * rather than from a count, because a count reuses a number the moment
 * anything is ever removed, and two invoices sharing a number is the kind of
 * thing an auditor asks about.
 */
export function nextInvoiceNumber(year = new Date().getFullYear()): string {
  const prefix = `INV-${year}-`;
  const highest = INVOICES
    .filter((i) => i.number.startsWith(prefix))
    .reduce((n, i) => Math.max(n, Number(i.number.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

/**
 * The next receipt number for the year.
 *
 * Same shape and same contract as `nextInvoiceNumber`: issued in order, never
 * reused, and derived from the highest one already taken rather than from a
 * count -- reversing a payment removes a row, and a count would then hand the
 * next receipt a number that has already been printed and posted.
 */
export function nextReceiptNumber(year = new Date().getFullYear()): string {
  const prefix = `RCT-${year}-`;
  const highest = PAYMENTS
    .filter((p) => p.receiptNo.startsWith(prefix))
    .reduce((n, p) => Math.max(n, Number(p.receiptNo.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

export function addInvoice(d: {
  clientId: Id; projectId: Id | null; issued: string; due: string;
  vatRate: number; lines: Invoice["lines"]; status: "Draft" | "Sent";
}): Invoice {
  const inv: Invoice = {
    ...d, id: mint("i"), number: nextInvoiceNumber(), token: token(), paid: 0,
  };
  INVOICES.push(inv);
  audit({ actor: "Studio", kind: "invoice", subjectId: inv.id, subject: inv.number,
          action: d.status === "Draft" ? "drafted" : "raised",
          note: naira(invoiceTotals(inv).total) });
  return inv;
}

export function patchInvoice(
  id: Id,
  d: Partial<Pick<Invoice, "clientId" | "projectId" | "issued" | "due" | "vatRate" | "lines">>,
): Invoice | null {
  const inv = getInvoice(id);
  if (!inv) return null;
  Object.assign(inv, d);
  return inv;
}

/**
 * A draft becomes an invoice once, and cannot go back.
 *
 * Issuing is the moment the number is committed to somebody outside the
 * studio. Letting a sent invoice return to draft so its lines can be edited is
 * how the copy the client is holding stops matching the copy in the system.
 */
export function sendInvoice(id: Id, actor = "Studio"): Invoice | null {
  const inv = getInvoice(id);
  if (!inv || inv.status !== "Draft") return inv;
  inv.status = "Sent";
  inv.issued = now();
  audit({ actor, kind: "invoice", subjectId: inv.id, subject: inv.number,
          action: "issued", field: "status", from: "Draft", to: "Sent",
          note: naira(invoiceTotals(inv).total) });
  return inv;
}

/** Drafts only, for the same reason. Anything issued is deleted by crediting it. */
export function deleteDraftInvoice(id: Id, actor = "Studio"): boolean {
  const at = INVOICES.findIndex((i) => i.id === id && i.status === "Draft");
  if (at < 0) return false;
  const [gone] = INVOICES.splice(at, 1);
  /* The row goes and the ENTRY STAYS. This is the only destructive operation
     in the money module -- drafts only, because an issued invoice is a
     document somebody outside the studio is holding -- and "an invoice that
     existed yesterday is not in the list today" is exactly the question an
     audit log is for. */
  audit({ actor, kind: "invoice", subjectId: gone.id, subject: gone.number,
          action: "deleted while still a draft",
          note: naira(invoiceTotals(gone).total) });
  return true;
}

/* --------------------------------------------------------------- payments */

export type ApplyResult =
  | { ok: true; payment: Payment; invoice: Invoice; overpaid: boolean }
  | { ok: false; reason: "no-invoice" | "duplicate" | "not-positive" | "draft" };

/**
 * THE ONE PLACE A PAYMENT BECOMES MONEY.
 *
 * The Paystack webhook, the browser returning from the checkout, and a person
 * ticking "mark as paid" are three routes to the same event, and they race:
 * the webhook and the redirect routinely arrive within the same second for the
 * same transaction. If each one added a row, the client would be shown as
 * having paid twice, and a refund would follow.
 *
 * So the reference is the idempotency key. It is the Paystack transaction
 * reference where there is one, and a typed bank reference where there is not,
 * and the same reference presented twice is accepted quietly the second time
 * without adding anything. lib/db/schema.ts carries a unique index on it, so
 * the database refuses the duplicate even if two instances check at once and
 * both decide it is new.
 *
 * `paid` is then RECOMPUTED from the payments rather than incremented. An
 * increment is a read and a write with a gap in between, and two of them
 * overlapping loses one. A sum cannot drift from the rows it sums.
 *
 * Overpayment is flagged, not rejected. The money has genuinely arrived; the
 * studio needs to see it and decide, and silently swallowing the excess is the
 * one outcome that is certainly wrong.
 */
export function applyPayment(d: {
  invoiceId: Id; amount: number; method: Payment["method"];
  reference: string; at?: string;
  /** Who is recording it. A payment with no name against it is not auditable,
      so this falls back to a label rather than to an empty string. */
  by?: string;
  note?: string;
}): ApplyResult {
  const inv = getInvoice(d.invoiceId);
  if (!inv) return { ok: false, reason: "no-invoice" };
  if (inv.status === "Draft") return { ok: false, reason: "draft" };
  if (!Number.isFinite(d.amount) || d.amount <= 0) return { ok: false, reason: "not-positive" };

  const ref = d.reference.trim();
  const seen = PAYMENTS.find((p) => p.reference === ref);
  if (seen) return { ok: false, reason: "duplicate" };

  /* EVERY SUCCESSFUL PAYMENT GETS A RECEIPT, whatever the method. A Paystack
     payment and a hundred naira handed over in cash are the same event as far
     as the client is concerned -- they paid, and they are owed a document
     saying so. Numbering it here rather than on demand means the number is
     assigned once, in order, and cannot change if the receipt is reprinted. */
  const payment: Payment = {
    id: mint("y"), invoiceId: inv.id, at: d.at ?? now(),
    amount: Math.round(d.amount), method: d.method, reference: ref,
    receiptNo: nextReceiptNumber(), token: token(),
    by: d.by?.trim() || "Studio",
    note: d.note?.trim() || undefined,
  };
  PAYMENTS.push(payment);
  audit({ actor: payment.by, kind: "payment", subjectId: payment.id, subject: payment.receiptNo,
          action: "recorded", to: naira(payment.amount),
          note: `${payment.method} · ${payment.reference} · against ${inv.number}` });

  inv.paid = collected(inv.id);

  return { ok: true, payment, invoice: inv, overpaid: inv.paid > invoiceTotals(inv).total };
}

/** Reverses one payment and re-sums, for a bounced transfer or a typo. */
/**
 * Take a payment back off the books WITHOUT taking it off the record.
 *
 * The row stays, annotated. A receipt has its own public URL and has usually
 * been sent to the client, so removing the row would turn a document somebody
 * is holding into a 404 with no explanation -- and books that correct
 * themselves by deleting rows cannot answer "there was a payment here last
 * month". The receipt still resolves; it now says REVERSED and why.
 *
 * Reversing twice is a no-op rather than an error. The button can be pressed
 * again on a stale page, and the honest answer to "reverse this already
 * reversed payment" is that it is already done.
 */
export function reversePayment(id: Id, reason = "", actor = "Studio"): boolean {
  const p = PAYMENTS.find((x) => x.id === id);
  if (!p || p.reversed) return false;
  p.reversed = { at: now(), by: actor, reason: reason.trim() };
  const inv = getInvoice(p.invoiceId);
  if (inv) inv.paid = collected(inv.id);
  audit({ actor, kind: "payment", subjectId: p.id, subject: p.receiptNo,
          action: "reversed", from: naira(p.amount), to: naira(0),
          note: [`${p.method} · ${p.reference}`, inv ? `against ${inv.number}` : null, reason.trim() || null]
            .filter(Boolean).join(" · ") });
  return true;
}

/* --------------------------------------------------------------- expenses */

export function addExpense(d: Omit<Expense, "id">, actor = "Studio"): Expense {
  const e: Expense = { ...d, id: mint("e") };
  audit({ actor, kind: "expense", subjectId: e.id, subject: e.description,
          action: "recorded", note: `${naira(e.amount)} · ${e.category}` });
  EXPENSES.push(e);
  return e;
}

export function deleteExpense(id: Id, actor = "Studio"): boolean {
  const at = EXPENSES.findIndex((e) => e.id === id);
  if (at < 0) return false;
  const [gone] = EXPENSES.splice(at, 1);
  audit({ actor, kind: "expense", subjectId: gone.id, subject: gone.description,
          action: "removed", note: `${naira(gone.amount)} · ${gone.category}` });
  return true;
}

/* ------------------------------------------------------------ submissions */

/**
 * Attach an onboarding form to a client, or make the client it describes.
 *
 * A form arrives from somebody who may not be on the books yet, so the useful
 * action on an unattached submission is "this is a new client", and the answers
 * already carry the name, company, email and phone it needs.
 */
export function linkSubmission(id: Id, clientId: Id): Submission | null {
  const s = getSubmission(id);
  if (!s) return null;
  s.clientId = clientId;
  return s;
}

export function clientFromSubmission(id: Id): Client | null {
  const s = getSubmission(id);
  if (!s || s.clientId) return null;
  const one = (k: string) => {
    const v = s.answers[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const name = [one("first_name"), one("last_name")].filter(Boolean).join(" ").trim();
  const c = addClient({
    name: name || one("company") || "Unnamed",
    company: one("company") || name || "Unnamed",
    email: one("email"),
    phone: one("phone"),
    services: [s.service],
    sector: one("industry"),
    notes: `Created from the ${s.service} onboarding form.`,
  });
  s.clientId = c.id;
  return c;
}

/* --------------------------------------------------------------- settings */

/**
 * Content overrides, keyed by field.
 *
 * THE SAFE SHAPE IS AN OVERRIDE, NOT A REPLACEMENT, and the reason is in the
 * derivation chains: WORK_CATEGORIES is computed from SERVICES, the sitemap
 * from WORK_CATEGORIES and CASE_STUDIES, and the embed allowlist from
 * PROJECTS. Editing those wholesale means one bad save can empty a page and
 * nobody finds out until a client does.
 *
 * So an edit writes one row. The worst it can do is change one value, and
 * clearing the row restores exactly what shipped in git -- which is why
 * `clearSetting` exists and why the screen can always say which rows are
 * carrying an override.
 *
 * Same lifetime as everything else in this file: in memory, gone on restart.
 * Moving it to CockroachDB is this map becoming a table with the same two
 * columns.
 */
const SETTINGS = new Map<string, string>();

export function getSettings(): Record<string, string> {
  return Object.fromEntries(SETTINGS);
}

export function getSetting(key: string): string | null {
  return SETTINGS.get(key) ?? null;
}

export function setSetting(key: string, value: string, actor = "Studio"): boolean {
  const trimmed = value.trim();
  if (!key || !trimmed) return false;
  const was = SETTINGS.get(key);
  SETTINGS.set(key, trimmed);
  /* `from` is what the site was SHOWING, which is the override if there was
     one and "what shipped in git" if there was not. Saying "(shipped value)"
     rather than copying the literal keeps the log honest about the difference
     between "somebody changed it back" and "nobody had touched it". */
  audit({ actor, kind: "setting", subjectId: key, subject: key,
          action: was === undefined ? "overridden" : "changed",
          field: key, from: was ?? "(what shipped)", to: trimmed });
  return true;
}

/** Clearing the row is how an edit is undone; there is no "restore" copy. */
export function clearSetting(key: string, actor = "Studio"): boolean {
  const was = SETTINGS.get(key);
  const had = SETTINGS.delete(key);
  if (had) {
    audit({ actor, kind: "setting", subjectId: key, subject: key,
            action: "put back to what shipped", field: key,
            from: was ?? "", to: "(what shipped)" });
  }
  return had;
}

/* ============================================================ delivery ====
   Tasks, updates and deliverables.

   THREE FLAT MAPS KEYED BY PROJECT rather than arrays nested inside the
   project record. A project is read on every list screen and the board; the
   tasks under it are read on one. Nesting them means every board render
   carries every task of every project for nothing, and it makes "all tasks due
   this week across every project" -- which is the dashboard's question -- a
   walk over projects instead of one filter.

   Same in-memory caveat as everything else here: this survives until the
   server restarts. The shapes are what the CockroachDB tables will return, so
   swapping the storage is this module changing and nothing above it.
   ========================================================================= */

const TASKS: Task[] = [
  { id: "t1", projectId: "p1", title: "Send the three routes with rationale", assignee: "Babatope",
    due: iso("2026-09-08"), priority: "High", done: true, doneAt: iso("2026-09-08"), blockedBy: null },
  { id: "t2", projectId: "p1", title: "Chase Tobi for a pick", assignee: "Babatope",
    due: iso("2026-09-15"), priority: "High", done: false, doneAt: null, blockedBy: null },
  { id: "t3", projectId: "p1", title: "Build the guideline set on the chosen route", assignee: "Ada",
    due: iso("2026-09-24"), priority: "Normal", done: false, doneAt: null, blockedBy: "t2" },
  { id: "t4", projectId: "p5", title: "Rework the driver assignment screen", assignee: "Femi",
    due: iso("2026-09-19"), priority: "High", done: false, doneAt: null, blockedBy: null },
  { id: "t5", projectId: "p5", title: "Re-run the load test after the rework", assignee: "Femi",
    due: iso("2026-10-02"), priority: "Normal", done: false, doneAt: null, blockedBy: "t4" },
  { id: "t6", projectId: "p3", title: "September content calendar", assignee: "Ada",
    due: iso("2026-09-01"), priority: "Normal", done: true, doneAt: iso("2026-08-29"), blockedBy: null },
  { id: "t7", projectId: "p6", title: "Get the registration certificate for the mark", assignee: "Babatope",
    due: iso("2026-09-05"), priority: "High", done: false, doneAt: null, blockedBy: null },
];

const UPDATES: Update[] = [
  { id: "u1", projectId: "p1", at: iso("2026-09-08"), author: "Babatope", health: "Waiting on client",
    progress: "Three identity routes sent, each with the reasoning and a mock in situ.",
    blockers: "We need a pick before the guideline work can start.",
    next: "Tobi picks a route. We build it out the same week.", clientVisible: true },
  { id: "u2", projectId: "p1", at: iso("2026-09-11"), author: "Babatope", health: "Waiting on client",
    progress: "No reply on the routes yet.",
    blockers: "Three days of silence on WhatsApp.",
    next: "Call rather than message. If nothing by Monday, flag the date risk.", clientVisible: false },
  { id: "u3", projectId: "p5", at: iso("2026-09-05"), author: "Femi", health: "At risk",
    progress: "Revisions on dispatch are underway; the assignment screen is the big one.",
    blockers: "The rework pushes the load test into October.",
    next: "Assignment screen this week, load test straight after.", clientVisible: true },
];

const DELIVERABLES: Deliverable[] = [
  { id: "d1", projectId: "p1", name: "Identity routes",
    versions: [
      { v: 1, at: iso("2026-09-08"), note: "Three routes, each with rationale." },
    ],
    approval: "Awaiting client" },
  { id: "d2", projectId: "p4", name: "Listings site",
    versions: [
      { v: 1, at: iso("2026-07-10"), note: "Staging build for review." },
      { v: 2, at: iso("2026-07-22"), note: "Enquiry routing and agent profiles added." },
      { v: 3, at: iso("2026-07-24"), note: "Live." },
    ],
    approval: "Approved" },
  { id: "d3", projectId: "p5", name: "Dispatch platform, beta",
    versions: [{ v: 1, at: iso("2026-08-28"), note: "Beta for internal testing." }],
    approval: "Revision requested",
    approvalNote: "Assignment screen is confusing when two drivers are equidistant." },
];

/* ------------------------------------------------------------------ reads */

export function getTasksFor(projectId: Id) {
  /* Open work first, then what is finished, each by date. Somebody opening a
     project is asking what is left, not what is done. */
  return TASKS.filter((t) => t.projectId === projectId).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.due ?? "9999").localeCompare(b.due ?? "9999");
  });
}
export function getTasks() {
  return TASKS.slice();
}
export function getUpdatesFor(projectId: Id) {
  return UPDATES.filter((u) => u.projectId === projectId).sort((a, b) => b.at.localeCompare(a.at));
}
export function getDeliverablesFor(projectId: Id) {
  return DELIVERABLES.filter((d) => d.projectId === projectId);
}
export function getDeliverable(id: Id) {
  return DELIVERABLES.find((d) => d.id === id) ?? null;
}

/* ----------------------------------------------------------------- writes */

export function addTask(d: {
  projectId: Id; title: string; assignee: string;
  due: string | null; priority: Priority; blockedBy: Id | null;
}): Task | null {
  if (!PROJECTS.some((p) => p.id === d.projectId)) return null;
  /* A dependency has to be a real task ON THE SAME PROJECT. Accepting any id
     would let a form point one project's task at another's, which is not a
     relationship this screen can draw or anybody can reason about. */
  const dep = d.blockedBy && TASKS.find((t) => t.id === d.blockedBy && t.projectId === d.projectId)
    ? d.blockedBy : null;
  const t: Task = { ...d, blockedBy: dep, id: mint("t"), done: false, doneAt: null };
  TASKS.push(t);
  return t;
}

/**
 * Tick or untick, and say so on the project's history.
 *
 * The history line is the point: a task quietly going green tells the person
 * who ticked it and nobody else. `addProjectNote` is what makes it visible to
 * whoever opens the project next week.
 */
export function setTaskDone(id: Id, done: boolean): Task | null {
  const t = TASKS.find((x) => x.id === id);
  if (!t) return null;
  t.done = done;
  t.doneAt = done ? now() : null;
  addProjectNote(t.projectId, done ? `Done: ${t.title}` : `Reopened: ${t.title}`);
  return t;
}

/** Removing a task also clears anything that was waiting on it, or the
    dependency would point at an id that no longer exists and the task would
    look permanently stuck. */
export function deleteTask(id: Id): boolean {
  const i = TASKS.findIndex((t) => t.id === id);
  if (i < 0) return false;
  TASKS.splice(i, 1);
  for (const t of TASKS) if (t.blockedBy === id) t.blockedBy = null;
  return true;
}

/**
 * Post an update, and move the project's health with it.
 *
 * ONE ACTION, NOT TWO. Health that is set on a separate control drifts: the
 * update says "blocked, three days of silence" and the badge still says on
 * track because nobody remembered the second step. Writing the update IS how
 * health changes, so the two cannot disagree.
 */
export function addUpdate(d: {
  projectId: Id; author: string; health: Health;
  progress: string; blockers: string; next: string; clientVisible: boolean;
}): Update | null {
  const p = PROJECTS.find((x) => x.id === d.projectId);
  if (!p) return null;
  const u: Update = { ...d, id: mint("u"), at: now() };
  UPDATES.push(u);
  if (p.health !== d.health) {
    addProjectNote(p.id, `Health moved to ${d.health}`);
    p.health = d.health;
  }
  addProjectNote(p.id, d.clientVisible ? "Update posted, visible to the client" : "Internal note added");
  return u;
}

export function addDeliverable(d: { projectId: Id; name: string; note: string; url?: string }): Deliverable | null {
  if (!PROJECTS.some((p) => p.id === d.projectId)) return null;
  const item: Deliverable = {
    id: mint("d"), projectId: d.projectId, name: d.name,
    versions: [{ v: 1, at: now(), note: d.note, url: d.url }],
    approval: "Not sent",
  };
  DELIVERABLES.push(item);
  addProjectNote(d.projectId, `Deliverable added: ${d.name}`);
  return item;
}

/** A new version is appended and numbered from the last one. Nothing is
    overwritten -- see the note on the type for why that matters. */
export function addVersion(id: Id, note: string, url?: string): Deliverable | null {
  const d = DELIVERABLES.find((x) => x.id === id);
  if (!d) return null;
  const v = (d.versions[d.versions.length - 1]?.v ?? 0) + 1;
  d.versions.push({ v, at: now(), note, url });
  /* A new version supersedes whatever the last one was told: an approval given
     for v2 is not an approval of v3. */
  d.approval = "Not sent";
  d.approvalNote = undefined;
  addProjectNote(d.projectId, `${d.name} v${v} added`);
  return d;
}

export function setApproval(id: Id, approval: Approval, note?: string): Deliverable | null {
  const d = DELIVERABLES.find((x) => x.id === id);
  if (!d) return null;
  d.approval = approval;
  d.approvalNote = approval === "Revision requested" ? (note || undefined) : undefined;
  addProjectNote(d.projectId, `${d.name}: ${approval.toLowerCase()}`);
  return d;
}

export function patchProject(id: Id, d: Partial<Pick<Project,
  "owner" | "health" | "channel" | "budget" | "scope" | "title">>): Project | null {
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) return null;
  if (d.health && d.health !== p.health) addProjectNote(id, `Health moved to ${d.health}`);
  if (d.owner && d.owner !== p.owner) addProjectNote(id, `Owner is now ${d.owner}`);
  if (d.channel && d.channel !== p.channel) addProjectNote(id, `Updates now go through ${d.channel}`);
  Object.assign(p, d);
  return p;
}

/**
 * Filed away, with everything it owns left exactly where it is.
 *
 * Same contract as archiving a client: the invoices, payments, updates,
 * approvals and file versions are the record of what happened and what was
 * agreed, so archiving hides the project from the working lists and touches
 * nothing else. There is no delete.
 */
export function archiveProject(id: Id, archived = true, actor = "Studio"): Project | null {
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) return null;
  p.archived = archived;
  addProjectNote(id, archived ? "Archived" : "Taken out of the archive");
  audit({ actor, kind: "project", subjectId: p.id, subject: p.title,
          action: archived ? "archived" : "taken out of the archive" });
  return p;
}

/* ============================================================== the record
   The audit log.

   APPEND-ONLY, ENFORCED BY THERE BEING NOWHERE TO WRITE FROM. The array is
   module-private and the only export that touches it is `audit()`, which
   pushes. There is no update, no delete and no way to reach the array from
   outside this file, so "append-only" is a property of the code rather than a
   promise in a comment.

   Reads are newest first, because the question is almost always "what just
   happened", and bounded, because an unbounded list on a screen is a page that
   gets slower every week it is used.
   ========================================================================= */

const AUDIT: AuditEntry[] = [];

export function audit(d: Omit<AuditEntry, "id" | "at"> & { at?: string }): AuditEntry {
  const entry: AuditEntry = { ...d, id: mint("a"), at: d.at ?? now() };
  AUDIT.push(entry);
  return entry;
}

export function getAudit(opts: { kind?: AuditKind; subjectId?: Id; limit?: number } = {}) {
  const { kind, subjectId, limit = 100 } = opts;
  return AUDIT
    .filter((e) => (!kind || e.kind === kind) && (!subjectId || e.subjectId === subjectId))
    .slice()
    .reverse()
    .slice(0, limit);
}

/** How many entries there are in total, so a bounded list can say what it is
    bounded out of rather than implying it is everything. */
export function auditCount(opts: { kind?: AuditKind; subjectId?: Id } = {}) {
  const { kind, subjectId } = opts;
  return AUDIT.filter((e) => (!kind || e.kind === kind) && (!subjectId || e.subjectId === subjectId)).length;
}
