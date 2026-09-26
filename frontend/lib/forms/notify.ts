import "server-only";

import { sendLogged, type OutboxLog } from "@/lib/outbox";
import { queueLogged } from "@/lib/message-log";
import { SITE_URL } from "@/lib/site";
import type { FormDef } from "./registry";
import { fillTokens, NOTIFICATIONS, type FormSettings } from "./settings";
import { entryMailParts, withEntryParts } from "./entry-mail";

type Mail = Parameters<typeof sendLogged>[0];

/**
 * One of a form's emails, sent the way its settings say.
 *
 * THE EMAIL ITSELF IS STILL WRITTEN IN CODE. What the settings change is
 * whether it goes, where a studio notice goes, who is copied, where a reply
 * lands, and the subject. Switched off, it leaves a Skipped row in the message
 * log saying so, because "why did nobody hear about this" deserves an answer
 * better than silence.
 *
 * Throws when the send fails, like `sendLogged`, so every caller keeps its
 * existing try/catch.
 *
 * Given the entry's id, a notice to the studio carries the entry as a PDF and
 * the files the client sent (lib/forms/entry-mail.ts). If making those fails
 * the notice still goes, without them.
 */
export async function sendFormEmail(
  form: FormDef,
  settings: FormSettings,
  key: string,
  mail: Mail,
  log: OutboxLog,
  tokens: Record<string, string> = {},
  entryId?: string,
): Promise<"sent" | "duplicate" | "skipped"> {
  const def = NOTIFICATIONS[form.source].find((n) => n.key === key);
  const n = settings.notifications[key];
  if (!def || !n) return sendLogged(mail, log);

  const subject = n.subject ? fillTokens(n.subject, tokens) : mail.subject;
  const to = def.audience === "studio" && n.to.length ? n.to.join(", ") : mail.to;
  if (!n.enabled) {
    await queueLogged({
      channel: "Email", to, subject,
      summary: `Not sent: "${def.name}" is switched off in the ${form.title} form's settings.`,
      dedupeKey: log.dedupeKey, by: log.by ?? "Website", clientId: log.clientId, about: log.about, state: "Skipped",
    });
    return "skipped";
  }
  if (def.audience === "studio" && entryId) {
    try {
      const parts = await entryMailParts(form, entryId);
      if (parts) mail = withEntryParts(mail, parts);
    } catch (error) {
      console.error("Entry attachments failed", error instanceof Error ? error.message : "unknown error");
    }
  }
  return sendLogged({
    ...mail,
    to,
    subject,
    /* A studio notice replies to the person by default; "studio" drops that so
       a reply stays inside the studio's own thread. */
    replyTo: def.audience === "studio" && n.replyTo === "studio" ? undefined : mail.replyTo,
    ...(n.cc.length ? { cc: n.cc } : {}),
    ...(n.bcc.length ? { bcc: n.bcc } : {}),
  }, log);
}

/** The entry's page in the admin, for the studio's notice. */
export const entryAdminUrl = (form: FormDef, id: string) => new URL(`/admin/forms/${form.key}/entries/${id}`, SITE_URL).toString();

/** What the visitor is shown after sending, when the studio has changed it. */
export function confirmation(settings: FormSettings, tokens: Record<string, string>) {
  if (settings.after === "redirect" && settings.redirectTo) return { redirect: settings.redirectTo };
  if (settings.afterHeading || settings.afterMessage) {
    return { heading: fillTokens(settings.afterHeading, tokens), message: settings.afterMessage.replace(/\{([a-z_]+)\}/g, (all, k: string) => (k in tokens ? tokens[k] : all)) };
  }
  return undefined;
}
