import { designed } from "@/lib/email-designed";
import "server-only";

import { studioInbox } from "@/lib/email";
import { hydrateSettings } from "@/lib/settings/store";

import { SITE_URL } from "@/lib/site";
import { supportNoticeEmail, supportReplyEmail } from "@/lib/email-templates";
import { getClient, getSetting } from "@/lib/admin/store";
import { queueLogged } from "@/lib/message-log";
import { notifyAllows, type Ticket } from "@/lib/admin/types";
import { sendLogged } from "@/lib/outbox";
import { logNotSent } from "@/lib/lifecycle-mail";

/**
 * SUPPORT MESSAGES: the studio hears about a question or a reply, and the
 * client hears the studio's answer.
 *
 * Through the outbox like every other message: the row is written before the
 * mail server is called and keyed to the message, so a retry sends once.
 * Called from behind the response. The client's copy is a "project update"
 * they can switch off; switched off, the row says Skipped and why.
 */
const first = (name: string) => name.trim().split(/\s+/)[0] || name;

export async function sendSupportNotice(input: { ticket: Ticket; body: string; opened: boolean; messageId: string }) {
  const { ticket, body, opened, messageId } = input;
  /* Settings, Notifications: the studio can switch these off. */
  await hydrateSettings();
  if (getSetting("notify.tickets") === "0") return;
  const client = getClient(ticket.clientId);
  const company = client?.company || client?.name || "A client";
  try {
    await sendLogged(
      { to: studioInbox(), ...supportNoticeEmail({ company, subject: ticket.subject, body, opened, url: new URL(`/admin/clients/support/${ticket.id}`, SITE_URL).toString() }) },
      { summary: opened ? "A client opened a question." : "A client replied.", dedupeKey: `support-notice:${messageId}`, by: "Portal", clientId: ticket.clientId },
    );
  } catch { /* The row records the failure. */ }
}

export async function sendSupportReply(input: { ticket: Ticket; reply: string; author: string; messageId: string; by: string }) {
  const { ticket, reply, author, messageId, by } = input;
  const client = getClient(ticket.clientId);
  const email = client?.email?.trim();
  if (!client) return;
  const subject = `Re: ${ticket.subject}`;
  const dedupeKey = `support-reply:${messageId}`;
  if (!email) return logNotSent({ why: `${client.company} has no email address on file.`, subject, dedupeKey, by, clientId: client.id });
  if (!notifyAllows(client.notify, "updates")) {
    await queueLogged({
      channel: "Email", to: email, subject, summary: `Not sent: ${client.company} has project updates switched off.`,
      dedupeKey, by, clientId: client.id, state: "Skipped",
    });
    return;
  }
  try {
    await sendLogged(
      { to: email, ...(await designed("support-reply", {
        "client.first_name": first(client.name), "ticket.subject": ticket.subject, "reply.body": reply, "reply.author": author,
        "links.thread": new URL(`/portal/support/${ticket.id}`, SITE_URL).toString(),
      }, () => supportReplyEmail({ clientName: first(client.name), subject: ticket.subject, reply, author, url: new URL(`/portal/support/${ticket.id}`, SITE_URL).toString() }))) },
      { summary: "The studio replied to a support question.", dedupeKey, by, clientId: client.id },
    );
  } catch { /* The row records the failure. */ }
}
