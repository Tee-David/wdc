import {currencyOf,money} from "@/lib/money/currency";
import {
  invoiceTotals, lineTotal, notifyAllows, paidFrom, paymentNet, refundedTotal,
} from "./types";
import type { Client, Credit, Invoice, Method, NotifyKind, Payment } from "./types";

/**
 * THE MONEY RULES THAT ARE JUST ARITHMETIC AND PERMISSION, with no store, no
 * mail server and no framework in them, so a spec can import this file and
 * assert on the real thing (tests/payments-lifecycle.spec.ts). The actions and
 * the mail module call these; none of them re-states a rule.
 *
 * NO `server-only` HERE ON PURPOSE, for the same reason lib/email-templates.ts
 * has none: this builds answers, holds no credential and opens no connection.
 */

/* ---------------------------------------------------- who may be emailed */

export type Reachable = { email?: string | null; notify?: Client["notify"] } | null | undefined;

export type NoticeVerdict =
  | { send: true; to: string }
  | { send: false; reason: "no-address" | "opted-out"; say: string };

/**
 * May the studio email this client about money?
 *
 * TWO REASONS TO HOLD BACK, and both are said in words rather than dropped:
 * there is nowhere to send it, or the person switched this kind of email off
 * (the setting lives with them; see NOTIFY_KINDS). `record` is for a receipt
 * of an ONLINE payment, a document the payer is owed whatever their settings
 * say, which is the one thing here that is not switchable.
 */
export function noticeVerdict(client: Reachable, opts: { record?: boolean; kind?: NotifyKind } = {}): NoticeVerdict {
  const to = client?.email?.trim() ?? "";
  if (!to) return { send: false, reason: "no-address", say: "There is no email address on file for that client." };
  if (!opts.record && !notifyAllows(client?.notify, opts.kind ?? "updates")) {
    return { send: false, reason: "opted-out", say: "That client has switched these emails off in their portal settings." };
  }
  return { send: true, to };
}

/**
 * WHY AN EMAIL TO THIS CLIENT CANNOT GO, in words that name the fix, or
 * undefined when it can. This is what a tick ("Email the client a receipt",
 * "Tell the client") shows beside itself, disabled, instead of quietly doing
 * nothing. The server asks `noticeVerdict` again regardless.
 */
export function noticeBlock(client: Reachable): string | undefined {
  const v = noticeVerdict(client);
  if (v.send) return undefined;
  return v.reason === "no-address"
    ? "No email address on file for this client. Add one on their page and it can be sent."
    : "They have switched updates off in their portal, so nothing would be sent.";
}

/** The reasons for every client who cannot be emailed, by id: small, because most can. */
export function noticeBlocks(clients: (NonNullable<Reachable> & { id: string })[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of clients) {
    const why = noticeBlock(c);
    if (why) out[c.id] = why;
  }
  return out;
}

/* ------------------------------------------------------- the dedupe keys */

/**
 * ONE KEY PER EVENT, built in one place, so the webhook, the payer's return
 * and a hand-entered payment cannot each invent their own and send twice.
 * Every key ENDS in the id of the record it is about, which is how the log
 * finds "everything sent about this" (listForRecord).
 */
export const mailKey = {
  receipt: (paymentId: string) => `receipt:${paymentId}`,
  receiptAgain: (paymentId: string, day: string) => `receipt:${paymentId}:resend:${day}`,
  paidNotice: (paymentId: string) => `paid-notice:${paymentId}`,
  invoice: (invoiceId: string) => `invoice:${invoiceId}`,
  voided: (invoiceId: string) => `void:${invoiceId}`,
  refunded: (refundId: string) => `refund:${refundId}`,
  reversed: (paymentId: string) => `reversal:${paymentId}`,
  estimateSent: (estimateId: string) => `estimate-sent:${estimateId}`,
  estimateAnswer: (estimateId: string) => `estimate-answer:${estimateId}`,
  estimateNotice: (estimateId: string) => `estimate-notice:${estimateId}`,
};

/* ------------------------------------------------------- editing invoices */

/** What lines and a VAT rate come to, in kobo: the same arithmetic `invoiceTotals` does. */
export const totalOfLines = (lines: Invoice["lines"], vatRate: number) => {
  const subtotal = lines.reduce((n, l) => n + lineTotal(l), 0);
  return subtotal + Math.round((subtotal * vatRate) / 100);
};

export type EditCheck = { ok: true; before: number; after: number } | { ok: false; say: string };

/**
 * May this invoice be changed to these lines and this VAT?
 *
 * A draft: always. An issued one that is unpaid or part paid: yes, so a wrong
 * line or a late scope change is a correction rather than a void and a new
 * number. THE FLOOR IS WHAT HAS ALREADY BEEN KEPT: a total that fell below it
 * would turn received money into an overpayment nobody made, so the edit is
 * refused with the figure. A struck invoice is closed.
 *
 * `paid` is the NET of the payment rows (a reversed payment is worth nothing,
 * a refunded one what is left), passed in by the caller that holds the rows.
 */
export function checkInvoiceEdit(
  inv: Pick<Invoice, "status" | "voided" | "vatRate" | "lines" | "currency">,
  paid: number,
  next: { lines: Invoice["lines"]; vatRate: number },
): EditCheck {
  if (inv.voided) return { ok: false, say: "This invoice has been struck, so it cannot be changed. Raise a new one." };
  const before = totalOfLines(inv.lines, inv.vatRate);
  const after = totalOfLines(next.lines, next.vatRate);
  if (inv.status !== "Draft" && after < paid) {
    return {
      ok: false,
      say: `${money(paid,currencyOf(inv))} has already been received against this invoice, so its total cannot drop below that (the new total would be ${money(after,currencyOf(inv))}). Refund or reverse a payment first, or keep the total at ${money(paid,currencyOf(inv))} or more.`,
    };
  }
  return { ok: true, before, after };
}

/* ------------------------------------------------------ emailing invoices */

export type MailVerdict =
  | { ok: true }
  | { ok: false; reason: "draft" | "void" | "settled"; say: string };

/**
 * May "Email invoice" go for this one?
 *
 * NOT FOR A SETTLED ONE. The message is "Amount due", and sending a client a
 * request for ₦0.00 is the one email that makes a paid client wonder whether
 * they paid. The thing to send a settled client is a receipt.
 */
export function invoiceMailVerdict(inv: Invoice): MailVerdict {
  if (inv.status === "Draft") return { ok: false, reason: "draft", say: "Issue it first. A draft has no public page to link to." };
  if (inv.voided) return { ok: false, reason: "void", say: "This invoice has been struck, so there is nothing to send. Raise a new one." };
  const { total, due } = invoiceTotals(inv);
  if (total > 0 && due <= 0) {
    return { ok: false, reason: "settled", say: "This invoice is settled, so there is nothing to ask for. Send the client a receipt instead." };
  }
  return { ok: true };
}

/* ----------------------------------------------------------- paying ahead */

/**
 * The reference a payment is filed under. A bank transfer needs the bank's own
 * (it is what stops the same transfer being entered twice); cash, card, POS and
 * the rest get a generated one unless a slip number was typed.
 */
export function paymentReference(how: Method | null, typed: string): { ok: true; reference: string } | { ok: false; say: string } {
  const reference = typed.trim();
  if (reference) return { ok: true, reference };
  if (!how) return { ok: true, reference: "" };
  if (how === "Transfer") return { ok: false, say: "The bank reference is what stops this being recorded twice." };
  return { ok: true, reference: `${how.toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}` };
}

/**
 * How much of a new invoice was already paid. Blank means all of it. More than
 * the invoice is refused: the excess belongs on the client's balance, which is
 * a decision to make on purpose, not a side effect of a typing slip.
 */
export function advanceAmount(total: number, typed: number | null,currency="NGN"): { ok: true; amount: number } | { ok: false; say: string } {
  if (total <= 0) return { ok: false, say: "An invoice for nothing has nothing to be paid." };
  if (typed === null) return { ok: true, amount: total };
  if (typed <= 0) return { ok: false, say: "The amount has to be more than nothing." };
  if (typed > total) return { ok: false, say: `That is more than the invoice (${money(total,currency)}). Record the invoice amount here, and put the excess on their balance afterwards.` };
  return { ok: true, amount: typed };
}

/* ------------------------------------------------------- reconciliation */

export type InvoiceRecon = {
  currency?:string;
  id: string; number: string; voided: boolean;
  /** What the invoice is for. */
  total: number;
  /** Every payment's face value, reversed ones left out. */
  received: number;
  /** Returned to the bank or held as credit, summed from the refund rows. */
  refunded: number;
  /** Of the refunds, how much stayed with us as the client's credit. */
  heldAsCredit: number;
  /** Net kept: received - refunded. The one `invoice.paid` caches. */
  paid: number;
  /** Of what is kept, how much came off the client's stored credit. */
  fromCredit: number;
  /** Still owed (never negative; nothing on a struck invoice). */
  due: number;
  /** Kept beyond the total, not yet decided (refund it or credit it). */
  over: number;
  /** Money that arrived and was reversed, for the record. */
  reversed: number;
};

/**
 * ONE INVOICE, TOTAL / PAID / REFUNDED / CREDIT / DUE, derived from the rows
 * and from nothing stored. The identity that makes it add up, for any
 * non-struck invoice: total = (paid - over) + due.
 */
export function reconcileInvoice(inv: Invoice, payments: Payment[]): InvoiceRecon {
  const rows = payments.filter((p) => p.invoiceId === inv.id);
  const live = rows.filter((p) => !p.reversed);
  const t = invoiceTotals(inv, rows);
  const paid = paidFrom(rows, inv.id);
  return {
    id: inv.id, number: inv.number, currency:currencyOf(inv),voided: Boolean(inv.voided),
    total: t.total,
    received: live.reduce((n, p) => n + p.amount, 0),
    refunded: live.reduce((n, p) => n + refundedTotal(p), 0),
    heldAsCredit: live.reduce((n, p) => n + (p.refunds ?? []).filter((r) => r.toCredit).reduce((m, r) => m + r.amount, 0), 0),
    paid,
    fromCredit: live.filter((p) => p.method === "Credit").reduce((n, p) => n + paymentNet(p), 0),
    due: t.due,
    over: inv.voided ? 0 : Math.max(0, paid - t.total),
    reversed: rows.filter((p) => p.reversed).reduce((n, p) => n + p.amount, 0),
  };
}

export type ClientRecon = {
  currency?:string;
  groups?:ClientRecon[];
  /** Billed, on the books (issued and not struck). */
  invoiced: number;
  /** Received against those invoices, counted up to each invoice's total. */
  received: number;
  /** Still owed. */
  outstanding: number;
  /** Kept beyond a total and not yet decided; shown beside, never inside, the lines above. */
  overpaid: number;
  /** What the studio holds for the client, unspent. */
  held: number;
  /** invoiced = received + outstanding, always. */
  balanced: boolean;
  invoices: InvoiceRecon[];
};

/** Every figure summed from the invoice rows, so the summary cannot disagree with the table under it. */
export function reconcileClient(invoices: Invoice[], payments: Payment[], credits: (Pick<Credit, "amount" | "applied"> & {currency?:string})[]): ClientRecon {
 const rows=invoices.filter(i=>i.status!=="Draft").map(i=>reconcileInvoice(i,payments));
 const currencies=[...new Set([...rows.map(currencyOf),...credits.filter(c=>!c.applied).map(currencyOf)])];
 const groups=currencies.map(currency=>{
  const own=rows.filter(row=>currencyOf(row)===currency),live=own.filter(row=>!row.voided);
  const sum=(value:(row:InvoiceRecon)=>number)=>live.reduce((total,row)=>total+value(row),0);
  const invoiced=sum(r=>r.total),outstanding=sum(r=>r.due),received=sum(r=>r.paid-r.over);
  return {currency,invoices:own,invoiced,outstanding,received,overpaid:sum(r=>r.over),held:credits.filter(c=>!c.applied&&currencyOf(c)===currency).reduce((total,c)=>total+c.amount,0),balanced:invoiced===received+outstanding};
 });
 const ngn=groups.find(group=>group.currency==="NGN")??{currency:"NGN",invoices:[],invoiced:0,outstanding:0,received:0,overpaid:0,held:0,balanced:true};
 // Legacy numeric consumers keep NGN totals; the display renders every group separately.
 return {...ngn,invoices:rows,groups,balanced:groups.every(group=>group.balanced)};
}
