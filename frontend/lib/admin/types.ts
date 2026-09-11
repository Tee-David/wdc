import type { ServiceSlug } from "@/lib/services";

/**
 * THE ADMIN'S DOMAIN, as types.
 *
 * Written here and not inferred from a database client on purpose: the screens
 * are built against these, the seed data satisfies these, and the Drizzle
 * schema in lib/db/schema.ts declares columns that produce these. Swapping the
 * in-memory store for a live CockroachDB is then one module changing, with the
 * compiler checking that the new one still returns the same shapes.
 *
 * MONEY IS IN KOBO, and never a float. 0.1 + 0.2 is not 0.3 in binary floating
 * point, and an invoice total that is out by a thousandth of a naira is an
 * invoice that does not reconcile. Every amount here is an integer of the
 * smallest unit, formatted only at the edge where a person reads it.
 */

export type Id = string;

/* ------------------------------------------------------------------ people */

export type Client = {
  id: Id;
  name: string;
  company: string;
  email: string;
  phone: string;
  /** What they buy from us. The admin groups by this, as you asked. */
  services: ServiceSlug[];
  sector: string;
  /** ISO date. */
  since: string;
  notes?: string;
  archived?: boolean;
};

/* ---------------------------------------------------------------- projects */

/**
 * The named stages a project moves through.
 *
 * ONE LIST FOR EVERY SERVICE, deliberately. Six services with six different
 * stage vocabularies means a dashboard that cannot answer "what is in
 * progress" without six special cases, and a client who buys two services
 * getting two different words for the same moment. The service says WHAT the
 * work is; the stage says WHERE it is.
 */
export const STAGES = [
  "Onboarding",
  "Discovery",
  "In progress",
  "Review",
  "Revisions",
  "Delivered",
] as const;
export type Stage = (typeof STAGES)[number];

export type Project = {
  id: Id;
  clientId: Id;
  title: string;
  service: ServiceSlug;
  stage: Stage;
  /** ISO date, or null when nothing has been agreed. */
  due: string | null;
  /** Appended to, never rewritten: it is the project's history. */
  events: { at: string; text: string }[];
};

/* ------------------------------------------------------------------- money */

export type InvoiceStatus = "Draft" | "Sent" | "Part paid" | "Paid" | "Overdue";

export type InvoiceLine = {
  description: string;
  qty: number;
  /** Kobo. See the note at the top. */
  unit: number;
};

export type Invoice = {
  id: Id;
  /** INV-YYYY-NNN, issued in order and never reused. */
  number: string;
  clientId: Id;
  projectId: Id | null;
  status: InvoiceStatus;
  issued: string;
  due: string;
  lines: InvoiceLine[];
  /** Percent, as a whole number. Nigeria is 7.5. */
  vatRate: number;
  /** Kobo actually received, summed from payments. */
  paid: number;
};

export type Payment = {
  id: Id;
  invoiceId: Id;
  at: string;
  amount: number;
  method: "Paystack" | "Transfer" | "Cash";
  reference: string;
};

export type Expense = {
  id: Id;
  at: string;
  description: string;
  category: string;
  amount: number;
};

/* ------------------------------------------------------------------- forms */

export type Submission = {
  id: Id;
  clientId: Id | null;
  service: ServiceSlug;
  /** Whether the client has sent it or is still filling it in. */
  status: "In progress" | "Submitted";
  startedAt: string;
  submittedAt: string | null;
  /** The flat map the onboarding form produces, keyed by field key. */
  answers: Record<string, string | string[]>;
};

/* ---------------------------------------------------------------- derived */

/** Line total in kobo, before tax. */
export function lineTotal(l: InvoiceLine) {
  return Math.round(l.qty * l.unit);
}

/**
 * Invoice arithmetic, in one place.
 *
 * NEVER TRUSTED FROM THE CLIENT and never stored: a total is a function of its
 * lines, so storing it invites the two to disagree, and accepting it from a
 * form invites somebody to send their own. Recomputed wherever it is needed,
 * which is cheap and cannot drift.
 */
export function invoiceTotals(inv: Invoice) {
  const subtotal = inv.lines.reduce((n, l) => n + lineTotal(l), 0);
  const vat = Math.round((subtotal * inv.vatRate) / 100);
  const total = subtotal + vat;
  return { subtotal, vat, total, due: Math.max(0, total - inv.paid) };
}

/** Kobo to "₦1,250,000.00". */
export function naira(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(kobo / 100);
}

/** Kobo to "₦1.25m" for tiles, where the decimals are noise. */
export function nairaShort(kobo: number) {
  const n = kobo / 100;
  if (Math.abs(n) >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}m`;
  if (Math.abs(n) >= 1_000) return `₦${Math.round(n / 1_000)}k`;
  return `₦${n.toFixed(0)}`;
}

/**
 * The status an invoice actually has, rather than the one stored on it.
 *
 * "Overdue" is not a state anybody sets, it is a state time creates: an
 * invoice becomes overdue while nobody is looking at it. Deriving it means it
 * is never stale, and it cannot be wrong because a nightly job did not run.
 */
export function invoiceStatus(inv: Invoice, today = new Date()): InvoiceStatus {
  const { total, due } = invoiceTotals(inv);
  if (inv.status === "Draft") return "Draft";
  if (inv.paid >= total && total > 0) return "Paid";
  if (due > 0 && new Date(inv.due) < today) return "Overdue";
  if (inv.paid > 0) return "Part paid";
  return "Sent";
}
