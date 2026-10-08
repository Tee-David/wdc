import "server-only";

import { SITE_URL } from "@/lib/site";
import { escapeHtml, mailIsConfigured, studioInbox } from "@/lib/email";
import {
  composeEmailHtml, emailButton, emailDate, emailFigure, emailP, emailPanel, emailSafeUrl, emailSmall,
  estimateAnswerNoticeEmail, estimateAnsweredEmail, estimateSentEmail, invoiceVoidedEmail,
  paymentNoticeEmail, paymentRefundedEmail, paymentReversedEmail,
} from "@/lib/email-templates";
import { getClient, getEstimate, getInvoice, getPayments, getSetting } from "@/lib/admin/store";
import { hydrateSettings } from "@/lib/settings/store";
import { queueLogged, recordResend, retryLogged, type LoggedMessage } from "@/lib/message-log";
import { sendQueuedLogged, type OutboxLog } from "@/lib/outbox";
import { estimateTotals, invoiceTotals, naira, notifyAllows } from "@/lib/admin/types";
import type { Estimate, Invoice, Message, Payment, Refund } from "@/lib/admin/types";
import { mailKey, noticeVerdict } from "@/lib/admin/money-rules";

/**
 * The money messages: the invoice going out, the receipt coming back, the
 * nudge in between, and the notice when something already sent is corrected.
 *
 * EVERY ONE OF THEM WRITES ITS ROW BEFORE IT CALLS THE MAIL SERVER. The send
 * happens behind the response -- 23 seconds of SMTP handshake is not something
 * a payer waits through -- so by the time it fails there is nobody left to
 * tell. The row is the telling. Two shapes of the same path:
 *
 *   - `stage*` writes the row NOW (in the request, so the intent survives if
 *     the instance dies) and hands back `run`, which the action puts in
 *     `after()`. This is what every button in the admin uses.
 *   - `send*` stages and runs in one go, for callers that are already behind
 *     the response: the Paystack webhook, the payer's return, the daily job.
 *
 * THE DEDUPE KEY IS THE EVENT, NOT THE ATTEMPT (lib/admin/money-rules.ts
 * `mailKey`). `receipt:y7` is the receipt for payment y7 however many times
 * Paystack retries the webhook and however many times the payer reloads the
 * return page.
 *
 * A FAILED OR SKIPPED ROW HOLDS ITS KEY, and a human-asked send is allowed to
 * take its place (`retry`): the old row's key is retired (it stays as the
 * record that the first try did not go), a new row is written under the event's
 * key, and the old row gets a "sent on" trail so it stops counting as failed.
 * That is the whole of "Try again". Automatic callers never do it: a webhook
 * retry must not mail somebody twice because the first mail server answer was
 * slow.
 *
 * WHAT A CLIENT CAN SWITCH OFF. Their "updates" switch (lib/admin/types.ts,
 * NOTIFY_KINDS) covers every billing message the studio CHOOSES to send: the
 * invoice, a receipt for a payment entered by hand, a void, a refund, a
 * reversal, an estimate. The nudge has its own, "reminders". The receipt for a
 * payment made ONLINE is a record the payer is owed and is not switchable. A
 * message held back is written down as Skipped, with the reason.
 */

/** The shared frame from lib/email-templates.ts: one look for every message we send. */
function shell(title: string, preheader: string, blocks: string[], unsubscribe = false, footer: { why?: string; manage?: "client" | "staff" } = {}) {
  return composeEmailHtml({ title, preheader, heading: title, blocks, unsubscribe, ...footer });
}

export type SendOutcome = { sent: boolean; reason?: string };

/** What staging a message came to. `queued` carries the function that sends it. */
export type Staged =
  | { state: "queued"; to: string; run: () => Promise<SendOutcome> }
  | { state: "skipped"; reason: "no address" | "opted out" | "switched off"; say: string }
  | { state: "already"; say: string };

type Base = {
  to: string; subject: string; summary: string; dedupeKey: string; by: string;
  clientId?: string;
  about?: Message["about"];
  unsubscribe?: boolean;
  /** A person asked for this: a Failed or Skipped row may be replaced. */
  retry?: boolean;
};
type Hold = { reason: "no address" | "opted out" | "switched off"; say: string };
type Outgoing = Base & ({ hold: Hold; text?: undefined; html?: undefined } | { hold?: undefined; text: string; html: string });

const NO_ADDRESS = "(no address on file)";

/** When a row was written, as a day, for the "already sent" sentence. */
const dayOf = (m: Message) => new Date(m.at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/**
 * Write the row, or say why there is none to write. See the note above.
 */
async function stage(out: Outgoing): Promise<Staged> {
  const configured = mailIsConfigured();
  const row = {
    channel: "Email" as const, to: out.to, subject: out.subject, dedupeKey: out.dedupeKey,
    by: out.by, clientId: out.clientId, about: out.about,
  };
  const held = out.hold;
  const entry = held ? { ...row, summary: `Not sent: ${held.say}`, state: "Skipped" as const } : { ...row, summary: out.summary };

  let queued = await queueLogged(entry);
  let retired: LoggedMessage | null = null;
  if (!queued.ok) {
    const was = queued.message;
    const replaceable = out.retry && (was.state === "Failed" || was.state === "Skipped");
    /* Already held back, or held back again: the existing row says so. */
    if (held && (was.state === "Skipped" || replaceable)) return { state: "skipped", ...held };
    if (!replaceable) {
      return {
        state: "already",
        say: was.state === "Sent" ? `That was already emailed on ${dayOf(was)}.`
          : was.state === "Queued" ? "That is already on its way."
          : was.state === "Failed" ? "The first try did not go. Use Try again on its row in the log below."
          : `That was held back on ${dayOf(was)}.`,
      };
    }
    retired = await retryLogged(was.id, out.by);
    if (retired) queued = await queueLogged(entry);
    if (!queued.ok) return { state: "already", say: "That is already on its way." };
  } else if (held) {
    return { state: "skipped", ...held };
  }

  const id = queued.message.id;
  const mail = { to: out.to, subject: out.subject, text: out.text!, html: out.html!, unsubscribe: out.unsubscribe };
  const log: OutboxLog = { summary: out.summary, dedupeKey: out.dedupeKey, by: out.by, clientId: out.clientId, about: out.about };
  return {
    state: "queued", to: out.to,
    run: async () => {
      const started = Date.now();
      try {
        await sendQueuedLogged(mail, log, id);
        if (retired) await recordResend(retired.id, { at: new Date().toISOString(), to: out.to, by: out.by, sent: true, ms: Date.now() - started });
        return { sent: true };
      } catch (error) {
        if (retired) await recordResend(retired.id, { at: new Date().toISOString(), to: out.to, by: out.by, sent: false, error: error instanceof Error ? error.message.slice(0, 200) : undefined });
        return { sent: false, reason: configured ? "send failed" : "mail not configured" };
      }
    },
  };
}

/** Stage and send in one go: for callers that are already behind the response. */
async function deliver(out: Outgoing): Promise<SendOutcome> {
  const s = await stage(out);
  if (s.state === "queued") return s.run();
  return { sent: false, reason: s.state === "already" ? "already sent" : s.reason };
}

/** The client behind an invoice, and who the studio is writing to. */
const first = (name: string) => name.trim().split(/\s+/)[0] || name;
const invoiceLink = (invoice: Invoice) => new URL(`/i/${invoice.token}`, SITE_URL).toString();
const receiptLink = (payment: Payment) => new URL(`/r/${payment.token}`, SITE_URL).toString();
const estimateLink = (estimate: Estimate) => new URL(`/q/${estimate.token}`, SITE_URL).toString();

/** A hold, or the address: the same two questions for every message to a client. */
function reach(invoiceClientId: string, opts: { record?: boolean } = {}) {
  const client = getClient(invoiceClientId);
  const v = noticeVerdict(client, opts);
  if (v.send) return { client, to: v.to, hold: undefined };
  return {
    client, to: client?.email?.trim() || NO_ADDRESS,
    hold: { reason: v.reason === "no-address" ? "no address" : "opted out", say: v.reason === "no-address" ? `${client?.company ?? "the client"} has no email address on file.` : `${client?.company ?? "the client"} has switched updates off.` } as Hold,
  };
}

/* ------------------------------------------------------------- receipts */

type ReceiptInput = { payment: Payment; invoice: Invoice; outstanding: number; by?: string; retry?: boolean };

/**
 * "We have your money." The receipt for one payment, whatever the method.
 *
 * IT CARRIES THE RECEIPT'S OWN URL rather than an attachment. The public
 * receipt is the live document: it knows about a later reversal, and an
 * attached copy does not. The invoice's own link sits under it, so a client
 * can see everything billed and everything paid against it.
 *
 * AN ONLINE PAYMENT'S RECEIPT ALWAYS GOES. A payment the studio typed in goes
 * when the studio asked for it AND the client has not switched updates off.
 */
function planReceipt(input: ReceiptInput, key = mailKey.receipt(input.payment.id)): Outgoing {
  const { payment, invoice, outstanding } = input;
  const { to, hold } = reach(invoice.clientId, { record: payment.method === "Paystack" });
  const about = { kind: "payment" as const, id: payment.id, label: payment.receiptNo };
  const by = input.by ?? payment.by;
  const base = { to, clientId: invoice.clientId, about, dedupeKey: key, by, retry: input.retry, subject: `Receipt ${payment.receiptNo}: ${naira(payment.amount)} received` };
  if (hold) return { ...base, summary: "", hold };

  const url = receiptLink(payment);
  const invoiceUrl = invoiceLink(invoice);
  const received = emailDate(new Date(payment.at));
  const line = outstanding > 0
    ? `${naira(outstanding)} is still outstanding on ${invoice.number}.`
    : `${invoice.number} is settled in full. Thank you.`;

  return {
    ...base,
    summary: `${naira(payment.amount)} against ${invoice.number}. ${line}`,
    text: [
      `We have received ${naira(payment.amount)} against ${invoice.number}.`,
      line,
      "",
      `Your receipt: ${url}`,
      `Your invoice: ${invoiceUrl}`,
      "",
      `Receipt number ${payment.receiptNo}. Received ${received}, by ${payment.method}, reference ${payment.reference}.`,
    ].join("\n"),
    html: shell("Thank you, payment received", `${naira(payment.amount)} received against ${invoice.number}.`, [
      emailFigure(naira(payment.amount), { label: "Received", note: line }),
      emailPanel([["Receipt", payment.receiptNo], ["Invoice", invoice.number], ["Received", received], ["Paid by", payment.method], ["Reference", payment.reference]]),
      emailButton("Open your receipt", url),
      emailSmall(`The invoice, with everything billed and paid against it: <a href="${emailSafeUrl(invoiceUrl)}">${escapeHtml(invoice.number)}</a>.`),
    ], false, payment.method === "Paystack"
      ? { why: "You get a receipt for every payment you make online. Receipts always arrive." }
      : { why: "You get this because the studio sent you a receipt for a payment.", manage: "client" }),
  };
}

/** Automatic callers (the webhook, the payer's return): stage and send. Never replaces a failed row. */
export async function sendPaymentReceiptEmail(input: ReceiptInput) {
  const outcome = await deliver(planReceipt(input));
  return outcome;
}

/**
 * The receipt, staged for a button.
 *
 * `again` is "send it once more": the first send's row holds the event's key,
 * so a second request for a receipt that already went uses a key for that
 * day, and a client cannot be sent the same receipt more than once a day.
 */
export async function stageReceipt(input: ReceiptInput & { again?: boolean }): Promise<Staged> {
  const firstTry = await stage(planReceipt({ ...input, retry: true }));
  if (firstTry.state !== "already" || !input.again) return firstTry;
  const day = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);
  const again = await stage(planReceipt({ ...input, retry: true }, mailKey.receiptAgain(input.payment.id, day)));
  return again.state === "already" ? { state: "already", say: "That receipt has already been sent again today." } : again;
}

/**
 * "A client paid": the studio's notice, after the client's receipt. Settings,
 * Notifications can switch it off. Keyed on the payment, so a webhook retry
 * does not send it twice.
 */
export async function sendPaymentNotice(input: { payment: Payment; invoice: Invoice; outstanding: number }) {
  const { payment, invoice, outstanding } = input;
  await hydrateSettings();
  if (getSetting("notify.payments") === "0") return { sent: false, reason: "switched off" };
  const client = getClient(invoice.clientId);
  const company = client?.company || client?.name || "A client";
  const mail = paymentNoticeEmail({
    company, amount: naira(payment.amount), invoice: invoice.number, method: payment.method,
    left: outstanding > 0 ? `${naira(outstanding)} still owed.` : "Settled in full.",
    url: new URL(`/admin/money/${invoice.id}`, SITE_URL).toString(),
  });
  return deliver({
    to: studioInbox(), ...mail,
    summary: `Studio notice: ${naira(payment.amount)} from ${company}.`,
    dedupeKey: mailKey.paidNotice(payment.id), by: payment.by, clientId: invoice.clientId,
    about: { kind: "payment", id: payment.id, label: payment.receiptNo },
  });
}

/**
 * BOTH EMAILS FOR A PAYMENT THAT CAME IN ONLINE, from whichever path banked it.
 *
 * The webhook and the payer's return race, and the loser used to send nothing
 * (the studio's notice was lost whenever the return page won the claim). Both
 * paths call this, both keys name the PAYMENT, so the second caller finds the
 * rows already written and sends nothing: the client gets one receipt and the
 * studio one notice, whoever got there first. Re-reads the invoice, because
 * `paid` was recomputed by the write the caller just made.
 */
export async function sendOnlinePaymentEmails(input: { payment: Payment; invoice: Invoice }) {
  const fresh = getInvoice(input.invoice.id) ?? input.invoice;
  const outstanding = invoiceTotals(fresh).due;
  await sendPaymentReceiptEmail({ payment: input.payment, invoice: fresh, outstanding });
  await sendPaymentNotice({ payment: input.payment, invoice: fresh, outstanding });
}

/* -------------------------------------------------------------- invoices */

/**
 * The invoice itself, with the link that pays it.
 *
 * THE LINK IS THE INVOICE, not a separate "payment link". `/i/<token>` shows
 * what is owed, what has already been paid against it, and carries the button
 * that starts a checkout -- so there is one URL to send, one to quote in a
 * WhatsApp message, and one printed as a QR on the paper copy.
 *
 * AND IT DOES NOT OFFER A BANK TRANSFER AS AN ALTERNATIVE. It used to. The
 * studio collects through Paystack, whose own page already offers a transfer
 * to a one-time account beside the card, so the offer sent people out to email
 * for something the link does better and records automatically. The other
 * methods in the books are the STUDIO'S, for entering money that arrived some
 * other way or sorting out a payment that went wrong.
 *
 * NOT FOR A SETTLED INVOICE (the action refuses; see `invoiceMailVerdict`).
 * A part-paid one says what is already in and asks for the balance.
 */
function planInvoice(input: { invoice: Invoice; by?: string; retry?: boolean }): Outgoing {
  const { invoice } = input;
  const totals = invoiceTotals(invoice);
  const url = invoiceLink(invoice);
  const { to, hold } = reach(invoice.clientId);
  const base = {
    to, clientId: invoice.clientId, retry: input.retry,
    about: { kind: "invoice" as const, id: invoice.id, label: invoice.number },
    dedupeKey: mailKey.invoice(invoice.id), by: input.by ?? "Studio",
  };
  const due = new Date(invoice.due).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const part = invoice.paid > 0 && totals.due > 0;
  const subject = part
    ? `Invoice ${invoice.number}: ${naira(totals.due)} balance due ${due}`
    : `Invoice ${invoice.number}: ${naira(totals.due)} due ${due}`;
  if (hold) return { ...base, subject, summary: "", hold };

  return {
    ...base, subject,
    summary: `${naira(totals.due)} ${part ? "balance " : ""}due ${due}. Link sent to ${to}.`,
    text: [
      part
        ? `Invoice ${invoice.number}: ${naira(invoice.paid)} is already in, and the balance of ${naira(totals.due)} is due on ${due}.`
        : `Invoice ${invoice.number} for ${naira(totals.due)} is due on ${due}.`,
      "",
      `Open it, and pay by card or transfer, here: ${url}`,
      "",
      "Card or bank transfer, both on the same page. Anything that goes wrong, reply to this email and we will sort it out.",
    ].join("\n"),
    html: shell(`Invoice ${invoice.number}`, `${naira(totals.due)} due ${due}.`, [
      emailFigure(naira(totals.due), { label: part ? "Balance due" : "Amount due", note: part ? `${naira(invoice.paid)} already received. Due ${due}` : `Due ${due}` }),
      emailP("The invoice shows everything billed and anything already paid against it. Pay by card or transfer on the same page."),
      emailButton("Open and pay the invoice", url),
      emailSmall(`Anything that goes wrong, reply to this email quoting ${escapeHtml(invoice.number)} and we will sort it out.`),
    ], false, { why: "You get this because the studio issued you an invoice.", manage: "client" }),
  };
}

export async function sendInvoiceEmail(input: { invoice: Invoice; by?: string }) {
  return deliver(planInvoice(input));
}

export const stageInvoiceEmail = (input: { invoice: Invoice; by?: string }) => stage(planInvoice({ ...input, retry: true }));

/**
 * The nudge.
 *
 * RESPECTS THE CLIENT'S SETTING, because this one is the studio's choice
 * rather than a record the client is owed. A client who has switched reminders
 * off still gets the invoice and still gets the receipt.
 *
 * THE KEY CARRIES THE DAY. `reminder:i2:2026-09-14` -- so the same reminder
 * cannot go twice in one day however many times the job runs, and tomorrow's
 * is allowed through.
 */
function planReminder(input: { invoice: Invoice; today?: Date; by?: string; retry?: boolean }): Outgoing {
  const { invoice } = input;
  const client = getClient(invoice.clientId);
  const email = client?.email?.trim();
  const day = (input.today ?? new Date()).toISOString().slice(0, 10);
  const totals = invoiceTotals(invoice);
  const url = invoiceLink(invoice);
  const due = new Date(invoice.due).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const base = {
    to: email || NO_ADDRESS, clientId: invoice.clientId, retry: input.retry,
    about: { kind: "invoice" as const, id: invoice.id, label: invoice.number },
    dedupeKey: `reminder:${invoice.id}:${day}`, by: input.by ?? "Studio",
    subject: `A reminder about invoice ${invoice.number}`,
  };
  if (!notifyAllows(client?.notify, "reminders")) {
    return { ...base, summary: "", hold: { reason: "opted out", say: `${client?.company ?? "the client"} has invoice reminders switched off.` } };
  }
  if (!email) return { ...base, summary: "", hold: { reason: "no address", say: `${client?.company ?? "the client"} has no email address on file.` } };

  return {
    ...base, unsubscribe: true,
    summary: `${naira(totals.due)} outstanding, due ${due}.`,
    text: [
      `This is a friendly reminder that ${naira(totals.due)} is outstanding on invoice ${invoice.number}, which was due on ${due}.`,
      "",
      `Open and pay it here: ${url}`,
      "",
      "If it has already been paid, or if something about it needs sorting out, just reply and we will take a look.",
    ].join("\n"),
    html: shell("A reminder about your invoice", `${naira(totals.due)} outstanding on ${invoice.number}.`, [
      emailFigure(naira(totals.due), { label: "Still to pay", note: `${invoice.number} · due ${due}` }),
      emailButton("Open and pay the invoice", url),
      emailSmall("Already paid, or something needs sorting out? Reply to this email and we will take a look."),
    ], true, { why: "You get reminders while an invoice is unpaid.", manage: "client" }),
  };
}

export async function sendInvoiceReminderEmail(input: { invoice: Invoice; today?: Date; by?: string }) {
  return deliver(planReminder(input));
}

export const stageReminderEmail = (input: { invoice: Invoice; today?: Date; by?: string }) => stage(planReminder({ ...input, retry: true }));

/* ------------------------------------------------- corrections, for the client */

/** A void: the invoice the client may be holding is no longer owed. Once per invoice. */
function planVoid(input: { invoice: Invoice; by?: string; retry?: boolean }): Outgoing {
  const { invoice } = input;
  const { client, to, hold } = reach(invoice.clientId);
  const base = {
    to, clientId: invoice.clientId, retry: input.retry,
    about: { kind: "invoice" as const, id: invoice.id, label: invoice.number },
    dedupeKey: mailKey.voided(invoice.id), by: input.by ?? invoice.voided?.by ?? "Studio",
    subject: `Invoice ${invoice.number} has been cancelled`,
  };
  if (hold) return { ...base, summary: "", hold };
  const mail = invoiceVoidedEmail({ clientName: first(client?.name ?? ""), number: invoice.number, reason: invoice.voided?.reason ?? "It was raised in error.", url: invoiceLink(invoice) });
  return { ...base, ...mail, summary: `Told the client ${invoice.number} is cancelled and nothing is owed.` };
}
export const stageVoidNotice = (input: { invoice: Invoice; by?: string }) => stage(planVoid({ ...input, retry: true }));

/** A refund: money handed back, or held for the client. Once per refund row. */
function planRefund(input: { payment: Payment; refund: Refund; invoice: Invoice; by?: string; retry?: boolean }): Outgoing {
  const { payment, refund, invoice } = input;
  const { client, to, hold } = reach(invoice.clientId);
  const base = {
    to, clientId: invoice.clientId, retry: input.retry,
    about: { kind: "payment" as const, id: payment.id, label: payment.receiptNo },
    dedupeKey: mailKey.refunded(refund.id), by: input.by ?? refund.by,
    subject: refund.toCredit ? `${naira(refund.amount)} is being held on your account` : `${naira(refund.amount)} refunded`,
  };
  if (hold) return { ...base, summary: "", hold };
  const mail = paymentRefundedEmail({
    clientName: first(client?.name ?? ""), receiptNo: payment.receiptNo, invoice: invoice.number,
    amount: refund.amount, toCredit: refund.toCredit, owedNow: invoiceTotals(invoice).due, url: receiptLink(payment),
  });
  return { ...base, ...mail, summary: `Told the client ${naira(refund.amount)} of ${payment.receiptNo} was ${refund.toCredit ? "held on their account" : "refunded"}.` };
}
export const stageRefundNotice = (input: { payment: Payment; refund: Refund; invoice: Invoice; by?: string }) => stage(planRefund({ ...input, retry: true }));

/** A reversal: a payment the client may have been sent a receipt for no longer counts. Once per payment. */
function planReversal(input: { payment: Payment; invoice: Invoice; by?: string; retry?: boolean }): Outgoing {
  const { payment, invoice } = input;
  const { client, to, hold } = reach(invoice.clientId);
  const base = {
    to, clientId: invoice.clientId, retry: input.retry,
    about: { kind: "payment" as const, id: payment.id, label: payment.receiptNo },
    dedupeKey: mailKey.reversed(payment.id), by: input.by ?? payment.reversed?.by ?? "Studio",
    subject: `Payment ${payment.receiptNo} has been taken off ${invoice.number}`,
  };
  if (hold) return { ...base, summary: "", hold };
  const mail = paymentReversedEmail({
    clientName: first(client?.name ?? ""), receiptNo: payment.receiptNo, invoice: invoice.number,
    amount: payment.amount, owedNow: invoiceTotals(invoice).due, invoiceUrl: invoiceLink(invoice), url: receiptLink(payment),
  });
  return { ...base, ...mail, summary: `Told the client ${payment.receiptNo} was reversed. ${naira(invoiceTotals(invoice).due)} owed now.` };
}
export const stageReversalNotice = (input: { payment: Payment; invoice: Invoice; by?: string }) => stage(planReversal({ ...input, retry: true }));

/* ------------------------------------------------------------- estimates */

function planEstimateSent(input: { estimate: Estimate; by?: string; retry?: boolean }): Outgoing {
  const { estimate } = input;
  const { client, to, hold } = reach(estimate.clientId);
  const base = {
    to, clientId: estimate.clientId, retry: input.retry,
    about: { kind: "estimate" as const, id: estimate.id, label: estimate.number },
    dedupeKey: mailKey.estimateSent(estimate.id), by: input.by ?? "Studio",
    subject: `Estimate ${estimate.number}`,
  };
  if (hold) return { ...base, summary: "", hold };
  const total = estimateTotalOf(estimate);
  const mail = estimateSentEmail({
    clientName: first(client?.name ?? ""), number: estimate.number, total, expires: new Date(estimate.expires),
    notes: estimate.notes, url: estimateLink(estimate),
  });
  return { ...base, ...mail, summary: `${naira(total)}, holds until ${emailDate(new Date(estimate.expires))}. Link sent to ${to}.` };
}
export const stageEstimateSent = (input: { estimate: Estimate; by?: string }) => stage(planEstimateSent({ ...input, retry: true }));

function planEstimateAnswer(input: { estimate: Estimate; invoice?: Invoice | null; by?: string; retry?: boolean }): Outgoing {
  const { estimate, invoice } = input;
  const accepted = estimate.state === "Accepted";
  const { client, to, hold } = reach(estimate.clientId);
  const base = {
    to, clientId: estimate.clientId, retry: input.retry,
    about: { kind: "estimate" as const, id: estimate.id, label: estimate.number },
    dedupeKey: mailKey.estimateAnswer(estimate.id), by: input.by ?? "Studio",
    subject: accepted ? `Estimate ${estimate.number} accepted, thank you` : `Estimate ${estimate.number} recorded as declined`,
  };
  if (hold) return { ...base, summary: "", hold };
  const mail = estimateAnsweredEmail({
    clientName: first(client?.name ?? ""), number: estimate.number, accepted,
    invoiceNumber: invoice?.number, invoiceUrl: invoice ? invoiceLink(invoice) : undefined, url: estimateLink(estimate),
  });
  return { ...base, ...mail, summary: `Confirmed to the client that ${estimate.number} was ${accepted ? "accepted" : "declined"}.` };
}
export const stageEstimateAnswered = (input: { estimate: Estimate; invoice?: Invoice | null; by?: string }) => stage(planEstimateAnswer({ ...input, retry: true }));

/**
 * The studio's own notice that an estimate was answered. Settings,
 * Notifications (notify.estimates) switches it off. Once per estimate, so a
 * second press of the same answer cannot fill the inbox.
 */
export async function stageEstimateStudioNotice(input: { estimate: Estimate; invoice?: Invoice | null; by: string }): Promise<Staged> {
  const { estimate, invoice, by } = input;
  await hydrateSettings();
  if (getSetting("notify.estimates") === "0") return { state: "skipped", reason: "switched off", say: "Estimate notices are switched off in Settings, Notifications." };
  const client = getClient(estimate.clientId);
  const company = client?.company || client?.name || "A client";
  const accepted = estimate.state === "Accepted";
  const mail = estimateAnswerNoticeEmail({
    company, number: estimate.number, accepted, by: estimate.answered?.by ?? by, total: estimateTotalOf(estimate),
    invoiceNumber: invoice?.number, note: estimate.answered?.note,
    url: new URL(`/admin/money`, SITE_URL).toString(),
  });
  return stage({
    to: studioInbox(), ...mail, retry: true,
    summary: `Studio notice: ${company} ${accepted ? "accepted" : "declined"} ${estimate.number}.`,
    dedupeKey: mailKey.estimateNotice(estimate.id), by, clientId: estimate.clientId,
    about: { kind: "estimate", id: estimate.id, label: estimate.number },
  });
}

/* The estimate's total, from the one function that knows the discount. */
const estimateTotalOf = (e: Estimate) => estimateTotals(e).total;

/* --------------------------------------------------------- "Try again" */

/**
 * Rebuild and send again a money message that failed, from its record.
 *
 * The log keeps a subject and a summary and NOT the body (a log that kept every
 * word would be a second copy of the mailbox), so a retry is the message built
 * afresh from the invoice, payment or estimate its key names. Returns null for
 * a key this file does not own, so the caller can say so truthfully instead of
 * claiming a send.
 */
export async function restageFromKey(dedupeKey: string, by: string): Promise<Staged | null> {
  const base = dedupeKey.split(":superseded:")[0];
  const m = /^(invoice|receipt|reminder|paid-notice|void|refund|reversal|estimate-sent|estimate-answer|estimate-notice):([^:]+)/.exec(base);
  if (!m) return null;
  const [, kind, id] = m;
  const gone = (what: string): Staged => ({ state: "already", say: `The ${what} this was about is no longer there.` });

  if (kind === "invoice" || kind === "reminder" || kind === "void") {
    const invoice = getInvoice(id);
    if (!invoice) return gone("invoice");
    if (kind === "invoice") return stageInvoiceEmail({ invoice, by });
    if (kind === "reminder") return stageReminderEmail({ invoice, by });
    return stageVoidNotice({ invoice, by });
  }
  if (kind === "receipt" || kind === "paid-notice" || kind === "reversal") {
    const payment = getPayments().find((p) => p.id === id);
    const invoice = payment ? getInvoice(payment.invoiceId) : null;
    if (!payment || !invoice) return gone("payment");
    if (kind === "receipt") return stageReceipt({ payment, invoice, outstanding: invoiceTotals(invoice).due, by });
    if (kind === "reversal") return stageReversalNotice({ payment, invoice, by });
    /* The studio's own notice: staged through the same path, once. */
    await hydrateSettings();
    if (getSetting("notify.payments") === "0") return { state: "skipped", reason: "switched off", say: "Payment notices are switched off in Settings, Notifications." };
    const client = getClient(invoice.clientId);
    const company = client?.company || client?.name || "A client";
    const outstanding = invoiceTotals(invoice).due;
    const mail = paymentNoticeEmail({
      company, amount: naira(payment.amount), invoice: invoice.number, method: payment.method,
      left: outstanding > 0 ? `${naira(outstanding)} still owed.` : "Settled in full.",
      url: new URL(`/admin/money/${invoice.id}`, SITE_URL).toString(),
    });
    return stage({
      to: studioInbox(), ...mail, retry: true,
      summary: `Studio notice: ${naira(payment.amount)} from ${company}.`,
      dedupeKey: mailKey.paidNotice(payment.id), by, clientId: invoice.clientId,
      about: { kind: "payment", id: payment.id, label: payment.receiptNo },
    });
  }
  if (kind === "refund") {
    const payment = getPayments().find((p) => (p.refunds ?? []).some((r) => r.id === id));
    const refund = payment?.refunds?.find((r) => r.id === id);
    const invoice = payment ? getInvoice(payment.invoiceId) : null;
    if (!payment || !refund || !invoice) return gone("payment");
    return stageRefundNotice({ payment, refund, invoice, by });
  }
  const estimate = getEstimate(id);
  if (!estimate) return gone("estimate");
  const invoice = estimate.invoiceId ? getInvoice(estimate.invoiceId) : null;
  if (kind === "estimate-sent") return stageEstimateSent({ estimate, by });
  if (kind === "estimate-answer") return stageEstimateAnswered({ estimate, invoice, by });
  return stageEstimateStudioNotice({ estimate, invoice, by });
}
