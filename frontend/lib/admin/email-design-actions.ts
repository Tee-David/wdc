"use server";

import { revalidatePath } from "next/cache";
import { actorName, owner } from "./guard";
import { getAdminRequest } from "./session";
import { COMPANY_NAME, CONTACT_EMAIL } from "@/lib/site";
import { renderDesign, validDesign, type Design } from "@/lib/email-design";
import { kindByKey, sampleVars } from "@/lib/email-registry";
import { getSaved, resetDesign, saveDesign, setEnabled, versionDesign } from "@/lib/email-design-store";
import { sendMail } from "@/lib/email";

/** Every action here is the owner's. The design arrives as JSON text and is validated before anything is rendered or saved. */
type Reply<T = object> = ({ ok: true } & T) | { ok: false; message: string };

function parse(json: string): Design | null {
  try { const d = JSON.parse(json.slice(0, 200_000)); return validDesign(d) ? d : null; } catch { return null; }
}

function render(kind: string, d: Design) {
  const k = kindByKey(kind)!;
  return renderDesign(d, { "studio.name": COMPANY_NAME, "studio.email": CONTACT_EMAIL, ...sampleVars(k) }, { unsubscribe: k.unsubscribe, why: k.why, manage: k.manage });
}

export async function previewDesign(kind: string, json: string): Promise<Reply<{ html: string; subject: string }>> {
  if (await owner()) return { ok: false, message: "Sign in again to continue." };
  if (!kindByKey(kind)) return { ok: false, message: "Unknown email." };
  const d = parse(json);
  if (!d) return { ok: false, message: "That design could not be read." };
  const mail = render(kind, d);
  return { ok: true, html: mail.html, subject: mail.subject };
}

export async function saveDesignAction(kind: string, json: string, enable: boolean | null): Promise<Reply> {
  const refused = await owner(); if (refused) return { ok: false, message: refused.message ?? "Sign in again to continue." };
  if (!kindByKey(kind)) return { ok: false, message: "Unknown email." };
  const d = parse(json);
  if (!d) return { ok: false, message: "That design could not be saved. Check it and try again." };
  if (!(await saveDesign(kind, d, await actorName(), enable ?? undefined))) return { ok: false, message: "It could not be saved just now. Is migration 0043 applied (Settings › System)?" };
  revalidatePath("/admin/email");
  return { ok: true };
}

export async function setDesignOn(kind: string, on: boolean): Promise<Reply> {
  const refused = await owner(); if (refused) return { ok: false, message: refused.message ?? "Sign in again to continue." };
  if (!kindByKey(kind)) return { ok: false, message: "Unknown email." };
  if (!(await setEnabled(kind, on))) return { ok: false, message: "Save the design first." };
  revalidatePath("/admin/email");
  return { ok: true };
}

export async function resetDesignAction(kind: string): Promise<Reply> {
  const refused = await owner(); if (refused) return { ok: false, message: refused.message ?? "Sign in again to continue." };
  if (!kindByKey(kind)) return { ok: false, message: "Unknown email." };
  await resetDesign(kind);
  revalidatePath("/admin/email");
  return { ok: true };
}

/** A test goes to the signed-in owner's own address only, marked as sample data. */
export async function sendTestAction(kind: string, json: string): Promise<Reply<{ to: string }>> {
  const refused = await owner(); if (refused) return { ok: false, message: refused.message ?? "Sign in again to continue." };
  if (!kindByKey(kind)) return { ok: false, message: "Unknown email." };
  const d = parse(json);
  if (!d) return { ok: false, message: "That design could not be read." };
  const { session } = await getAdminRequest();
  const to = session?.user?.email;
  if (!to) return { ok: false, message: "Your account has no email address." };
  const mail = render(kind, d);
  try {
    await sendMail({ to, ...mail, subject: `[Test, sample data] ${mail.subject}` });
    return { ok: true, to };
  } catch {
    return { ok: false, message: "The mail server did not take it. Try again in a minute." };
  }
}

export async function restoreVersionAction(kind: string, id: string): Promise<Reply<{ json: string }>> {
  const refused = await owner(); if (refused) return { ok: false, message: refused.message ?? "Sign in again to continue." };
  const d = await versionDesign(kind, id.slice(0, 80));
  return d ? { ok: true, json: JSON.stringify(d) } : { ok: false, message: "That version is gone." };
}

export async function savedState(kind: string) { return getSaved(kind); }
