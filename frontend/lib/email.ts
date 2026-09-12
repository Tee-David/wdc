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
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
  });
  if (process.env.NODE_ENV !== "production") globalMail.__wdcTransport = client;
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
      name: process.env.SMTP_FROM_NAME?.trim() || "We Dig Creativity",
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
