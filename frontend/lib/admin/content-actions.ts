"use server";

import { revalidatePath } from "next/cache";
import { parseFaqs } from "@/lib/faq-validate";
import { resetSiteFaqs, restoreSiteFaqs, saveSiteFaqs } from "@/lib/site-content";
import { audit } from "./store";
import { actorName, allow } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";

/* Every page that shows the FAQ, so a save is live on the next request. */
function refreshFaqPages() {
  revalidatePath("/");
  revalidatePath("/contact");
  revalidatePath("/services/[slug]", "page");
  revalidatePath("/admin/settings/faq");
}

export async function saveFaqs(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("content");
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
  const refused = await allow("content");
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

/** Put an earlier FAQ list back. The one it replaces is kept, so this can be undone the same way. */
export async function restoreFaqVersion(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("content");
  if (refused) return refused;
  const by = await actorName();
  let done: { count: number } | null;
  try { done = await restoreSiteFaqs(String(fd.get("version") ?? ""), by); } catch {
    return FAIL({}, "That version could not be restored just now. Nothing changed on the site.");
  }
  if (!done) return FAIL({}, "That version is no longer kept. Only the last ten are.");
  audit({ actor: by, kind: "content", subjectId: "faq", subject: "FAQ", action: "restored an earlier version", note: `${done.count} questions` });
  refreshFaqPages();
  return OK(`Restored. ${done.count} questions are live; the list it replaced is kept below.`);
}
