import "server-only";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { db } from "@/lib/db/pool";
import { open, seal, secretsReady } from "./mail-secrets";

/**
 * MAIL CONNECTIONS: where a message can leave from. The studio's own server
 * (from the environment) is always there as "env". Others are saved here:
 * plain SMTP, Postmark, Brevo. One is the default and one may be the
 * fallback; the choice is two app settings (`mail.default`, `mail.fallback`).
 *
 * Secrets (passwords, API keys) are sealed with lib/mail-secrets.ts, shown in
 * the admin only as "saved", and a blank field on edit keeps the saved value.
 */
import { KINDS, type Kind } from "./mail-kinds";
export { KINDS };
export type { Kind };

export type Connection = {
  id: string; kind: Kind; name: string; fromEmail: string; settings: Record<string, string>;
  saved: string[]; // names of secrets that are stored
  health: { status: "ok" | "error"; message: string; at: string } | null;
};

type Row = { id: string; kind: Kind; name: string; from_email: string; settings: Record<string, string>; secrets_enc: string; health_status: string | null; health_message: string | null; health_at: Date | null };
const secretNames = (r: Row) => { try { return r.secrets_enc ? Object.keys(JSON.parse(open(r.secrets_enc))) : []; } catch { return []; } };
const toConn = (r: Row): Connection => ({
  id: r.id, kind: r.kind, name: r.name, fromEmail: r.from_email, settings: r.settings ?? {}, saved: secretNames(r),
  health: r.health_at ? { status: r.health_status === "ok" ? "ok" : "error", message: r.health_message ?? "", at: r.health_at.toISOString() } : null,
});

export async function listConnections(): Promise<Connection[] | null> {
  try { return (await db.query<Row>(`SELECT * FROM mail_connections ORDER BY created_at`)).rows.map(toConn); } catch { return null; }
}

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export async function saveConnection(input: { id?: string; kind: Kind; name: string; fromEmail: string; settings: Record<string, string>; secrets: Record<string, string> }, by: string): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (!KINDS[input.kind]) return { ok: false, message: "Choose a service." };
  if (input.name.trim().length < 2) return { ok: false, message: "Give it a name." };
  if (!EMAIL.test(input.fromEmail.trim())) return { ok: false, message: "The sending address is not valid." };
  if (!secretsReady()) return { ok: false, message: "Saving keys needs MAIL_SECRETS_KEY in the hosting environment (64 hex characters; openssl rand -hex 32). Nothing was saved." };
  const allowed = new Set(KINDS[input.kind].fields.map((f) => f.key));
  const settings = Object.fromEntries(Object.entries(input.settings).filter(([k]) => allowed.has(k)).map(([k, v]) => [k, String(v).trim().slice(0, 200)]));
  try {
    let existing: Record<string, string> = {};
    if (input.id) {
      const r = await db.query<Row>(`SELECT * FROM mail_connections WHERE id = $1`, [input.id]);
      if (!r.rows[0]) return { ok: false, message: "That connection is gone." };
      existing = r.rows[0].secrets_enc ? JSON.parse(open(r.rows[0].secrets_enc)) : {};
    }
    const names = KINDS[input.kind].secrets.map((s) => s.key);
    const merged: Record<string, string> = {};
    for (const n of names) { const v = (input.secrets[n] ?? "").trim(); if (v) merged[n] = v.slice(0, 500); else if (existing[n]) merged[n] = existing[n]; }
    if (names.some((n) => !merged[n])) return { ok: false, message: `${KINDS[input.kind].secrets.map((s) => s.label).join(", ")} is needed.` };
    if (input.kind === "smtp" && (!settings.host || !settings.user)) return { ok: false, message: "A server and a username are needed." };
    const id = input.id ?? randomUUID();
    await db.query(
      `INSERT INTO mail_connections (id, kind, name, from_email, settings, secrets_enc, created_by) VALUES ($1,$2,$3,$4,$5::JSONB,$6,$7)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name, from_email = excluded.from_email, settings = excluded.settings, secrets_enc = excluded.secrets_enc, updated_at = now(), health_status = NULL, health_message = NULL, health_at = NULL`,
      [id, input.kind, input.name.trim().slice(0, 80), input.fromEmail.trim(), JSON.stringify(settings), seal(JSON.stringify(merged)), by],
    );
    return { ok: true, id };
  } catch (e) {
    return { ok: false, message: e instanceof Error && /MAIL_SECRETS_KEY/.test(e.message) ? e.message : "It could not be saved. Is migration 0044 applied (Settings › System)?" };
  }
}

export async function deleteConnection(id: string) { await db.query(`DELETE FROM mail_connections WHERE id = $1`, [id]); }

/* --------------------------------------------------------------- sending */

export type Outgoing = {
  from: { name: string; address: string }; to: string; subject: string; text: string; html?: string; replyTo?: string;
  cc?: string[]; bcc?: string[]; headers?: Record<string, string>;
  attachments?: { filename: string; content: string | Buffer; contentType: string; cid?: string }[];
};

async function load(id: string): Promise<{ row: Row; secrets: Record<string, string> } | null> {
  const r = await db.query<Row>(`SELECT * FROM mail_connections WHERE id = $1`, [id]);
  const row = r.rows[0];
  if (!row) return null;
  return { row, secrets: row.secrets_enc ? JSON.parse(open(row.secrets_enc)) : {} };
}

const b64 = (c: string | Buffer) => Buffer.from(c).toString("base64");
const addr = (a: { name: string; address: string }) => (a.name ? `${a.name.replace(/[<>"]/g, "")} <${a.address}>` : a.address);

async function httpJson(url: string, init: RequestInit, ms = 20_000) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 200).replace(/[A-Za-z0-9_\-]{24,}/g, "…");
    throw new Error(`${res.status} ${body}`);
  }
}

/** Sends one message through one saved connection. Throws on failure. */
export async function sendThrough(id: string, m: Outgoing): Promise<void> {
  const c = await load(id);
  if (!c) throw new Error("That mail connection no longer exists.");
  const from = { name: m.from.name, address: c.row.from_email };
  if (c.row.kind === "smtp") {
    const port = Number(c.row.settings.port || 465);
    const t = nodemailer.createTransport({
      host: c.row.settings.host, port, secure: c.row.settings.secure ? c.row.settings.secure === "ssl" : port === 465,
      auth: { user: c.row.settings.user, pass: c.secrets.password }, connectionTimeout: 30_000, greetingTimeout: 30_000, socketTimeout: 45_000,
    });
    try { await t.sendMail({ ...m, from }); } finally { t.close(); }
    return;
  }
  if (c.row.kind === "postmark") {
    await httpJson("https://api.postmarkapp.com/email", {
      method: "POST", headers: { "X-Postmark-Server-Token": c.secrets.token, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        From: addr(from), To: m.to, Cc: m.cc?.join(","), Bcc: m.bcc?.join(","), ReplyTo: m.replyTo, Subject: m.subject, TextBody: m.text, HtmlBody: m.html,
        MessageStream: c.row.settings.stream || "outbound",
        Headers: Object.entries(m.headers ?? {}).map(([Name, Value]) => ({ Name, Value })),
        Attachments: m.attachments?.map((a) => ({ Name: a.filename, Content: b64(a.content), ContentType: a.contentType, ...(a.cid ? { ContentID: `cid:${a.cid}` } : {}) })),
      }),
    });
    return;
  }
  if (c.row.kind === "brevo") {
    await httpJson("https://api.brevo.com/v3/smtp/email", {
      method: "POST", headers: { "api-key": c.secrets.apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: from.name, email: from.address }, to: [{ email: m.to }], cc: m.cc?.map((email) => ({ email })), bcc: m.bcc?.map((email) => ({ email })),
        replyTo: m.replyTo ? { email: m.replyTo } : undefined, subject: m.subject, textContent: m.text, htmlContent: m.html, headers: m.headers,
        attachment: m.attachments?.map((a) => ({ name: a.filename, content: b64(a.content) })),
      }),
    });
    return;
  }
  throw new Error("Unknown connection type.");
}

/** A cheap check that the credentials work, with no message sent. Stores the answer. */
export async function checkConnection(id: string): Promise<{ ok: boolean; message: string }> {
  let result: { ok: boolean; message: string };
  try {
    const c = await load(id);
    if (!c) return { ok: false, message: "That connection is gone." };
    if (c.row.kind === "postmark") await httpJson("https://api.postmarkapp.com/server", { headers: { "X-Postmark-Server-Token": c.secrets.token, accept: "application/json" } }, 15_000);
    else if (c.row.kind === "brevo") await httpJson("https://api.brevo.com/v3/account", { headers: { "api-key": c.secrets.apiKey, accept: "application/json" } }, 15_000);
    else {
      const port = Number(c.row.settings.port || 465);
      const t = nodemailer.createTransport({ host: c.row.settings.host, port, secure: c.row.settings.secure ? c.row.settings.secure === "ssl" : port === 465, auth: { user: c.row.settings.user, pass: c.secrets.password }, connectionTimeout: 30_000, greetingTimeout: 30_000, socketTimeout: 30_000 });
      try { await t.verify(); } finally { t.close(); }
    }
    result = { ok: true, message: "Credentials accepted." };
  } catch (e) {
    result = { ok: false, message: (e instanceof Error ? e.message : "failed").slice(0, 200) };
  }
  await db.query(`UPDATE mail_connections SET health_status = $2, health_message = $3, health_at = now() WHERE id = $1`, [id, result.ok ? "ok" : "error", result.message]).catch(() => {});
  return result;
}
