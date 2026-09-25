import "server-only";

import { hydrateSettings } from "@/lib/settings/store";
import { revalidatePath } from "next/cache";
import { getEntry } from "./entries";
import { addEvents } from "./events";
import { formByKey, onboardingFormFor, type FormDef } from "./registry";
import { NOTIFICATIONS } from "./settings";
import { getFormSettings } from "./settings-db";
import { sendFormEmail } from "./notify";
import { dataFromEntry, formEmail, originalKey, tokensFor } from "./emails";
import { onboardingServiceOf } from "./entries";
import { findLogged, recordResend } from "@/lib/message-log";

/**
 * Send one of a form's emails again, rebuilt from the entry.
 *
 * The one path for the Resend button on an entry and for Tools' "retry
 * failed form emails": the message is built by `formEmail` exactly as the
 * first was, a resend is asked for by a person so it goes even if the email
 * is switched off for new entries, and the attempt is written on the entry's
 * history and on the original message's trail either way.
 */

export type ResendOutcome =
  | { ok: true; recipient: string; ms: number; duplicate: boolean }
  | { ok: false; reason: "no-entry" | "no-email" | "no-address" }
  | { ok: false; reason: "refused"; recipient: string; error: string };

export async function resendFormEmail(form: FormDef, entryId: string, key: string, opts: {
  by: string;
  /** Another address instead of the original recipient; no copies then. */
  to?: string;
  /** Defaults to a fresh one; a retry passes a stable key so it runs once. */
  dedupeKey?: string;
  /** Also mark this failed row as sent on, so it stops counting as failed. */
  failedRowId?: string;
  summary?: string;
}): Promise<ResendOutcome> {
  const entry = await getEntry(form, entryId);
  if (!entry) return { ok: false, reason: "no-entry" };
  const def = NOTIFICATIONS[form.source].find((n) => n.key === key);
  if (!def) return { ok: false, reason: "no-email" };
  const data = dataFromEntry(form, entry);
  await hydrateSettings();
  const mail = formEmail(form, key, data);
  if (!mail) return { ok: false, reason: "no-address" };

  const settings = await getFormSettings(form);
  const n = settings.notifications[key];
  const other = Boolean(opts.to);
  const forced = { ...settings, notifications: { ...settings.notifications, [key]: { ...n, enabled: true, ...(other ? { to: [opts.to!], cc: [], bcc: [] } : {}) } } };
  const original = originalKey(form, key, data);
  const recipient = other ? opts.to! : (def.audience === "studio" && n.to.length ? n.to.join(", ") : mail.to);
  const started = Date.now();
  const trail = async (sent: boolean, error?: string) => {
    const ms = Date.now() - started;
    const first = await findLogged(original);
    const entryLine = { at: new Date().toISOString(), to: recipient, by: opts.by, sent, ms, ...(error ? { error: error.slice(0, 200) } : {}) };
    if (first) await recordResend(first.id, entryLine);
    if (opts.failedRowId && opts.failedRowId !== first?.id) await recordResend(opts.failedRowId, entryLine);
    await addEvents(form.key, [entry.id], "email", sent ? `Resent "${def.name}" to ${recipient}` : `Resending "${def.name}" to ${recipient} failed`, opts.by);
    revalidatePath(`/admin/forms/${form.key}/entries/${entry.id}`);
    return ms;
  };
  let result: "sent" | "duplicate" | "skipped";
  try {
    result = await sendFormEmail(form, forced, key, other ? { ...mail, to: opts.to! } : mail,
      { summary: opts.summary ?? `Resent "${def.name}" by hand.`, dedupeKey: opts.dedupeKey ?? `${original}:resend:${crypto.randomUUID()}`, by: opts.by },
      tokensFor(form, data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "no reason given";
    await trail(false, message);
    return { ok: false, reason: "refused", recipient, error: message };
  }
  /* A duplicate is a retry that already ran: nothing new was sent or written. */
  if (result === "duplicate") return { ok: true, recipient, ms: 0, duplicate: true };
  const ms = await trail(true);
  return { ok: true, recipient, ms, duplicate: false };
}

/** Which form email a logged message was, from its dedupe key, or null. */
export async function formEmailOf(dedupeKey: string): Promise<{ form: FormDef; entryId: string; key: string } | null> {
  const m = /^(enquiry-receipt|enquiry|onboarding-next-steps|onboarding-notice):([0-9a-f-]{36})(?::|$)/i.exec(dedupeKey);
  if (!m) return null;
  const [, kind, entryId] = m;
  if (kind === "enquiry-receipt" || kind === "enquiry") {
    const form = formByKey("contact");
    return form ? { form, entryId, key: kind === "enquiry" ? "studio-notice" : "receipt" } : null;
  }
  const service = await onboardingServiceOf(entryId).catch(() => null);
  const form = service ? onboardingFormFor(service) : undefined;
  return form ? { form, entryId, key: kind === "onboarding-notice" ? "studio-notice" : "next-steps" } : null;
}
