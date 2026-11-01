import "server-only";

import nodemailer from "nodemailer";
import { addressTo, escapeHtml, withSocials } from "@/lib/email-templates";
import { socialLinks } from "@/lib/social";
import { getSetting } from "@/lib/admin/store";
import { hydrateSettings } from "@/lib/settings/store";
import { CONTACT_EMAIL } from "@/lib/site";
import { DEFAULT_MAIL_FROM_NAME, mailFrom } from "@/lib/mail-sender";
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
  /* PLAIN SMTP, a connection per message, the way the Meridian site sends.

     The slowness and the "high-probability spam" refusals were the old host
     (rbx107), not this code: on 1 November 2026 it refused a one-line plain
     message from info@ to itself after 28s, while das131 sent the same line
     in 3.4s and took HTML and a PDF in under 6s. The mailbox moved to das131.

     No pool: a socket held open across serverless invocations goes stale while
     the instance is frozen. No custom greeting name: a Vercel IP introducing
     itself as our domain only adds to a spam score. */
  const client = nodemailer.createTransport({
    host: required("SMTP_HOST"),
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user: required("SMTP_USER"), pass: required("SMTP_PASSWORD") },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  });
  globalMail.__wdcTransport = client;
  return client;
}

/**
 * Connect and authenticate, send nothing. A few seconds against das131,
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
