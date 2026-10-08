"use server";

import { revalidatePath } from "next/cache";
import { LEGAL_DOCS } from "@/lib/legal";
import { parseLegalOverride } from "@/lib/legal-validate";
import { resetLegalDoc, restoreLegalDoc, saveLegalDoc } from "@/lib/legal-store";
import { audit } from "./store";
import { actorName, allow } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";

/* Every page that shows a policy, so a save is live on the next request. */
function refresh(slug: string) {
  revalidatePath("/legal");
  revalidatePath(`/legal/${slug}`);
  revalidatePath(`/legal/${slug}/pdf`);
  revalidatePath("/admin/settings/policies");
  revalidatePath(`/admin/settings/policies/${slug}`);
}
const known = (slug: string) => LEGAL_DOCS.find((d) => d.slug === slug);

export async function savePolicy(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("content");
  if (refused) return refused;
  const slug = String(fd.get("slug") ?? "");
  const doc = known(slug);
  if (!doc) return FAIL({}, "That policy does not exist.");
  const parsed = parseLegalOverride(String(fd.get("policy") ?? ""));
  if (!parsed.ok) return FAIL({}, parsed.error);
  const by = await actorName();
  try { await saveLegalDoc(slug, parsed.value, by); } catch {
    return FAIL({}, "The policy could not be saved just now. Nothing changed on the site; try again.");
  }
  audit({ actor: by, kind: "content", subjectId: slug, subject: doc.title, action: "edited", note: `${parsed.value.sections.length} sections` });
  refresh(slug);
  return OK(`Saved. The ${doc.title} is live, with today's date as its last-updated date.`);
}

export async function resetPolicy(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("content");
  if (refused) return refused;
  const slug = String(fd.get("slug") ?? "");
  const doc = known(slug);
  if (!doc) return FAIL({}, "That policy does not exist.");
  const by = await actorName();
  try { await resetLegalDoc(slug); } catch { return FAIL({}, "The reset could not be saved just now. Try again."); }
  audit({ actor: by, kind: "content", subjectId: slug, subject: doc.title, action: "reset to what shipped" });
  refresh(slug);
  return OK(`Back to the ${doc.title} that shipped with the site.`);
}

export async function restorePolicyVersion(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("content");
  if (refused) return refused;
  const slug = String(fd.get("slug") ?? "");
  const doc = known(slug);
  if (!doc) return FAIL({}, "That policy does not exist.");
  const by = await actorName();
  let done = false;
  try { done = await restoreLegalDoc(slug, String(fd.get("version") ?? ""), by); } catch {
    return FAIL({}, "That version could not be restored just now. Nothing changed on the site.");
  }
  if (!done) return FAIL({}, "That version is no longer kept. Only the last ten are.");
  audit({ actor: by, kind: "content", subjectId: slug, subject: doc.title, action: "restored an earlier version" });
  refresh(slug);
  return OK("Restored. The version it replaced is kept in the history.");
}
