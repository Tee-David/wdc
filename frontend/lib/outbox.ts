import "server-only";

import { createHash } from "node:crypto";
import { mailIsConfigured, sendMail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-templates";
import { queueMessage, settleMessage } from "@/lib/admin/store";
import type { Id, Message } from "@/lib/admin/types";

/**
 * The one door every outbound email leaves through.
 *
 * `sendMail()` talks to the mail server; this writes the log row first and
 * settles it after, so a message that fails behind the response still leaves
 * something a person can find. The money messages were the only ones doing
 * that. The contact form, the newsletter, onboarding, the tools and the
 * password reset called `sendMail()` directly, and when one of them failed the
 * only trace was a line in a function log nobody reads.
 *
 * SAME CONTRACT AS `sendMail()`: it throws when the send fails. Every call site
 * already had a try/catch shaped around that, so moving a send onto the outbox
 * changes what is recorded, never what the visitor is told.
 *
 * NO BODY IS STORED. The row carries the subject and a one-line summary; the
 * message itself can be rebuilt from its template and the ids the summary
 * names. A log that kept every word would be a second copy of the mailbox.
 *
 * A DUPLICATE IS NOT SENT. The dedupe key names the event, so a retry of the
 * same event returns "duplicate" instead of mailing somebody twice.
 */
export type OutboxLog = {
  summary: string;
  dedupeKey: string;
  by?: string;
  clientId?: Id;
  about?: Message["about"];
};

type Mail = Parameters<typeof sendMail>[0];

export async function sendLogged(mail: Mail, log: OutboxLog): Promise<"sent" | "duplicate"> {
  const queued = queueMessage({
    channel: "Email", to: mail.to, subject: mail.subject, summary: log.summary,
    dedupeKey: log.dedupeKey, by: log.by ?? "Website", clientId: log.clientId, about: log.about,
  });
  if (!queued.ok) return "duplicate";

  if (!mailIsConfigured()) {
    settleMessage(queued.message.id, "Failed", "SMTP is not configured on this deployment.");
    throw new Error("SMTP is not configured on this deployment.");
  }
  try {
    await sendMail(mail);
    settleMessage(queued.message.id, "Sent");
    return "sent";
  } catch (error) {
    settleMessage(queued.message.id, "Failed", error instanceof Error ? error.message : "The mail server refused it.");
    throw error;
  }
}

/**
 * A key for an event that carries a secret, such as a reset or resume link.
 *
 * The raw token never goes into the log: a row readable by the studio must not
 * be a way into somebody's account. A short hash is stable for the same link
 * and useless without it.
 */
export function secretKey(prefix: string, secret: string) {
  return `${prefix}:${createHash("sha256").update(secret).digest("hex").slice(0, 16)}`;
}

/**
 * The reset link, as mail.
 *
 * CALLED FROM BEHIND THE RESPONSE. Better Auth runs this through its
 * `advanced.backgroundTasks` handler, which lib/auth.ts wires to Next's
 * `after()`: this mail server needs about 23 seconds just to authenticate, and
 * nobody should watch a spinner for that after asking for a reset link. The
 * consequence is that a failure here has no one left to tell, so it is logged
 * rather than thrown -- and the reset token is already in the database either
 * way, so a retry is one more request rather than a lost account.
 *
 * IT LIVES HERE rather than in lib/email.ts so the reset writes an outbox row
 * like every other message; lib/email.ts cannot import the outbox without a
 * cycle.
 */
export async function sendPasswordResetEmail(
  to: string,
  url: string,
  name?: string,
  expiresInMinutes = 60,
) {
  await sendLogged(
    { to, ...passwordResetEmail({ name, url, expiresInMinutes }) },
    /* The link is a credential, so only its hash names the row. */
    { summary: "A password reset link.", dedupeKey: secretKey("password-reset", url), by: "Account security" },
  );
}
