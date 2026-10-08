"use server";

import { composeEmailHtml, emailP } from "@/lib/email-templates";
import { revalidatePath } from "next/cache";
import { actorName, owner, ownerFresh } from "./guard";
import { getAdminRequest } from "./session";
import { FAIL, OK, type ActionState } from "./validate";
import { audit, getSetting } from "./store";
import { hydrateSettings, writeSetting } from "@/lib/settings/store";
import { KINDS, type Kind } from "@/lib/mail-kinds";
import { checkConnection, deleteConnection, saveConnection, sendThrough } from "@/lib/mail-connections";
import { sendMail } from "@/lib/email";
import { validWebhook, WEBHOOK_KEY } from "@/lib/mail-webhook-alert";
import { mailFrom, DEFAULT_MAIL_FROM_NAME } from "@/lib/mail-sender";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const done = () => revalidatePath("/admin/settings/email/connections");

/** Credentials are the most sensitive thing in the admin: saving needs the owner, signed in within 15 minutes. */
export async function saveConnectionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await ownerFresh(); if (refused) return refused;
  const kind = text(fd, "kind") as Kind;
  if (!KINDS[kind]) return FAIL({ kind: "Choose a service." });
  const settings: Record<string, string> = {}, secrets: Record<string, string> = {};
  for (const f of KINDS[kind].fields) settings[f.key] = text(fd, `f_${f.key}`);
  for (const s of KINDS[kind].secrets) secrets[s.key] = String(fd.get(`s_${s.key}`) ?? "");
  const r = await saveConnection({ id: text(fd, "id") || undefined, kind, name: text(fd, "name"), fromEmail: text(fd, "fromEmail"), settings, secrets }, await actorName());
  if (!r.ok) return FAIL({}, r.message);
  audit({ actor: await actorName(), kind: "setting", subjectId: r.id, subject: text(fd, "name"), action: "mail connection saved", note: KINDS[kind].label });
  done();
  return OK("Saved. Press Check to confirm the credentials work.");
}

export async function deleteConnectionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await ownerFresh(); if (refused) return refused;
  const id = text(fd, "id");
  await hydrateSettings();
  await deleteConnection(id);
  for (const key of ["mail.default", "mail.fallback"]) {
    if (getSetting(key) === id) await writeSetting(key, key === "mail.default" ? "env" : "", await actorName());
  }
  audit({ actor: await actorName(), kind: "setting", subjectId: id, subject: "Mail connection", action: "mail connection deleted" });
  done();
  return OK("Removed. If it was the default, the studio's own server is used again.");
}

export async function checkConnectionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const r = await checkConnection(text(fd, "id"));
  done();
  return r.ok ? OK(r.message) : FAIL({}, `The check failed: ${r.message}`);
}

/** Sends one test to the signed-in owner through a chosen connection and says how long it took, and what that means per hour. */
export async function testConnectionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const { session } = await getAdminRequest();
  const to = session?.user?.email;
  if (!to) return FAIL({}, "Your account has no email address.");
  const id = text(fd, "id") || "env";
  const started = Date.now();
  try {
    const body = { subject: "Test from the studio admin", text: "This is a test message sent from Settings › Email. If you can read it, the connection works.", html: composeEmailHtml({ title: "Connection test", preheader: "The connection works.", heading: "It works", blocks: [emailP("This is a test message sent from Settings › Email. If you can read it, the connection works.")] }) };
    if (id === "env") await sendMail({ to, ...body });
    else await sendThrough(id, { from: mailFrom(DEFAULT_MAIL_FROM_NAME, ""), to, ...body });
    const ms = Date.now() - started;
    const perHour = Math.max(1, Math.floor(3_600_000 / Math.max(ms, 1)));
    return OK(`Sent to ${to} in ${(ms / 1000).toFixed(1)} s. One message at a time, that is about ${perHour} an hour.`);
  } catch (e) {
    return FAIL({}, `It did not send: ${(e instanceof Error ? e.message : "error").slice(0, 160)}`);
  }
}

export async function saveRoutingAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  await hydrateSettings();
  const by = await actorName();
  const def = text(fd, "default") || "env";
  const fb = text(fd, "fallback");
  if (fb && fb === def) return FAIL({ fallback: "The fallback has to be a different connection from the default." });
  const hook = text(fd, "webhook");
  if (hook && !validWebhook(hook)) return FAIL({ webhook: "Use a Slack or Discord incoming webhook address (https://hooks.slack.com/services/... or https://discord.com/api/webhooks/...)." });
  await writeSetting("mail.default", def, by);
  await writeSetting("mail.fallback", fb, by);
  await writeSetting(WEBHOOK_KEY, hook, by);
  await writeSetting("mail.digest", text(fd, "digest") === "1" ? "yes" : "no", by);
  audit({ actor: by, kind: "setting", subjectId: "mail.routing", subject: "Mail routing", action: "default and fallback changed" });
  done();
  return OK("Updated.");
}

/** The address delivery events are sent to. Made once, random; making a new one stops the old. */
export async function newEventsKeyAction(): Promise<ActionState> {
  const refused = await ownerFresh(); if (refused) return refused;
  const { randomBytes } = await import("node:crypto");
  await writeSetting("mail.eventsKey", randomBytes(24).toString("base64url"), await actorName());
  done();
  return OK("A new address is ready. Paste it into the mail service's webhook settings.");
}

export async function setSimulateAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const on = text(fd, "on") === "1";
  await writeSetting("mail.simulate", on ? "yes" : "no", await actorName());
  done();
  return OK(on ? "Simulate mode is on: nothing is sent, messages are only logged." : "Simulate mode is off. Mail is sent again.");
}

/** SPF, DMARC and common DKIM names for a domain, looked up over DNS-over-HTTPS, with plain words about each. */
export async function checkDomainAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const domain = text(fd, "domain").toLowerCase();
  if (!/^(?=.{4,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,24}$/.test(domain)) return FAIL({ domain: "A domain like wedigcreativity.com." });
  const txt = async (name: string): Promise<string[]> => {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(6000) });
      const j = (await r.json()) as { Answer?: { data: string }[] };
      return (j.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, "").replace(/" "/g, ""));
    } catch { return []; }
  };
  const spf = (await txt(domain)).find((t) => t.startsWith("v=spf1"));
  const dmarc = (await txt(`_dmarc.${domain}`)).find((t) => t.startsWith("v=DMARC1"));
  const selectors = ["default", "selector1", "selector2", "google", "k1", "pm", "mail", "s1", "s2", "brevo1", "brevo2"];
  const dkim: string[] = [];
  for (const sel of selectors) if ((await txt(`${sel}._domainkey.${domain}`)).some((t) => /v=DKIM1|k=rsa|p=/.test(t))) dkim.push(sel);
  const parts = [
    spf ? "SPF found." : "SPF is missing: add a TXT record starting v=spf1 that names your mail service.",
    dkim.length ? `DKIM found (${dkim.join(", ")}).` : "No common DKIM name found. Your mail service shows the exact name to publish; this check only tries the usual ones.",
    dmarc ? `DMARC found (${(/p=([a-z]+)/i.exec(dmarc)?.[1] ?? "?")}).` : "DMARC is missing: add a TXT record at _dmarc with v=DMARC1; p=none to start.",
  ];
  const good = Boolean(spf && dmarc);
  return good ? OK(parts.join(" ")) : FAIL({}, parts.join(" "));
}
