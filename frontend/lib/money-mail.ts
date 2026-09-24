import "server-only";

import { SITE_URL } from "@/lib/site";
import { escapeHtml, mailIsConfigured } from "@/lib/email";
import { composeEmailHtml, emailButton, emailP, emailSmall } from "@/lib/email-templates";
import { getClient } from "@/lib/admin/store";
import { queueLogged } from "@/lib/message-log";
import { sendLogged } from "@/lib/outbox";
import { invoiceTotals, naira, notifyAllows } from "@/lib/admin/types";
import type { Invoice, Payment } from "@/lib/admin/types";

/**
 * The money messages: the invoice going out, the receipt coming back, and the
 * nudge in between.
 *
 * EVERY ONE OF THEM WRITES ITS ROW BEFORE IT CALLS THE MAIL SERVER. The send
 * happens behind the response -- 23 seconds of SMTP handshake is not something
 * a payer waits through -- so by the time it fails there is nobody left to
 * tell. The row is the telling. See the note above `queueMessage`.
 *
 * THE DEDUPE KEY IS THE EVENT, NOT THE ATTEMPT. `receipt:y7` is the receipt
 * for payment y7 however many times Paystack retries the webhook and however
 * many times the payer reloads the return page.
 *
 * WHAT A CLIENT CAN SWITCH OFF, AND WHAT THEY CANNOT. Reminders are the
 * studio's choice to chase, so they respect the client's setting. A receipt
 * for money they have actually paid is a record they are entitled to, and it
 * is not a notification to opt out of.
 */


/** The shared frame from lib/email-templates.ts: one look for every message we send. */
function shell(title: string, preheader: string, blocks: string[], unsubscribe = false) {
  return composeEmailHtml({ title, preheader, heading: title, blocks, unsubscribe });
}

type SendOutcome = { sent: boolean; reason?: string };

/** The one path every message in this file takes out. The row, the dedupe and
    the settle all live in `sendLogged`; this only turns its throw into an
    outcome, because the money actions report a reason rather than fail. */
async function deliver(input: {
  to: string; subject: string; text: string; html: string;
  summary: string; dedupeKey: string; by: string;
  clientId?: string;
  about?: { kind: "invoice" | "payment"; id: string; label: string };
  unsubscribe?: boolean;
}): Promise<SendOutcome> {
  const configured = mailIsConfigured();
  try {
    const result = await sendLogged(
      { to: input.to, subject: input.subject, text: input.text, html: input.html, unsubscribe: input.unsubscribe },
      { summary: input.summary, dedupeKey: input.dedupeKey, by: input.by, clientId: input.clientId, about: input.about },
    );
    /* The retry that did not double-send. */
    return result === "duplicate" ? { sent: false, reason: "already sent" } : { sent: true };
  } catch {
    return { sent: false, reason: configured ? "send failed" : "mail not configured" };
  }
}

/**
 * "We have your money." Sent on every successful payment, whatever the method.
 *
 * IT CARRIES THE RECEIPT'S OWN URL rather than an attachment. The public
 * receipt is the live document: it knows about a later reversal, and an
 * attached copy does not.
 */
export async function sendPaymentReceiptEmail(input: {
  payment: Payment; invoice: Invoice; outstanding: number;
}) {
  const { payment, invoice, outstanding } = input;
  const client = getClient(invoice.clientId);
  const to = client?.email?.trim();
  if (!to) {
    await queueLogged({
      channel: "Email", to: "(no address on file)",
      subject: `Receipt ${payment.receiptNo}`,
      summary: `Not sent: ${client?.company ?? "the client"} has no email address on file.`,
      dedupeKey: `receipt:${payment.id}`, by: payment.by,
      clientId: invoice.clientId, state: "Skipped",
      about: { kind: "payment", id: payment.id, label: payment.receiptNo },
    });
    return { sent: false, reason: "no address" };
  }

  const url = new URL(`/r/${payment.token}`, SITE_URL).toString();
  const line = outstanding > 0
    ? `${naira(outstanding)} is still outstanding on ${invoice.number}.`
    : `${invoice.number} is settled in full. Thank you.`;

  return deliver({
    to,
    clientId: invoice.clientId,
    about: { kind: "payment", id: payment.id, label: payment.receiptNo },
    dedupeKey: `receipt:${payment.id}`,
    by: payment.by,
    subject: `Receipt ${payment.receiptNo}: ${naira(payment.amount)} received`,
    summary: `${naira(payment.amount)} against ${invoice.number}. ${line}`,
    text: [
      `We have received ${naira(payment.amount)} against ${invoice.number}.`,
      line,
      "",
      `Your receipt: ${url}`,
      "",
      `Receipt number ${payment.receiptNo}. Paid by ${payment.method}, reference ${payment.reference}.`,
    ].join("\n"),
    html: shell("Thank you, payment received", `${naira(payment.amount)} received against ${invoice.number}.`, [
      emailP(`We have received <b>${naira(payment.amount)}</b> against <b>${escapeHtml(invoice.number)}</b>.`),
      emailP(escapeHtml(line)),
      emailButton("Open your receipt", url),
      emailSmall(`Receipt ${escapeHtml(payment.receiptNo)} &middot; paid by ${escapeHtml(payment.method)} &middot; reference ${escapeHtml(payment.reference)}`),
    ]),
  });
}

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
 */
export async function sendInvoiceEmail(input: { invoice: Invoice; by?: string }) {
  const { invoice } = input;
  const client = getClient(invoice.clientId);
  const to = client?.email?.trim();
  const totals = invoiceTotals(invoice);
  const url = new URL(`/i/${invoice.token}`, SITE_URL).toString();

  if (!to) {
    await queueLogged({
      channel: "Email", to: "(no address on file)",
      subject: `Invoice ${invoice.number}`,
      summary: `Not sent: ${client?.company ?? "the client"} has no email address on file.`,
      dedupeKey: `invoice:${invoice.id}`, by: input.by ?? "Studio",
      clientId: invoice.clientId, state: "Skipped",
      about: { kind: "invoice", id: invoice.id, label: invoice.number },
    });
    return { sent: false, reason: "no address" };
  }

  const due = new Date(invoice.due).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return deliver({
    to,
    clientId: invoice.clientId,
    about: { kind: "invoice", id: invoice.id, label: invoice.number },
    dedupeKey: `invoice:${invoice.id}`,
    by: input.by ?? "Studio",
    subject: `Invoice ${invoice.number}: ${naira(totals.due)} due ${due}`,
    summary: `${naira(totals.due)} due ${due}. Link sent to ${to}.`,
    text: [
      `Invoice ${invoice.number} for ${naira(totals.due)} is due on ${due}.`,
      "",
      `Open it, and pay by card or transfer, here: ${url}`,
      "",
      "Card or bank transfer, both on the same page. Anything that goes wrong, reply to this email and we will sort it out.",
    ].join("\n"),
    html: shell(`Invoice ${invoice.number}`, `${naira(totals.due)} due ${due}.`, [
      emailP(`<b>${naira(totals.due)}</b> is due on <b>${escapeHtml(due)}</b>.`),
      emailP("The invoice shows everything billed and anything already paid against it, and you can pay it by card or transfer on the same page."),
      emailButton("Open and pay the invoice", url),
      emailSmall(`Anything that goes wrong, reply to this email quoting ${escapeHtml(invoice.number)} and we will sort it out.`),
    ]),
  });
}

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
export async function sendInvoiceReminderEmail(input: { invoice: Invoice; today?: Date; by?: string }) {
  const { invoice } = input;
  const client = getClient(invoice.clientId);
  const to = client?.email?.trim();
  const day = (input.today ?? new Date()).toISOString().slice(0, 10);

  if (!notifyAllows(client?.notify, "reminders")) {
    await queueLogged({
      channel: "Email", to: to || "(no address on file)",
      subject: `Reminder for ${invoice.number}`,
      summary: `Not sent: ${client?.company ?? "the client"} has invoice reminders switched off.`,
      dedupeKey: `reminder:${invoice.id}:${day}`, by: input.by ?? "Studio",
      clientId: invoice.clientId, state: "Skipped",
      about: { kind: "invoice", id: invoice.id, label: invoice.number },
    });
    return { sent: false, reason: "opted out" };
  }
  if (!to) return { sent: false, reason: "no address" };

  const totals = invoiceTotals(invoice);
  const url = new URL(`/i/${invoice.token}`, SITE_URL).toString();
  const due = new Date(invoice.due).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return deliver({
    to,
    clientId: invoice.clientId,
    about: { kind: "invoice", id: invoice.id, label: invoice.number },
    dedupeKey: `reminder:${invoice.id}:${day}`,
    by: input.by ?? "Studio",
    unsubscribe: true,
    subject: `A reminder about invoice ${invoice.number}`,
    summary: `${naira(totals.due)} outstanding, due ${due}.`,
    text: [
      `This is a friendly reminder that ${naira(totals.due)} is outstanding on invoice ${invoice.number}, which was due on ${due}.`,
      "",
      `Open and pay it here: ${url}`,
      "",
      "If it has already been paid, or if something about it needs sorting out, just reply and we will take a look.",
    ].join("\n"),
    html: shell("A reminder about your invoice", `${naira(totals.due)} outstanding on ${invoice.number}.`, [
      emailP(`<b>${naira(totals.due)}</b> is outstanding on <b>${escapeHtml(invoice.number)}</b>, which was due on ${escapeHtml(due)}.`),
      emailButton("Open and pay the invoice", url),
      emailSmall("Already paid, or something needs sorting out? Reply to this email and we will take a look."),
    ], true),
  });
}
