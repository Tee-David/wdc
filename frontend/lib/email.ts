import "server-only";

import nodemailer from "nodemailer";
import { addressTo, escapeHtml, withSocials } from "@/lib/email-templates";
import { socialLinks } from "@/lib/social";
import { getSetting } from "@/lib/admin/store";
import { hydrateSettings } from "@/lib/settings/store";
import { CONTACT_EMAIL } from "@/lib/site";
import { DEFAULT_MAIL_FROM_NAME, mailFrom, smtpHostname } from "@/lib/mail-sender";
import { sendThrough, type Outgoing } from "@/lib/mail-connections";
import { alertMailFailure } from "@/lib/mail-webhook-alert";
import { deliverMail } from "@/lib/mail-delivery";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

const globalMail = globalThis as typeof globalThis & {
  __wdcTransport?: ReturnType<typeof nodemailer.createTransport>;
};

/**
 * Everything `sendMail` refuses to run without, the from-address included.
 * It used to leave SMTP_FROM_EMAIL out, so a deploy missing it was listed as
 * set up and then failed every send at the last step.
 */
export const MAIL_VARIABLES = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"] as const;

export function mailIsConfigured() {
  return MAIL_VARIABLES.every((k) => Boolean(process.env[k]?.trim()));
}

/** The names of what is missing, never the values. */
export const missingMailVariables = () => MAIL_VARIABLES.filter((k) => !process.env[k]?.trim());

function transport() {
  if (globalMail.__wdcTransport) return globalMail.__wdcTransport;
  const port = Number(process.env.SMTP_PORT || 465);
  const client = nodemailer.createTransport({
    name: smtpHostname(required("SMTP_FROM_EMAIL")),
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

/**
 * Connect and authenticate, send nothing. About 23 seconds against Truehost,
 * so it is only ever called behind a response (Settings > System).
 */
export async function verifyMail(): Promise<void> {
  await transport().verify();
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Copies, set per form in the admin's form settings. */
  cc?: string[];
  bcc?: string[];
  /**
   * With a `cid`, an inline part referenced from the HTML as `cid:<id>`: the
   * document QR on the invoice and receipt (see `documentQr()` in
   * lib/email-templates.ts for why it is an attachment rather than a URL).
   * Without one, a file to open: the entry PDF and what the client sent, on
   * the studio's notice (lib/forms/entry-mail.ts).
   */
  attachments?: { filename: string; content: string | Buffer; contentType: string; cid?: string }[];
  /**
   * Set on anything a person did not individually ask us to send them -- a
   * receipt, a reminder, a digest. Gmail weighs a one-click unsubscribe
   * heavily: a message that offers one is treated as accountable bulk mail,
   * and one that does not looks like mail that does not expect to be refused.
   * A reply to a human conversation should leave this off.
   */
  unsubscribe?: boolean;
  /** A signed one-click link for this recipient, when there is one. */
  unsubscribeUrl?: string;
}) {
  const { unsubscribe, unsubscribeUrl, ...message } = input;
  /* Sender name and reply-to from Settings, Email; the environment is what
     shipped. A settings read that fails leaves what shipped. */
  await hydrateSettings();
  const replyTo = getSetting("mail.replyTo") || process.env.SMTP_REPLY_TO || undefined;
  const fromName = getSetting("mail.fromName") || process.env.SMTP_FROM_NAME?.trim() || DEFAULT_MAIL_FROM_NAME;
  const contact = replyTo || process.env.SMTP_FROM_EMAIL;
  /* The link first, where there is one: RFC 8058's one-click POST is what
     Gmail and Yahoo reward. The mailto stays as the fallback for clients that
     only understand that. */
  const listUnsubscribe = [unsubscribeUrl ? `<${unsubscribeUrl}>` : null, contact ? `<mailto:${contact}?subject=unsubscribe>` : null]
    .filter(Boolean).join(", ");

  /* SIMULATE MODE (Settings › Email › Connections): the message is built and logged, and nothing leaves. For previews and staging. */
  if (getSetting("mail.simulate") === "yes") return;
  const html = message.html ? withSocials(addressTo(message.html, message.to), socialLinks(getSetting)) : undefined;
  const headers = unsubscribe && listUnsubscribe
    ? { "List-Unsubscribe": listUnsubscribe, ...(unsubscribeUrl ? { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {}) }
    : undefined;
  const base = { ...message, html, headers, replyTo: input.replyTo || replyTo };

  /* WHERE IT GOES (Settings › Email › Connections): the default connection,
     then, if that fails, the fallback once. "env" is the studio's own server
     from the environment and is what is used until a default is chosen. The
     fallback is single-hop: a second failure throws, as it always did. */
  const chosen = getSetting("mail.default") || "env";
  const fallback = getSetting("mail.fallback") || "";
  const via = async (id: string) => {
    return deliverMail(base, async (message) => {
      if (id === "env") {
        return transport().sendMail({ ...message, from: mailFrom(fromName, required("SMTP_FROM_EMAIL")) });
      }
      await sendThrough(id, { ...message, from: mailFrom(fromName, "") } as Outgoing);
    });
  };
  try {
    return await via(chosen);
  } catch (first) {
    if (fallback && fallback !== chosen) {
      try {
        const done = await via(fallback);
        void alertMailFailure(`Mail: the default connection failed (${first instanceof Error ? first.message.slice(0, 120) : "error"}), so the fallback sent it.`);
        return done;
      } catch { /* both failed: report the first, below */ }
    }
    void alertMailFailure(`Mail failed to send: ${first instanceof Error ? first.message.slice(0, 160) : "unknown error"}`);
    throw first;
  }
}

export { escapeHtml };

/**
 * Where notices to the studio go: "Replies go to" from Settings, Email, else
 * the environment's reply-to, else the contact address. Synchronous, because
 * the form emails are built synchronously: a caller runs `hydrateSettings()`
 * first (every route that builds one does), or it reads what shipped.
 */
export function studioInbox(): string {
  return getSetting("mail.replyTo") || process.env.SMTP_REPLY_TO || CONTACT_EMAIL;
}
