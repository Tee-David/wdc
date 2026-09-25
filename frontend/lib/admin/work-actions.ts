"use server";

import { revalidatePath } from "next/cache";
import { actorName, allow, owner } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";
import { audit } from "./store";
import { r2PublicBase } from "@/lib/r2";
import { cleanCase, slugifyCase, type CaseInput } from "@/lib/work-def";
import { caseForEditor, publishCase, saveCaseDraft, setCaseHidden, slugTaken } from "@/lib/work-db";
import { WORK_CATEGORIES } from "@/lib/work";

/**
 * SAVING AND PUBLISHING A CASE STUDY (Blog, Case studies). Saving a draft is
 * content work, like a blog draft; putting it live or taking it off the site
 * is the owner's, like publishing a post. Every write is audited, and every
 * publish refreshes the pages that show work.
 */

function refreshWork(slug: string, category: string) {
  revalidatePath("/work");
  for (const c of WORK_CATEGORIES) revalidatePath(`/work/${c.slug}`);
  revalidatePath(`/work/${category}/${slug}`);
  revalidatePath("/services", "layout");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/blog/work");
}

export async function saveCaseStudy(input: { originalSlug?: string; data: CaseInput; publish?: boolean }): Promise<ActionState & { slug?: string; problems?: string[] }> {
  const refused = input?.publish ? await owner() : await allow("content");
  if (refused) return refused;
  const { data, problems } = cleanCase(input?.data ?? {}, { bucket: r2PublicBase() });
  const original = typeof input?.originalSlug === "string" ? slugifyCase(input.originalSlug) : "";
  /* THE ADDRESS IS FIXED ONCE IT EXISTS: an existing case study keeps its
     slug whatever the form says, so a link out there never breaks. */
  const slug = original || data.slug;
  if (!slug) return { ok: false, message: "Give it an address first.", problems };
  if (!original && await slugTaken(slug)) {
    return { ok: false, message: `/work/…/${slug} is already a case study. Change the address.`, problems: [`The address ${slug} is taken.`] };
  }
  if (original && !(await caseForEditor(original))) return FAIL({}, "That case study is no longer there.");
  if (input.publish && problems.length) return { ok: false, message: "Fix these before publishing.", problems };
  const by = await actorName();
  try {
    await saveCaseDraft(slug, { ...data, slug }, by);
    if (input.publish) await publishCase(slug, by);
  } catch {
    return FAIL({}, "That could not be saved just now. Nothing changed; try again.");
  }
  audit({ actor: by, kind: "content", subjectId: slug, subject: data.client || slug, action: input.publish ? "published the case study" : "saved a draft of the case study", note: `/work/${data.category}/${slug}` });
  if (input.publish) refreshWork(slug, data.category);
  else revalidatePath("/admin/blog/work");
  return { ok: true, slug, problems, message: input.publish ? `Published. It is live at /work/${data.category}/${slug}.` : problems.length ? `Draft saved. ${problems.length} thing${problems.length === 1 ? "" : "s"} to finish before it can go live.` : "Draft saved. Ready to publish." };
}

export async function setCaseStudyHidden(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;
  const slug = slugifyCase(String(fd.get("slug") ?? ""));
  const hide = String(fd.get("hidden") ?? "") === "1";
  const found = slug ? await caseForEditor(slug) : null;
  if (!found) return FAIL({}, "That case study is no longer there.");
  if (!found.fromCode && !found.row?.live && !hide) return FAIL({}, "Publish it first; a draft has nothing to show.");
  const by = await actorName();
  try { await setCaseHidden(slug, hide, by); } catch { return FAIL({}, "That could not be saved just now."); }
  audit({ actor: by, kind: "content", subjectId: slug, subject: found.data.client, action: hide ? "took the case study off the site" : "put the case study back on the site" });
  refreshWork(slug, found.data.category);
  return OK(hide ? `${found.data.client} is off the site. Nothing was deleted.` : `${found.data.client} is back on the site.`);
}
