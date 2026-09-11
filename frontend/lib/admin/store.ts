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
