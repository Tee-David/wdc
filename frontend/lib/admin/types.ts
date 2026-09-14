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

/**
 * How the work is going, which is a different question from where it is.
 *
 * STAGE AND HEALTH ARE NOT THE SAME AXIS, and collapsing them is the mistake
 * most project tools make. A project can sit in "In progress" for six weeks
 * either because it is going fine or because nobody has answered an email
 * since July, and a board coloured by stage cannot tell those apart. Stage is
 * where the work has got to; health is whether it is moving.
 *
 * "Waiting on client" is a health and not a stage for the same reason: the
 * work has not gone backwards, it has stopped, and the thing to do about it is
 * chase somebody rather than move a card.
 */
export const HEALTH = ["On track", "At risk", "Waiting on client", "Blocked"] as const;
export type Health = (typeof HEALTH)[number];

/**
 * Where this project's conversation actually happens.
 *
 * Recorded rather than assumed, because it differs per client and the cost of
 * getting it wrong is a message nobody reads. Some clients live in a WhatsApp
 * group, some will only use email, some use the portal. This is the answer to
 * "where do I put this update", and it is on the project because it is agreed
 * per project rather than per company.
 */
export const CHANNELS = [
  "Client dashboard",
  "Direct chat",
  "WhatsApp group",
  "Email",
  "Another agreed channel",
] as const;
export type Channel = (typeof CHANNELS)[number];

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
  /** Who is answerable for it. One name, not a committee. */
  owner: string;
  health: Health;
  channel: Channel;
  /** Kobo, or null when no figure has been agreed. Never a float; see above. */
  budget: number | null;
  /** What was actually bought, in the words the client would recognise. */
  scope?: string;
  /**
   * Finished and filed away, NOT deleted.
   *
   * A delivered project still owns invoices, payments, updates and approvals,
   * and those are the financial and evidential record. Archiving takes it out
   * of the lists; there is deliberately no way to destroy it.
   */
  archived?: boolean;
};

/* --------------------------------------------------------- the work itself */

export const PRIORITIES = ["Low", "Normal", "High"] as const;
export type Priority = (typeof PRIORITIES)[number];

/**
 * One piece of work inside a project.
 *
 * DELIBERATELY NOT A PROJECT-MANAGEMENT SUITE. There are no sub-tasks, no
 * story points, no swimlanes and no burndown, because the checklist this was
 * built from says in as many words not to turn the default screen into one.
 * What is here is what somebody actually needs to answer "what is left and who
 * has it": a title, an owner, a date, a priority, and whether another task has
 * to finish first.
 *
 * `blockedBy` is one id rather than a list. A task waiting on two other things
 * is waiting on whichever finishes last, and modelling that properly means a
 * graph, a cycle check and a topological sort for a screen that shows six
 * rows. One dependency covers the real case -- "this cannot start until that
 * is done" -- and stays readable.
 */
export type Task = {
  id: Id;
  projectId: Id;
  title: string;
  /** Free text: the team is small and a user table would be fiction today. */
  assignee: string;
  due: string | null;
  priority: Priority;
  done: boolean;
  doneAt: string | null;
  blockedBy: Id | null;
};

/**
 * A written update, and who is allowed to read it.
 *
 * `clientVisible` is the whole reason this is a record rather than a note in
 * the history. The same week produces two different sentences: one for the
 * client ("the three routes are with you, we need a pick by Friday") and one
 * for us ("Femi has gone quiet, chase before we schedule the build"). Storing
 * them as one field with a flag means the client portal can render exactly the
 * ones marked for it and nothing can leak by accident.
 */
export type Update = {
  id: Id;
  projectId: Id;
  at: string;
  author: string;
  health: Health;
  /** What moved. */
  progress: string;
  /** What is in the way. Empty is a real and common answer. */
  blockers: string;
  /** What happens next, and who does it. */
  next: string;
  clientVisible: boolean;
};

export const APPROVALS = [
  "Not sent",
  "Awaiting client",
  "Approved",
  "Revision requested",
] as const;
export type Approval = (typeof APPROVALS)[number];

/**
 * Something we hand over, and every version of it.
 *
 * VERSIONS ARE APPENDED, NEVER REPLACED. "Which logo did they approve" is a
 * question that gets asked months later, usually when somebody disagrees about
 * it, and a field that only holds the latest file cannot answer it. Each entry
 * keeps its own number, date and note, so the approval can point at the exact
 * version it was given for.
 */
export type Deliverable = {
  id: Id;
  projectId: Id;
  name: string;
  versions: { v: number; at: string; note: string; url?: string }[];
  approval: Approval;
  /** What the client said when they asked for changes. Their words. */
  approvalNote?: string;
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
  /**
   * THE PUBLIC ADDRESS OF THIS INVOICE, and why it is not the number.
   *
   * The QR printed on an invoice has to resolve to something a client can open
   * without an account, which means a public page. `INV-2026-001` cannot
   * address it: the numbers are sequential by design, so anyone holding one
   * invoice could read every other invoice the studio has ever raised by
   * counting. That is not a theoretical attack, it is subtracting one.
   *
   * This is random and unguessable, and it is the ONLY thing that grants
   * access. It is minted once and never changes, so a printed invoice keeps
   * working, and it is not shown anywhere a client could mistake it for a
   * reference to quote.
   */
  token: string;
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

/**
 * How money actually arrived.
 *
 * "Other" is here on purpose and it is labelled rather than left as a gap. A
 * client who pays a director in cash at an event, or by a means nobody
 * anticipated, produces a real payment; the choice is between recording it
 * honestly against a named catch-all and somebody filing it as "Cash" because
 * the list gave them nowhere else to put it. The second is worse: it puts
 * wrong data in the books to keep a dropdown tidy.
 */
export const METHODS = ["Paystack", "Transfer", "Cash", "POS", "Other"] as const;
export type Method = (typeof METHODS)[number];

export type Payment = {
  id: Id;
  invoiceId: Id;
  at: string;
  amount: number;
  method: Method;
  /** The provider's id, the transfer narration, or whatever ties this row to
      the money. Unique, so a webhook, a callback and a manual entry cannot
      double-count the same payment. */
  reference: string;
  /** RCT-YYYY-NNN. Every successful payment gets one, whatever the method. */
  receiptNo: string;
  /** Its own public address, for the same reason the invoice has one. */
  token: string;
  /** Who recorded it. A payment with no name against it is not auditable. */
  by: string;
  /** Anything worth knowing later: "paid at the office", "part of a bundle". */
  note?: string;
  /**
   * SET WHEN THE MONEY DID NOT STAY, and the row is kept either way.
   *
   * Reversing used to delete the payment, which is wrong twice over. The
   * receipt for it has its own public URL and has usually been sent to the
   * client already, so deleting the row turns a document somebody is holding
   * into a 404 -- with no explanation, which reads as the studio hiding
   * something. And a set of books that corrects mistakes by removing rows
   * cannot be audited: "there was a payment here last month" has no answer.
   *
   * So a reversal is an ANNOTATION. The payment, its amount, its method, its
   * reference and its receipt number all stay exactly as they were; this says
   * what happened to it, when, and who decided. The totals stop counting it.
   */
  reversed?: { at: string; by: string; reason: string };
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

/* ------------------------------------------------- what needs attention */

/**
 * WHY A PROJECT IS ASKING FOR SOMEBODY, DERIVED RATHER THAN STORED.
 *
 * "Overdue" is not a state anybody sets, for exactly the reason `invoiceStatus`
 * gives above: it is a state time creates while nobody is looking. The same is
 * true of "due this week" and of "blocked by a task that is still open". Every
 * one of these is a function of the project, its tasks and today's date, so
 * deriving them means the attention queue cannot be stale and cannot be wrong
 * because a nightly job did not run.
 *
 * The order is the order somebody should deal with them: things that have
 * already slipped, then things that have stopped, then things about to slip.
 */
export type Attention = {
  /** Short enough for a pill. */
  label: string;
  /** How loudly to say it. */
  tone: "bad" | "warn" | "info";
};

export function projectAttention(
  p: Project,
  tasks: Task[] = [],
  today = new Date(),
): Attention[] {
  const out: Attention[] = [];
  if (p.archived || p.stage === "Delivered") return out;

  const open = tasks.filter((t) => t.projectId === p.id && !t.done);

  if (p.due && new Date(p.due) < today) {
    out.push({ label: "Overdue", tone: "bad" });
  }
  if (p.health === "Blocked") out.push({ label: "Blocked", tone: "bad" });
  if (p.health === "Waiting on client") out.push({ label: "Waiting on client", tone: "warn" });
  if (p.stage === "Revisions") out.push({ label: "In revision", tone: "warn" });
  if (p.health === "At risk") out.push({ label: "At risk", tone: "warn" });

  /* Only worth saying when nothing louder is already true: a project that is
     overdue does not also need telling that it is due soon. */
  if (!out.length && p.due) {
    const days = Math.ceil((new Date(p.due).getTime() - today.getTime()) / 86_400_000);
    if (days >= 0 && days <= 7) {
      out.push({ label: days === 0 ? "Due today" : `Due in ${days}d`, tone: "info" });
    }
  }

  const stuck = open.filter((t) => t.blockedBy && open.some((o) => o.id === t.blockedBy));
  if (stuck.length) {
    out.push({ label: `${stuck.length} task${stuck.length > 1 ? "s" : ""} waiting`, tone: "info" });
  }

  const late = open.filter((t) => t.due && new Date(t.due) < today);
  if (late.length) out.push({ label: `${late.length} task${late.length > 1 ? "s" : ""} overdue`, tone: "bad" });

  return out;
}

/** True when a task cannot be started because the one it waits on is open. */
export function taskIsWaiting(t: Task, all: Task[]) {
  if (!t.blockedBy || t.done) return false;
  const on = all.find((x) => x.id === t.blockedBy);
  return !!on && !on.done;
}

/* ------------------------------------------------------------- the record */

/**
 * WHAT CHANGED, WHO CHANGED IT, AND WHAT IT WAS BEFORE.
 *
 * Append-only, and that is the entire design. There is no update and no
 * delete: an audit log you can edit is a log that answers "what happened"
 * with "whatever somebody last wanted it to say", which is worse than having
 * none, because it looks like evidence.
 *
 * A PROJECT'S HISTORY IS NOT THIS. `Project.events` is a narrative for whoever
 * opens the project next week -- "moved to Review, three routes sent" -- and
 * it is deliberately readable and deliberately partial. This is the systems
 * record: every write across clients, projects, money, forms and settings,
 * with the before and after values, in one stream that can be read end to end
 * when somebody asks why an invoice says what it says.
 *
 * WHAT IS DELIBERATELY NOT STORED. No full request bodies, no provider
 * payloads, no credentials, and no field whose old value is a secret. A log
 * that copies everything is a second place for a leak to come from, and the
 * question it exists to answer never needs the whole object -- it needs which
 * field moved and what it moved from.
 */
export const AUDIT_KINDS = [
  "client", "project", "task", "update", "deliverable",
  "invoice", "payment", "expense", "submission", "setting",
] as const;
export type AuditKind = (typeof AUDIT_KINDS)[number];

export type AuditEntry = {
  id: Id;
  at: string;
  /** Who did it. "Studio" until there is a signed-in admin to name. */
  actor: string;
  kind: AuditKind;
  /** The record it happened to, so the entry can be linked back. */
  subjectId: Id;
  /** How the record is known to a person: "INV-2026-001", "Moore Designs". */
  subject: string;
  /** The verb, in the past tense a person would use: "issued", "archived". */
  action: string;
  /**
   * One field's before and after, when the change is a field change.
   *
   * Kept as strings already formatted for reading rather than as raw values:
   * the log is read by people, an amount means nothing as `37725000`, and
   * storing the rendered form means the entry still makes sense in a year when
   * the formatting code has moved on.
   */
  field?: string;
  from?: string;
  to?: string;
  /** Anything the fields above cannot carry. */
  note?: string;
};
