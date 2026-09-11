import type {
  Client, Expense, Id, Invoice, Payment, Project, Stage, Submission,
} from "./types";
import { invoiceTotals } from "./types";

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
    events: [
      { at: iso("2026-08-02"), text: "Moved to Discovery" },
      { at: iso("2026-08-19"), text: "Moved to In progress" },
      { at: iso("2026-09-08"), text: "Moved to Review. Three routes sent." },
    ],
  },
  {
    id: "p2", clientId: "c1", title: "Shop rebuild", service: "web",
    stage: "Onboarding", due: null,
    events: [{ at: iso("2026-09-09"), text: "Project opened" }],
  },
  {
    id: "p3", clientId: "c2", title: "Always-on social", service: "social",
    stage: "In progress", due: iso("2026-12-19"),
    events: [
      { at: iso("2026-04-08"), text: "Moved to Discovery" },
      { at: iso("2026-04-30"), text: "Moved to In progress" },
    ],
  },
  {
    id: "p4", clientId: "c3", title: "Listings site", service: "web",
    stage: "Delivered", due: iso("2026-07-31"),
    events: [
      { at: iso("2026-03-01"), text: "Moved to In progress" },
      { at: iso("2026-07-24"), text: "Moved to Delivered" },
    ],
  },
  {
    id: "p5", clientId: "c5", title: "Dispatch platform", service: "software",
    stage: "Revisions", due: iso("2026-10-10"),
    events: [
      { at: iso("2026-06-02"), text: "Moved to In progress" },
      { at: iso("2026-09-01"), text: "Moved to Revisions" },
    ],
  },
  {
    id: "p6", clientId: "c4", title: "Charity mark", service: "branding",
    stage: "Discovery", due: iso("2026-10-31"),
    events: [{ at: iso("2026-09-02"), text: "Moved to Discovery" }],
  },
];

const INVOICES: Invoice[] = [
  {
    id: "i1", number: "INV-2026-001", clientId: "c1", projectId: "p1",
    status: "Sent", issued: iso("2026-08-01"), due: iso("2026-08-31"), vatRate: 7.5,
    lines: [
      { description: "Identity system, first stage", qty: 1, unit: N(450_000) },
      { description: "Brand guidelines", qty: 1, unit: N(180_000) },
    ],
    paid: N(300_000),
  },
  {
    id: "i2", number: "INV-2026-002", clientId: "c2", projectId: "p3",
    status: "Sent", issued: iso("2026-07-05"), due: iso("2026-08-04"), vatRate: 7.5,
    lines: [{ description: "Social management, July", qty: 1, unit: N(250_000) }],
    paid: 0,
  },
  {
    id: "i3", number: "INV-2026-003", clientId: "c3", projectId: "p4",
    status: "Sent", issued: iso("2026-07-25"), due: iso("2026-08-24"), vatRate: 7.5,
    lines: [
      { description: "Listings site build", qty: 1, unit: N(1_400_000) },
      { description: "Search optimisation setup", qty: 1, unit: N(220_000) },
    ],
    paid: N(1_741_000),
  },
  {
    id: "i4", number: "INV-2026-004", clientId: "c5", projectId: "p5",
    status: "Draft", issued: iso("2026-09-09"), due: iso("2026-10-09"), vatRate: 7.5,
    lines: [{ description: "Dispatch platform, milestone two", qty: 1, unit: N(900_000) }],
    paid: 0,
  },
];

const PAYMENTS: Payment[] = [
  { id: "y1", invoiceId: "i1", at: iso("2026-08-06"), amount: N(300_000), method: "Paystack", reference: "PSK_8fj2k1" },
  { id: "y2", invoiceId: "i3", at: iso("2026-07-30"), amount: N(1_000_000), method: "Transfer", reference: "TRF_0091" },
  { id: "y3", invoiceId: "i3", at: iso("2026-08-14"), amount: N(741_000), method: "Paystack", reference: "PSK_11ba7c" },
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
export function getProjects() {
  return PROJECTS.slice();
}
export function getProjectsFor(clientId: Id) {
  return PROJECTS.filter((p) => p.clientId === clientId);
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
    in: getPayments().filter((p) => key(p.at) === k).reduce((n, p) => n + p.amount, 0),
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

/* --------------------------------------------------------------- clients */

export type ClientDraft = Omit<Client, "id" | "since" | "archived">;

export function addClient(d: ClientDraft): Client {
  const c: Client = { ...d, id: mint("c"), since: now() };
  CLIENTS.push(c);
  return c;
}

export function patchClient(id: Id, d: Partial<ClientDraft>): Client | null {
  const c = getClient(id);
  if (!c) return null;
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
export function archiveClient(id: Id, archived = true): Client | null {
  const c = getClient(id);
  if (!c) return null;
  c.archived = archived;
  return c;
}

/* -------------------------------------------------------------- projects */

export function addProject(d: {
  clientId: Id; title: string; service: Project["service"];
  stage: Stage; due: string | null;
}): Project {
  const p: Project = {
    ...d, id: mint("p"),
    events: [{ at: now(), text: `Project opened at ${d.stage}` }],
  };
  PROJECTS.push(p);
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
export function setStage(id: Id, stage: Stage, note?: string): Project | null {
  const p = getProject(id);
  if (!p || p.stage === stage) return p;
  p.stage = stage;
  p.events.push({ at: now(), text: note ? `Moved to ${stage}. ${note}` : `Moved to ${stage}` });
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

export function addInvoice(d: {
  clientId: Id; projectId: Id | null; issued: string; due: string;
  vatRate: number; lines: Invoice["lines"]; status: "Draft" | "Sent";
}): Invoice {
  const inv: Invoice = { ...d, id: mint("i"), number: nextInvoiceNumber(), paid: 0 };
  INVOICES.push(inv);
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
export function sendInvoice(id: Id): Invoice | null {
  const inv = getInvoice(id);
  if (!inv || inv.status !== "Draft") return inv;
  inv.status = "Sent";
  inv.issued = now();
  return inv;
}

/** Drafts only, for the same reason. Anything issued is deleted by crediting it. */
export function deleteDraftInvoice(id: Id): boolean {
  const at = INVOICES.findIndex((i) => i.id === id && i.status === "Draft");
  if (at < 0) return false;
  INVOICES.splice(at, 1);
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
}): ApplyResult {
  const inv = getInvoice(d.invoiceId);
  if (!inv) return { ok: false, reason: "no-invoice" };
  if (inv.status === "Draft") return { ok: false, reason: "draft" };
  if (!Number.isFinite(d.amount) || d.amount <= 0) return { ok: false, reason: "not-positive" };

  const ref = d.reference.trim();
  const seen = PAYMENTS.find((p) => p.reference === ref);
  if (seen) return { ok: false, reason: "duplicate" };

  const payment: Payment = {
    id: mint("y"), invoiceId: inv.id, at: d.at ?? now(),
    amount: Math.round(d.amount), method: d.method, reference: ref,
  };
  PAYMENTS.push(payment);

  inv.paid = PAYMENTS
    .filter((p) => p.invoiceId === inv.id)
    .reduce((n, p) => n + p.amount, 0);

  return { ok: true, payment, invoice: inv, overpaid: inv.paid > invoiceTotals(inv).total };
}

/** Reverses one payment and re-sums, for a bounced transfer or a typo. */
export function reversePayment(id: Id): boolean {
  const at = PAYMENTS.findIndex((p) => p.id === id);
  if (at < 0) return false;
  const [gone] = PAYMENTS.splice(at, 1);
  const inv = getInvoice(gone.invoiceId);
  if (inv) {
    inv.paid = PAYMENTS.filter((p) => p.invoiceId === inv.id).reduce((n, p) => n + p.amount, 0);
  }
  return true;
}

/* --------------------------------------------------------------- expenses */

export function addExpense(d: Omit<Expense, "id">): Expense {
  const e: Expense = { ...d, id: mint("e") };
  EXPENSES.push(e);
  return e;
}

export function deleteExpense(id: Id): boolean {
  const at = EXPENSES.findIndex((e) => e.id === id);
  if (at < 0) return false;
  EXPENSES.splice(at, 1);
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
