"use server";

import { revalidatePath } from "next/cache";
import { parseFaqs } from "@/lib/faq-validate";
import { resetSiteFaqs, saveSiteFaqs } from "@/lib/site-content";
import { audit } from "./store";
import { actorName, owner } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";

/* Every page that shows the FAQ, so a save is live on the next request. */
function refreshFaqPages() {
  revalidatePath("/");
  revalidatePath("/contact");
  revalidatePath("/services/[slug]", "page");
  revalidatePath("/admin/settings/faq");
}

export async function saveFaqs(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;
  const parsed = parseFaqs(String(fd.get("faqs") ?? ""));
  if (!parsed.ok) return FAIL({}, parsed.error);
  const by = await actorName();
  try {
    await saveSiteFaqs(parsed.faqs, by);
  } catch {
    return FAIL({}, "The questions could not be saved just now. Nothing changed on the site; try again.");
  }
  audit({ actor: by, kind: "content", subjectId: "faq", subject: "FAQ", action: "edited", note: `${parsed.faqs.length} questions` });
  refreshFaqPages();
  return OK(`Saved. ${parsed.faqs.length} questions are live on the homepage, /contact and the service pages.`);
}

export async function resetFaqs(): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;
  const by = await actorName();
  try {
    await resetSiteFaqs();
  } catch {
    return FAIL({}, "The reset could not be saved just now. Try again.");
  }
  audit({ actor: by, kind: "content", subjectId: "faq", subject: "FAQ", action: "reset to what shipped" });
  refreshFaqPages();
  return OK("Back to the questions that shipped with the site.");
}
