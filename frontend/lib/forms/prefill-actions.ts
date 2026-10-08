"use server";

import { actorName, allow } from "@/lib/admin/guard";
import { audit, getClient } from "@/lib/admin/store";
import { syncStore } from "@/lib/admin/persist";
import { FAIL, OK, type ActionState } from "@/lib/admin/validate";
import { findForm } from "@/lib/forms/find";
import { refusedEmail, REFUSED_EMAIL_MESSAGE } from "@/lib/email-domains";
import { normalizeEmail } from "@/lib/onboarding-server";
import { createPrefilledDraft, PREFILL_TTL_DAYS } from "./prefill";

/**
 * Make a pre-filled onboarding link for one client, from a form's Settings.
 * Staff may do this (it is day to day work after a sales call). Everything is
 * read as hostile input: the form must be an onboarding form, the email must be
 * a real one and not a disposable inbox, and nothing is stored beyond the few
 * answers typed here.
 */
const text = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").trim().slice(0, max);

export async function createPrefilledLinkAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("forms");
  if (refused) return refused;
  const form = await findForm(String(fd.get("form") ?? ""));
  if (!form || form.source !== "onboarding" || !form.service) return FAIL({}, "That is not an onboarding form.");

  const first = text(fd, "first_name", 80);
  const email = normalizeEmail(text(fd, "email", 320));
  if (!first) return FAIL({ first_name: "Add the client's first name." }, "Some details need attention.");
  if (!email) return FAIL({ email: "Add a valid email address. The saved form is tied to it." }, "Some details need attention.");
  if (refusedEmail(email)) return FAIL({ email: REFUSED_EMAIL_MESSAGE }, "Some details need attention.");

  const answers: Record<string, string> = { first_name: first, email };
  for (const [key, max] of [["last_name", 80], ["phone", 40], ["company", 120], ["about", 600]] as const) {
    const v = text(fd, key, max);
    if (v) answers[key] = v;
  }

  try {
    const { url } = await createPrefilledDraft(form.service, answers, email);
    audit({ actor: await actorName(), kind: "content", subjectId: form.key, subject: form.title, action: "made a pre-filled onboarding link", note: `for ${email}` });
    return OK(`Link ready, good for ${PREFILL_TTL_DAYS} days. Copy it and send it yourself: ${url}`);
  } catch {
    return FAIL({}, "The link could not be made just now. Nothing was created; try again in a minute.");
  }
}

/**
 * One chosen client's details, for filling the pre-filled link's fields.
 *
 * ASKED FOR ONE AT A TIME, when the studio picks them. The page used to carry
 * every active client's name, email and phone in its own payload so the choice
 * could be filled in the browser: personal data for the whole client base on an
 * admin page, to fill in one person. Now nothing but the chosen person leaves.
 */
export async function clientForPrefill(id: string): Promise<{ first: string; last: string; email: string; phone: string; company: string } | null> {
  if (await allow("forms")) return null;
  await syncStore();
  const c = typeof id === "string" ? getClient(id.slice(0, 120)) : null;
  if (!c || c.archived || c.mergedInto) return null;
  const [first = "", ...rest] = c.name.split(" ");
  return { first, last: rest.join(" "), email: c.email, phone: c.phone, company: c.company };
}
