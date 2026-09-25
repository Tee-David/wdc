"use server";

import { findForm } from "@/lib/forms/find";
import { revalidatePath } from "next/cache";
import { actorName, allow } from "@/lib/admin/guard";
import { getAdminRequest } from "@/lib/admin/session";
import { FAIL, OK, type ActionState } from "@/lib/admin/validate";
import { audit } from "@/lib/admin/store";
import { mailIsConfigured } from "@/lib/email";
import { sendLogged } from "@/lib/outbox";
import { composeEmailHtml, emailP, emailPanel } from "@/lib/email-templates";
import { fillTokens, NOTIFICATIONS, parseFormSettings } from "./settings";
import { getFormSettings, resetFormSettings, saveFormSettings } from "./settings-db";

/**
 * Saving a form's settings. The owner's: they decide whether a public form
 * takes entries and where its emails go, which is not day-to-day work.
 */

const PAGE = (key: string) => `/admin/forms/${key}`;

export async function saveFormSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const form = await findForm(String(fd.get("form") ?? ""));
  if (!form) return FAIL({}, "That form is not there.");
  const raw: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") raw[k] = v;
  const parsed = parseFormSettings(form, raw);
  if (!parsed.ok) return FAIL(parsed.errors, "Some settings need attention before they can be saved.");
  const by = await actorName();
  try { await saveFormSettings(form, parsed.settings, by); } catch {
    return FAIL({}, "The settings could not be saved just now. Nothing was changed; try again in a minute.");
  }
  audit({ actor: by, kind: "content", subjectId: form.key, subject: form.title, action: "changed the form's settings",
          note: parsed.settings.open ? undefined : "The form is closed to new entries." });
  revalidatePath(PAGE(form.key), "layout");
  revalidatePath("/admin/forms");
  revalidatePath(form.publicPath);
  return OK(parsed.settings.open ? "Saved. The form uses these settings from its next entry." : "Saved. The form is closed to new entries.");
}

export async function resetFormSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const form = await findForm(String(fd.get("form") ?? ""));
  if (!form) return FAIL({}, "That form is not there.");
  try { await resetFormSettings(form); } catch { return FAIL({}, "The settings could not be reset just now."); }
  audit({ actor: await actorName(), kind: "content", subjectId: form.key, subject: form.title, action: "reset the form's settings to the defaults" });
  revalidatePath(PAGE(form.key), "layout");
  revalidatePath("/admin/forms");
  return OK("Back to the defaults.");
}

/**
 * A test of one notification, to the person pressing the button.
 *
 * It uses the real send path and the saved settings (cc, bcc, subject), so it
 * proves the mail server and the addresses rather than a preview. It says how
 * long the mail server took, because this one takes about 23 seconds and
 * "slow" is not the same as "broken".
 */
export async function testFormEmailAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const form = await findForm(String(fd.get("form") ?? ""));
  const key = String(fd.get("notification") ?? "");
  const def = form && NOTIFICATIONS[form.source].find((n) => n.key === key);
  if (!form || !def) return FAIL({}, "That email is not there.");
  const { session } = await getAdminRequest().catch(() => ({ session: null }));
  const me = session?.user?.email?.trim();
  if (!me || !me.includes("@")) return FAIL({}, "Your account has no email address to send the test to.");
  if (!mailIsConfigured()) return FAIL({}, "SMTP is not configured on this deployment, so nothing can be sent. See Settings, Email.");

  const settings = await getFormSettings(form);
  const n = settings.notifications[key];
  const subject = `Test: ${fillTokens(n.subject || def.defaultSubject, { first_name: "Ada", topic: "Web Development", service: form.service ?? "", company: "Test Company", serial: "0", email: me })}`;
  const where: [string, string][] = [
    ["Would go to", def.audience === "studio" ? (n.to.join(", ") || "The studio inbox") : "The person who filled the form"],
    ...(n.cc.length ? [["Copied to", n.cc.join(", ")] as [string, string]] : []),
    ...(n.bcc.length ? [["Blind copy to", n.bcc.join(", ")] as [string, string]] : []),
    ["Switched", n.enabled ? "On" : "Off"],
  ];
  const started = Date.now();
  try {
    await sendLogged({
      to: me, subject,
      ...(n.cc.length ? { cc: n.cc } : {}), ...(n.bcc.length ? { bcc: n.bcc } : {}),
      text: `A test of "${def.name}" from the ${form.title} form.\n\n${where.map(([a, b]) => `${a}: ${b}`).join("\n")}`,
      html: composeEmailHtml({
        title: subject, preheader: `A test of "${def.name}".`, heading: def.name,
        blocks: [emailP(`A test from the ${form.title} form's settings. The real email is written in the site's code; this checks that it can be delivered, and where.`), emailPanel(where)],
      }),
    }, { summary: `A test of "${def.name}" for the ${form.title} form.`, dedupeKey: `form-test:${form.key}:${key}:${crypto.randomUUID()}`, by: await actorName() });
  } catch (error) {
    return FAIL({}, `The mail server refused it: ${error instanceof Error ? error.message : "no reason given"}`);
  }
  return OK(`Delivered to ${me} in ${((Date.now() - started) / 1000).toFixed(1)} s. Check the inbox, and the spam folder.`);
}
