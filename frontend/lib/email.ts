import "server-only";

import nodemailer from "nodemailer";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[char]!);
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
}) {
  return transport().sendMail({
    from: {
      name: process.env.SMTP_FROM_NAME?.trim() || "WDC Solutions",
      address: required("SMTP_FROM_EMAIL"),
    },
    replyTo: input.replyTo || process.env.SMTP_REPLY_TO || undefined,
    ...input,
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  const safeUrl = escapeHtml(url);
  await sendMail({
    to,
    subject: "Reset your WDC admin password",
    text: `A password reset was requested for your WDC admin account. Open this link within one hour: ${url}\n\nIf you did not request this, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#11113a;max-width:560px"><p style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#ff6500">WDC STUDIO ADMIN</p><h1 style="font-size:28px;margin:12px 0">Reset your password</h1><p>A password reset was requested for your admin account.</p><p><a href="${safeUrl}" style="display:inline-block;background:#ff6500;color:#ffffff;padding:13px 20px;border-radius:10px;font-weight:700;text-decoration:none">Choose a new password</a></p><p style="color:#666680;font-size:13px">This link expires in one hour. If you did not request it, you can ignore this message.</p></div>`,
  });
}

export { escapeHtml };
