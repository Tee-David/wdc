import "server-only";

import nodemailer from "nodemailer";
import { addressTo, escapeHtml } from "@/lib/email-templates";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

const globalMail = globalThis as typeof globalThis & {
  __wdcTransport?: ReturnType<typeof nodemailer.createTransport>;
};

export function mailIsConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function transport() {
  if (globalMail.__wdcTransport) return globalMail.__wdcTransport;
  const port = Number(process.env.SMTP_PORT || 465);
  const client = nodemailer.createTransport({
    host: required("SMTP_HOST"),
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user: required("SMTP_USER"), pass: required("SMTP_PASSWORD") },
    /* THESE NUMBERS KILLED THE CONTACT FORM, so they are measured now.

       They were 12s/12s/20s, and the live form answered 502. Timed against
       this server from here: a COLD connection failed at 12.18s with
       ETIMEDOUT, and the very next attempt -- with DNS and the route warm --
       verified in 6.87s and sent in 11.70s. So the server was never the
       problem and neither were the credentials. The first connection of an
       instance's life is simply slower than the ceiling we had set on it, and
       `sendMail` throwing is what the route turns into a 502.

       Set well clear of the slowest cold connect observed rather than close to
       it. A visitor never waits on this anyway: the studio notification is the
       only inline send and the receipt goes out behind the response. */
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 45_000,
    /* ONE CONNECTION, REUSED. Without a pool every `sendMail` opens its own
       connection, so the enquiry and the receipt each paid that cold handshake
       separately -- the second one for no reason, microseconds after the first
       had finished proving the route was warm. */
    pool: true,
    maxConnections: 1,
  });
  /* CACHED IN PRODUCTION TOO, and that was the other half of it. The cache was
     skipped in production, so every request on a warm instance built a new
     transport and paid a cold handshake that the instance had already paid.
     Holding it is what makes the pool above mean anything. */
  globalMail.__wdcTransport = client;
  return client;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /**
   * Inline parts, referenced from the HTML as `cid:<id>`. Only the document QR
   * on the invoice and receipt uses this today; see `documentQr()` in
   * lib/email-templates.ts for why it is an attachment rather than a URL.
   */
  attachments?: { filename: string; content: string; contentType: string; cid: string }[];
  /**
   * Set on anything a person did not individually ask us to send them -- a
   * receipt, a reminder, a digest. Gmail weighs a one-click unsubscribe
   * heavily: a message that offers one is treated as accountable bulk mail,
   * and one that does not looks like mail that does not expect to be refused.
   * A reply to a human conversation should leave this off.
   */
  unsubscribe?: boolean;
}) {
  const { unsubscribe, ...message } = input;
  const contact = process.env.SMTP_REPLY_TO || process.env.SMTP_FROM_EMAIL;

  return transport().sendMail({
    from: {
      name: process.env.SMTP_FROM_NAME?.trim() || "WDC Solutions",
      address: required("SMTP_FROM_EMAIL"),
    },
    replyTo: input.replyTo || process.env.SMTP_REPLY_TO || undefined,
    ...message,
    /* The footer's "sent to" line names this address. */
    html: message.html ? addressTo(message.html, message.to) : undefined,
    headers: unsubscribe && contact
      ? {
          /* A mailto rather than a URL, because there is no unsubscribe
             endpoint yet and a link to one that does not exist is worse than
             no link. Swap it for a URL the day there is one. The footer of
             every template that sets `unsubscribe` points at the same address,
             because a header that offers a way out and a body that does not is
             two different promises. */
          "List-Unsubscribe": `<mailto:${contact}?subject=unsubscribe>`,
        }
      : undefined,
  });
}

export { escapeHtml };
