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

export type Contact = { name: string; role?: string; email?: string; phone?: string };

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
  /** The studio's own labels ("retainer", "referral", "slow payer"), for
      finding a group of clients again. Lower case, deduplicated. */
  tags?: string[];
  /** Other people at the client besides `name`: the marketing lead, the
      person who pays. `name`/`email`/`phone` stay the main contact. */
  contacts?: Contact[];
  /** Set when this record was folded into another as a duplicate. */
  mergedInto?: Id;
  /** What they have agreed to hear from us about. See NOTIFY_KINDS: absent
      means the default, which is yes to the two that are part of the work and
      no to the one that is not. */
  notify?: Partial<Record<NotifyKind, boolean>>;
  /** Studio departments (lib/departments.ts) that look after this client, by id. */
  departments?: string[];
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
  "Client portal",
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
  /** One of lib/project-icons.ts, picked or random when it was opened; the client sees it too. */
  icon?: string;
  /** Its place in its board column, set by dragging; unset sorts after the ranked ones. */
  rank?: number;
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
/** A file the studio uploaded through the media library, not an arbitrary URL.
    The key is what lets the portal issue a real attachment download instead of
    hoping a cross-origin `download` attribute will be honoured. */
export type DeliverableFile = { name: string; key: string };

export type Deliverable = {
  id: Id;
  projectId: Id;
  name: string;
  versions: { v: number; at: string; note: string; url?: string; files?: DeliverableFile[] }[];
  approval: Approval;
  /** What the client said when they asked for changes. Their words. */
  approvalNote?: string;
};

/* ------------------------------------------------------------------- money */

/* "Void" is here and "Cancelled" is not, and the difference is the point: a
   voided invoice keeps its number. Numbering has to be unbroken to be
   auditable, so an invoice raised in error is struck rather than removed --
   the number stays taken, the document still resolves, and it says on its face
   that nothing is owed. */
export type InvoiceStatus = "Draft" | "Sent" | "Part paid" | "Paid" | "Overdue" | "Void";

export type InvoiceLine = {
  description: string;
  qty: number;
  /** Kobo. See the note at the top. */
  unit: number;
};

export type Invoice = {
  id: Id;
  /** INV-YY-XXXXXX (random). Older ones were INV-YYYY-NNN. */
  number: string;
  /** Numbers this invoice carried before it was renumbered, so a client's old email or bank narration still matches it. */
  formerNumbers?: string[];
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
  /**
   * STRUCK, NOT DELETED.
   *
   * An invoice raised in error, or for work that never happened, has to stop
   * being owed without leaving a hole in the numbering -- unbroken numbering
   * is most of what makes a set of books auditable. So the row stays, the
   * number stays taken, the public page still resolves, and everything that
   * sums receivables skips it.
   *
   * An invoice with money against it CANNOT be voided. That is not a
   * limitation, it is the rule: money arrived, and the honest correction is a
   * refund or a reversal against the payment, both of which say where the
   * money went. Voiding it would make a payment belong to nothing.
   */
  voided?: { at: string; by: string; reason: string };
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
/* "Credit" is a real method and is deliberately NOT offered on the manual
   payment form. Money moving off a client's balance and onto an invoice is an
   application of credit the studio already holds, not a payment somebody
   types in -- it comes from `applyCredit`, which knows where the credit came
   from and marks it spent. `recordPayment` refuses it for that reason. */
export const METHODS = ["Paystack", "Transfer", "Cash", "Card", "POS", "Credit", "Other"] as const;
/** What a person may choose when entering a payment by hand. */
export const ENTERABLE_METHODS = METHODS.filter((m) => m !== "Credit");
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
  /**
   * WHICH ENVIRONMENT WROTE THIS ROW, not just which Paystack keys a card
   * payment happened to clear against. Every payment carries it -- a cash
   * entry made on a staging admin is exactly as much test data as a card
   * charge against a test key -- because the real reason this exists is
   * "all environments share one database today" (or will, once 4.9's
   * migration lands): without a mode on the row, a QA pass's payments and
   * production's cannot be told apart once they are sitting in the same
   * table. Optional because it did not exist when the seed data was
   * written, and old rows are not retroactively guessed at.
   */
  mode?: "test" | "live";
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
  /**
   * MONEY THAT REALLY ARRIVED AND WAS THEN GIVEN BACK.
   *
   * A REFUND IS NOT A REVERSAL, and conflating them loses the only fact worth
   * keeping. A reversal says the money never really came: the transfer
   * bounced, or somebody typed a row that should not exist. A refund says it
   * came, we had it, and we sent it back. One is a correction to the record;
   * the other is a transaction, and a client reconciling against their bank
   * statement will see two movements for it.
   *
   * A LIST, BECAUSE REFUNDS COME IN PARTS. Half a deposit returned when a
   * project is cut short is the ordinary case, not the exception.
   */
  refunds?: Refund[];
};

export type Refund = {
  id: Id;
  at: string;
  by: string;
  /** Kobo. Never more than what is left unrefunded on the payment. */
  amount: number;
  reason: string;
  /** The provider's refund id or the transfer narration, where there is one. */
  reference?: string;
  /**
   * WHERE IT WENT. Back to the client's bank, or onto their balance with us.
   *
   * These are different events and the books have to tell them apart: money
   * returned has left the studio, money held as credit has not. Credit is the
   * commoner answer in practice -- a client who has overpaid usually has
   * another invoice coming -- and it is what makes a balance carry forward.
   */
  toCredit: boolean;
};

/**
 * WHAT A PAYMENT IS STILL WORTH.
 *
 * A reversal takes the whole thing off; a refund takes off what was returned.
 * Every total in the books goes through this rather than reading `amount`,
 * because `amount` is what arrived and is deliberately never edited.
 */
export function paymentNet(p: Payment) {
  if (p.reversed) return 0;
  return Math.max(0, p.amount - refundedTotal(p));
}

export function refundedTotal(p: Payment) {
  return (p.refunds ?? []).reduce((n, r) => n + r.amount, 0);
}

/**
 * Received, part refunded, refunded or reversed, DECIDED BY SUMMING the
 * refund rows against the charge rather than stored, so it can never
 * disagree with them.
 */
export function paymentState(p: Payment): "Received" | "Part refunded" | "Refunded" | "Reversed" {
  if (p.reversed) return "Reversed";
  const refunded = refundedTotal(p);
  return refunded >= p.amount ? "Refunded" : refunded > 0 ? "Part refunded" : "Received";
}

/* ---------------------------------------------------------------- credit ---

   WHAT THE STUDIO OWES A CLIENT, which is the other direction from everything
   else on this screen.

   It arrives two ways: an invoice that took more than it was for, and a refund
   the client asked to be held rather than sent back. It leaves one way -- it
   is applied to an invoice, which creates an ordinary payment on that invoice
   with method "Credit", so it gets a receipt number and an audit line like
   every other payment does.

   APPLIED ONCE, AND THE ROW SAYS SO. A credit that could be applied twice is
   money invented, and the day it happens the books are wrong in the client's
   favour by an amount nobody can trace. */
export type Credit = {
  id: Id;
  clientId: Id;
  at: string;
  /** Kobo. */
  amount: number;
  by: string;
  reason: string;
  /** Where it came from, so a balance can always be explained. */
  fromInvoiceId?: Id;
  fromPaymentId?: Id;
  /** Set the moment it is spent. Never cleared. `amount` is how much of the
      credit went; when it is less than the credit, the rest is a new row. The
      credit's own `amount` is never rewritten, so what was put on account is
      still on the record after it is spent. */
  applied?: { at: string; by: string; invoiceId: Id; paymentId: Id; amount?: number };
};

export const EXPENSE_CATEGORIES = [
  "Software", "Hosting", "Assets", "Contractors", "Marketing", "Travel",
  "Equipment", "Fees and charges", "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Expense = {
  id: Id;
  at: string;
  description: string;
  category: string;
  amount: number;
  /** Who was paid. Kept separate from the description because "Adobe" is the
      answer to "who do we pay for this" and "Creative Cloud, the team plan" is
      the answer to "what is it" -- and only the first one adds up across a
      year of rows. */
  vendor?: string;
  /** How it left, from the same list a payment coming IN uses. One list, so a
      method added on one side cannot be missing on the other. */
  method?: Method;
  /**
   * WHOSE COST IT IS. An unallocated expense is overhead and that is a real
   * answer; an expense against a project is what makes a project's margin
   * something the studio can actually read rather than guess. The client is
   * derived from the project where there is one, so the two cannot disagree.
   */
  projectId?: Id;
  clientId?: Id;
  /** Whether it can be billed back to the client. Separate from having a
      project: plenty of project costs are ours to absorb. */
  rebillable?: boolean;
  /**
   * A LINK TO THE RECEIPT, NOT AN UPLOAD. Same decision as deliverable files
   * and for the same reason: R2 upload from the admin is not wired, and a file
   * field that silently does nothing is worse than a field that asks for the
   * link to where the receipt already lives.
   */
  receiptUrl?: string;
  note?: string;
  /** The admin who entered it. An expense with no name against it is the one
      nobody can question later. */
  by?: string;
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

/* --------------------------------------------------------------- support ---

   A CLIENT'S OWN WAY TO RAISE SOMETHING, separate from the project's own
   update thread. `Update` is a record the STUDIO writes about a project;
   a ticket is a conversation the CLIENT starts, about anything -- a
   project, an invoice, or nothing on the system at all ("can we add a
   third domain to the hosting"). Modelling it as a project update would
   force every concern through a project that may not exist yet.

   THREE STATES A CLIENT UNDERSTANDS, not a queue's internal states. "Open"
   is the client's own last word; "Answered" is the studio's; "Closed" is
   either side saying it is done. There is no "in progress" distinct from
   "open" -- a ticket sitting unanswered for a day is exactly as open on
   day two as it was when it was raised, and inventing a state for that
   would be tracking the studio's own guilt rather than the conversation's
   actual state. */
export const TICKET_STATUSES = ["Open", "Answered", "Closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export type Ticket = {
  id: Id;
  clientId: Id;
  /** Set when the client raised this about a specific project; optional,
      because plenty of real questions are not about one. */
  projectId?: Id | null;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  /** Bumped on every reply, either direction -- what a list sorts by. */
  updatedAt: string;
};

export type TicketMessage = {
  id: Id;
  ticketId: Id;
  at: string;
  /** Who is speaking, not who is signed in -- the studio replies as a
      named person, the same way `Update.author` and `Payment.by` do. */
  author: string;
  from: "client" | "studio";
  body: string;
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
  /* A STRUCK INVOICE IS OWED NOTHING, AND THAT BELONGS HERE rather than at
     each of the dozen places that read `due`. `total` stays real, because the
     document still has to say what it was for; `due` is the answer to "how
     much does this client owe on it", and for a voided invoice that answer is
     nothing. Putting it here is what stops one table remembering and another
     forgetting. */
  if (inv.voided) return { subtotal, vat, total, due: 0 };
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
  if (Math.abs(n) >= 1_000_000) return `₦${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}m`;
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
  /* Before anything else, including "Paid": a struck invoice is not owed, not
     overdue and not settled. It is struck. */
  if (inv.voided) return "Void";
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
  "invoice", "payment", "expense", "submission", "setting", "content",
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

/* ==========================================================================
   WHAT THE PAYMENT PROVIDER TOLD US.

   A SEPARATE LOG FROM THE AUDIT, on purpose. The audit log answers "who
   changed this and when", and every entry in it is something a person or this
   application did. This one answers a different question -- "what did Paystack
   say, and what did we do about it" -- and most of its entries are things that
   happened to us. Mixing them would bury a webhook nobody could match under a
   hundred rows of ordinary edits.

   IT IS THE RECONCILIATION SCREEN'S ONLY SOURCE. Every event is written
   whatever its outcome: the ones that became payments, the duplicates that
   were quietly ignored, the ones naming an invoice we do not have, and the
   ones that failed their signature. An event log that only records successes
   cannot be reconciled against anything.

   NO PAYLOADS. Paystack's body carries a customer record, an authorization
   object and, on some events, a card's last four digits and its bank. None of
   that is ours to keep, and a log that copies it is a second place for it to
   leak from. What is stored is what reconciliation actually needs: the
   reference, the amount, the channel, and our own verdict.
   ========================================================================== */

export const PROVIDER_OUTCOMES = [
  /** Became a payment on an invoice. */
  "Applied",
  /** A reference we had already banked. Paystack retries webhooks, and the
      browser's return race with them; both are normal and neither is an
      error. */
  "Duplicate",
  /** Real money, no invoice we can attach it to: a transfer with a typed
      reference, or a charge whose metadata went missing. Somebody has to
      look. */
  "Unmatched",
  /** Paystack told us the charge did not succeed. Recorded, not banked. */
  "Failed",
  /** An event type we do not act on. Kept so the log is complete. */
  "Ignored",
  /** The signature did not verify, or verification could not be completed.
      Nothing was written to the books. */
  "Rejected",
] as const;
export type ProviderOutcome = (typeof PROVIDER_OUTCOMES)[number];

/** The outcomes a person still has to do something about. */
export const NEEDS_ATTENTION: readonly ProviderOutcome[] = ["Unmatched", "Failed", "Rejected"];

export type ProviderEvent = {
  id: Id;
  /** When WE received it, not when Paystack says it happened. Those differ,
      and for reconciliation the receiving time is the one that explains a
      gap. */
  at: string;
  provider: "Paystack";
  /** Paystack's event name: "charge.success", "refund.processed". */
  event: string;
  reference: string;
  /** Naira, or null when the event carries no amount. */
  amount: number | null;
  outcome: ProviderOutcome;
  /** Card, bank transfer, USSD -- whatever Paystack said. */
  channel?: string;
  /** Which Paystack account raised it -- `PAYSTACK_MODE` at the moment this
      row was written. See the note on `Payment.mode` for why every event
      carries it rather than only the ones that became a payment. */
  mode?: "test" | "live";
  invoiceId?: Id;
  paymentId?: Id;
  /** Why the outcome is what it is, in a sentence a person can act on. */
  note?: string;
  /** How the studio dealt with it. Append-once: a resolution is a statement
      somebody signed, not a field to keep editing. */
  resolution?: { at: string; by: string; note: string };
};

export function providerNeedsAttention(e: ProviderEvent) {
  return NEEDS_ATTENTION.includes(e.outcome) && !e.resolution;
}

/* ==========================================================================
   WHAT WE SENT SOMEBODY, AND WHETHER IT ARRIVED.

   ONE ROW BEFORE THE PROVIDER IS CALLED, NEVER AFTER. A receipt goes out
   behind the response -- the SMTP server takes about 23 seconds just to
   authenticate -- which means by the time it fails there is nobody left to
   tell. So the intent is written first, in the Queued state, and the send
   moves it to Sent or Failed. A message that vanished between the two is
   visible as a row still saying Queued, which is exactly the thing a log
   written afterwards can never show.

   THE DEDUPE KEY MAKES A RETRY SAFE. Paystack retries a webhook it thinks
   failed, and the payer's return from checkout races it; both would send the
   same receipt. The key is the event, not the attempt -- `receipt:y7` -- so
   the second attempt finds the first row and sends nothing.

   IT IS A COMMUNICATION LOG, NOT AN EMAIL LOG. WhatsApp and phone calls are
   recorded here by hand, with the same shape and the same fields, because the
   question "what have we said to this client" does not care which channel
   carried it. What the site CANNOT do is read WhatsApp: a WhatsApp row is
   something a person wrote down, and the UI says so rather than implying a
   sync that does not exist.
   ========================================================================== */

export const MESSAGE_CHANNELS = ["Email", "WhatsApp", "Phone", "In person"] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const MESSAGE_STATES = ["Queued", "Sent", "Failed", "Skipped"] as const;
export type MessageState = (typeof MESSAGE_STATES)[number];

export type Message = {
  id: Id;
  at: string;
  channel: MessageChannel;
  direction: "Outbound" | "Inbound";
  /** An address, a number, or a description of where it went. Never a
      credential, and never a provider's message id. */
  to: string;
  subject: string;
  /** One line of what it said. Not the body: a log that keeps every word of
      every message is a copy of the mailbox, and it is the copy that leaks. */
  summary: string;
  state: MessageState;
  /** Why it did not go. Short, and safe to show a person. */
  error?: string;
  /** Who or what sent it. "Studio", "Paystack webhook", a person's name. */
  by: string;
  about?: { kind: "invoice" | "payment" | "project" | "client" | "submission"; id: Id; label: string };
  clientId?: Id;
  /** One row per key. See the note above. */
  dedupeKey: string;
};

/* --------------------------------------------------------- what to send ---

   THE SETTING LIVES WITH THE PERSON, NOT THE TEMPLATE. A client who has asked
   not to be chased about a late invoice must not be chased by a new reminder
   written next month by somebody who never read that conversation -- which is
   what happens when the switch lives on the message rather than on them.

   Silence is not one of the options. A receipt for money a client has actually
   paid is a record they are entitled to, so it is not in this list; what is
   here is everything the studio sends because the studio decided to. */
export const NOTIFY_KINDS = ["updates", "reminders", "marketing"] as const;
export type NotifyKind = (typeof NOTIFY_KINDS)[number];

export const NOTIFY_LABELS: Record<NotifyKind, string> = {
  updates: "Project updates",
  reminders: "Invoice reminders",
  marketing: "Occasional studio news",
};

/** Opted IN by default for the two that are part of doing the work, and out of
    the one that is not. A client who never answers the question still gets
    told their project moved; they do not get a newsletter. */
export function notifyAllows(prefs: Partial<Record<NotifyKind, boolean>> | undefined, kind: NotifyKind) {
  const set = prefs?.[kind];
  if (typeof set === "boolean") return set;
  return kind !== "marketing";
}

/* ==========================================================================
   ESTIMATES.

   A QUOTE IS NOT A DRAFT INVOICE, and building it as one would have been the
   easy mistake. A draft invoice is a document the studio has not finished
   writing. An estimate is a document the studio HAS finished writing and sent,
   which the client is being asked to agree to -- it has its own number series,
   its own expiry, and a state that only the client can move. Filing it as a
   draft would mean the one thing nobody could answer is "what have we quoted
   and not heard back about", which is the question a studio's pipeline is
   made of.

   IT BECOMES AN INVOICE, IT DOES NOT TURN INTO ONE. Accepting an estimate
   raises a NEW document with its own number, and the estimate stays as the
   record of what was agreed and when. A document that mutates into another
   kind of document leaves nothing to point at when somebody asks what the
   price was before the scope changed.

   NUMBERING IS ITS OWN SERIES. EST-YYYY-NNN, taken from the highest already
   issued, never reused, and unaffected by invoices. An estimate that shared
   the invoice series would burn invoice numbers on work that never happened.
   ========================================================================== */

export const ESTIMATE_STATES = ["Draft", "Sent", "Accepted", "Declined", "Expired"] as const;
export type EstimateState = (typeof ESTIMATE_STATES)[number];

export type Estimate = {
  id: Id;
  /** EST-YYYY-NNN, issued in order and never reused. */
  number: string;
  /** Its own public address, minted and never changed. Same rule as an
      invoice's: the number is sequential and cannot be the key. */
  token: string;
  clientId: Id;
  projectId: Id | null;
  state: Exclude<EstimateState, "Expired">;
  issued: string;
  /** The day the price stops standing. Nothing enforces it silently: the
      state is derived from it, the way an invoice's "Overdue" is. */
  expires: string;
  lines: InvoiceLine[];
  vatRate: number;
  /** A percentage off the subtotal, as a whole number. Kept as a rate rather
      than an amount so it survives a line being edited. */
  discount?: number;
  /** What is included, said in the studio's words. */
  notes?: string;
  /** Payment terms, deposit, what happens to the price after the expiry. */
  terms?: string;
  /** Set when the client answers. The date is theirs, not ours. */
  answered?: { at: string; by: string; note?: string };
  /** The invoice raised from it, once accepted. */
  invoiceId?: Id;
};

export function estimateTotals(e: Estimate) {
  const subtotal = e.lines.reduce((n, l) => n + lineTotal(l), 0);
  /* ROUNDED ONCE, HERE. A discount applied per line and then summed drifts
     from a discount applied to the sum by a kobo or two, and the two figures
     appear on the same page. */
  const discount = e.discount ? Math.round((subtotal * e.discount) / 100) : 0;
  const net = subtotal - discount;
  const vat = Math.round((net * e.vatRate) / 100);
  return { subtotal, discount, net, vat, total: net + vat };
}

/**
 * WHAT STATE AN ESTIMATE IS REALLY IN.
 *
 * "Expired" is derived and never stored, for the same reason an invoice's
 * "Overdue" is: it is a state time creates while nobody is looking, and a
 * stored one is wrong the morning after a nightly job did not run.
 *
 * An answered estimate does not expire. Accepting on the last day and raising
 * the invoice a week later is normal, and a document that flipped to "Expired"
 * after the client had already said yes would be telling a lie about something
 * the studio has a signed agreement on.
 */
export function estimateState(e: Estimate, today = new Date()): EstimateState {
  if (e.state !== "Sent") return e.state;
  return new Date(e.expires) < today ? "Expired" : "Sent";
}
