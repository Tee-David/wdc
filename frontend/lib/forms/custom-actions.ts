"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { actorName, allow } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/store";
import { FAIL, OK, type ActionState } from "@/lib/admin/validate";
import { blankForm, cleanDef, slugify } from "./custom-def";
import { createCustomForm, getCustomForm, publishCustomForm, saveCustomDraft, setCustomStatus } from "./custom";
import { FORMS } from "./registry";

/**
 * The builder's saves. Building a public form is configuration, so it is the
 * owner's (the "settings" area); staff read and answer the entries as they do
 * for every form.
 */

const RESERVED = new Set(["new", "build", "admin", "api", ...FORMS.map((f) => f.key)]);

export async function createForm(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const title = String(fd.get("title") ?? "").trim().slice(0, 120);
  const slug = slugify(String(fd.get("slug") ?? "") || title);
  const errors: Record<string, string> = {};
  if (!title) errors.title = "Give the form a name.";
  if (!slug || slug.length < 2) errors.slug = "An address of at least two letters or numbers.";
  else if (RESERVED.has(slug)) errors.slug = "That address is taken. Try another.";
  if (Object.keys(errors).length) return FAIL(errors);
  const by = await actorName();
  let key = "";
  try {
    const made = await createCustomForm(slug, blankForm(title), by);
    if (made === "taken") return FAIL({ slug: "A form already uses that address. Try another." });
    key = made.key;
  } catch {
    return FAIL({}, "The form could not be made just now. Try again in a minute.");
  }
  audit({ actor: by, kind: "content", subjectId: key, subject: title, action: "created a form" });
  revalidatePath("/admin/forms");
  redirect(`/admin/forms/${key}/build`);
}

/** The builder's draft, cleaned on the way in. Problems come back as notes; a draft may be unfinished. */
export async function saveFormDraft(input: { key: string; def: unknown }): Promise<ActionState & { problems?: string[] }> {
  const refused = await allow("settings");
  if (refused) return refused;
  const form = await getCustomForm(String(input?.key ?? ""));
  if (!form) return FAIL({}, "That form is no longer there.");
  const { def, errors } = cleanDef(input.def);
  try { await saveCustomDraft(form.key, def); } catch { return FAIL({}, "The draft could not be saved just now."); }
  revalidatePath(`/admin/forms/${form.key}/build`);
  return { ok: true, message: "Draft saved.", problems: errors };
}

/** The draft becomes the next published version. Refused while it has problems. */
export async function publishForm(input: { key: string; def: unknown }): Promise<ActionState & { problems?: string[]; version?: number }> {
  const refused = await allow("settings");
  if (refused) return refused;
  const form = await getCustomForm(String(input?.key ?? ""));
  if (!form) return FAIL({}, "That form is no longer there.");
  const { def, errors } = cleanDef(input.def);
  if (errors.length) return { ok: false, message: "Fix these before publishing.", problems: errors };
  const by = await actorName();
  let version: number | null = null;
  try {
    await saveCustomDraft(form.key, def);
    version = await publishCustomForm(form.key, by);
  } catch {
    return FAIL({}, "The form could not be published just now.");
  }
  audit({ actor: by, kind: "content", subjectId: form.key, subject: def.title, action: `published version ${version} of the form` });
  revalidatePath(`/admin/forms/${form.key}/build`);
  revalidatePath("/admin/forms");
  revalidatePath(`/f/${form.slug}`);
  return { ok: true, message: `Published. Version ${version} is live at /f/${form.slug}.`, version: version ?? undefined };
}

export async function setFormOpen(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const form = await getCustomForm(String(fd.get("key") ?? ""));
  if (!form || !form.version) return FAIL({}, "Publish the form first.");
  const open = fd.get("open") === "1";
  await setCustomStatus(form.key, open ? "live" : "closed");
  audit({ actor: await actorName(), kind: "content", subjectId: form.key, subject: form.draft.title, action: open ? "opened the form" : "closed the form" });
  revalidatePath(`/admin/forms/${form.key}/build`);
  revalidatePath("/admin/forms");
  revalidatePath(`/f/${form.slug}`);
  return OK(open ? "The form is taking entries." : "The form is closed. Its address says so.");
}
