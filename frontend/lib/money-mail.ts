import "server-only";

import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { escapeHtml, mailIsConfigured, sendMail } from "@/lib/email";
import { getClient, queueMessage, settleMessage } from "@/lib/admin/store";
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

const FROM_STUDIO = "We Dig Creativity";

function shell(title: string, body: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#11113a;max-width:600px">
<p style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#c95000;margin:0">${escapeHtml(FROM_STUDIO.toUpperCase())}</p>
<h1 style="font-size:26px;margin:10px 0 16px">${escapeHtml(title)}</h1>
${body}
<hr style="border:0;border-top:1px solid #e7e7ef;margin:26px 0 14px">
<p style="color:#5a5a72;font-size:13px;margin:0">Questions about this go to <a href="mailto:${CONTACT_EMAIL}" style="color:#c95000">${CONTACT_EMAIL}</a>.</p>
</div>`;
}

/* BLACK ON ORANGE, NOT WHITE. White on #ff6500 measures 2.95:1 and fails even
   the 3:1 allowed for large text; black is 7.11:1. The same rule the site's
   buttons follow, and an email client is no more forgiving than a browser. */
function button(href: string, label: string) {
  return `<p style="margin:22px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#ff6500;color:#000000;padding:13px 22px;border-radius:10px;font-weight:700;text-decoration:none">${escapeHtml(label)}</a></p>`;
}

type SendOutcome = { sent: boolean; reason?: string };

/** The one path every message in this file takes out. */
async function deliver(input: {
  to: string; subject: string; text: string; html: string;
  summary: string; dedupeKey: string; by: string;
  clientId?: string;
  about?: { kind: "invoice" | "payment"; id: string; label: string };
  unsubscribe?: boolean;
}): Promise<SendOutcome> {
  const queued = queueMessage({
    channel: "Email", to: input.to, subject: input.subject, summary: input.summary,
    dedupeKey: input.dedupeKey, by: input.by, clientId: input.clientId, about: input.about,
  });
  /* The retry that did not double-send. */
  if (!queued.ok) return { sent: false, reason: "already sent" };

  if (!mailIsConfigured()) {
    settleMessage(queued.message.id, "Failed", "SMTP is not configured on this deployment.");
    return { sent: false, reason: "mail not configured" };
  }
  try {
    await sendMail({
      to: input.to, subject: input.subject, text: input.text, html: input.html,
      unsubscribe: input.unsubscribe,
    });
    settleMessage(queued.message.id, "Sent");
    return { sent: true };
  } catch (e) {
    settleMessage(queued.message.id, "Failed", e instanceof Error ? e.message : "The mail server refused it.");
    return { sent: false, reason: "send failed" };
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
    queueMessage({
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
    html: shell("Thank you, payment received", `
<p>We have received <b>${naira(payment.amount)}</b> against <b>${escapeHtml(invoice.number)}</b>.</p>
<p>${escapeHtml(line)}</p>
${button(url, "Open your receipt")}
<p style="color:#5a5a72;font-size:13px">Receipt ${escapeHtml(payment.receiptNo)} · paid by ${escapeHtml(payment.method)} · reference ${escapeHtml(payment.reference)}</p>`),
  });
}

/**
 * The invoice itself, with the link that pays it.
 *
 * THE LINK IS THE INVOICE, not a separate "payment link". `/i/<token>` shows
 * what is owed, what has already been paid against it, and carries the button
 * that starts a checkout -- so there is one URL to send, one to quote in a
 * WhatsApp message, and one printed as a QR on the paper copy.
 */
export async function sendInvoiceEmail(input: { invoice: Invoice; by?: string }) {
  const { invoice } = input;
  const client = getClient(invoice.clientId);
  const to = client?.email?.trim();
  const totals = invoiceTotals(invoice);
  const url = new URL(`/i/${invoice.token}`, SITE_URL).toString();

  if (!to) {
    queueMessage({
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
      "You can also pay by bank transfer. Reply to this email and we will send the account details.",
    ].join("\n"),
    html: shell(`Invoice ${invoice.number}`, `
<p><b>${naira(totals.due)}</b> is due on <b>${escapeHtml(due)}</b>.</p>
<p>The link below opens the invoice. It shows everything billed and anything already paid against it, and it carries a button to pay by card.</p>
${button(url, "Open and pay the invoice")}
<p style="color:#5a5a72;font-size:13px">Prefer a bank transfer? Reply to this email and we will send the account details. Quote ${escapeHtml(invoice.number)} on the transfer.</p>`),
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
    queueMessage({
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
    html: shell("A reminder about your invoice", `
<p><b>${naira(totals.due)}</b> is outstanding on <b>${escapeHtml(invoice.number)}</b>, which was due on ${escapeHtml(due)}.</p>
${button(url, "Open and pay the invoice")}
<p>If it has already been paid, or if something about it needs sorting out, just reply to this email and we will take a look.</p>`),
  });
}
