"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteDraftPost, movePostToDraft, publishPostNow, savePost } from "@/lib/blog-db";
import { parsePost } from "@/lib/blog-validate";
import { audit } from "./store";
import { actorName, owner } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";

/**
 * The blog editor's one write.
 *
 * Checked first, parsed as hostile, written in one statement, audited, and
 * then the public pages that show it are revalidated so a published change is
 * live on the next request rather than at the next deploy.
 */
export async function saveBlogPost(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;

  const raw: Record<string, unknown> = {};
  for (const key of ["slug", "title", "seoTitle", "description", "excerpt", "topic", "tags", "cover",
                     "canonical", "socialImage", "body", "status", "publishedAt", "revised"]) {
    const v = fd.get(key);
    if (typeof v === "string") raw[key] = v;
  }
  const parsed = parsePost(raw);
  if (!parsed.ok) return FAIL(parsed.errors, "Some fields need attention before this can be saved.");

  const id = String(fd.get("id") ?? "").trim() || null;
  const by = await actorName();
  let saved;
  try {
    saved = await savePost(id, parsed.post, by);
  } catch (error) {
    console.error("Blog save failed", error instanceof Error ? error.message : "unknown error");
    return FAIL({}, "The post could not be saved just now. Nothing was changed; try again.");
  }
  if (!saved.ok) {
    return FAIL(
      saved.reason === "slug-taken" ? { slug: "Another post already uses this address." }
        : saved.reason === "slug-locked" ? { slug: "This post is live, so its address is fixed. Changing it would break every link to it." }
        : {},
      saved.reason === "missing" ? "That post is no longer there." : undefined,
    );
  }

  const p = parsed.post;
  const label = p.status === "draft" ? "saved as a draft" : p.status === "scheduled" ? "scheduled" : "published";
  audit({ actor: by, kind: "content", subjectId: saved.id, subject: p.title, action: id ? `edited and ${label}` : label,
          note: `/blog/${p.slug}` });

  revalidatePath("/blog");
  revalidatePath(`/blog/${p.slug}`);
  if (saved.previousSlug) revalidatePath(`/blog/${saved.previousSlug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/blog/rss.xml");
  revalidatePath("/admin/blog");

  if (!id) redirect(`/admin/blog/${saved.id}?saved=1`);
  return OK(p.status === "draft" ? "Saved. It is a draft, so nobody can see it yet."
    : p.status === "scheduled" ? "Saved. It goes live on its date without anybody pressing anything."
    : "Saved and live.");
}

function refreshBlog(slug: string) {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/blog/rss.xml");
  revalidatePath("/admin/blog");
}

/** The list's three quick actions: same checks, same audit, same refresh. */
async function quick(fd: FormData, verb: "publish" | "draft" | "delete"): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;
  const id = String(fd.get("id") ?? "").trim();
  const by = await actorName();
  let done;
  try {
    done = verb === "publish" ? await publishPostNow(id, by)
      : verb === "draft" ? await movePostToDraft(id, by)
      : await deleteDraftPost(id);
  } catch {
    return FAIL({}, "That could not be saved just now. Nothing changed; try again.");
  }
  if (!done) return FAIL({}, verb === "delete" ? "Only a draft can be deleted. Move a live post to draft instead." : "That post is no longer there.");
  audit({ actor: by, kind: "content", subjectId: id, subject: done.title,
          action: verb === "publish" ? "published" : verb === "draft" ? "moved to draft" : "deleted while still a draft", note: `/blog/${done.slug}` });
  refreshBlog(done.slug);
  return OK(verb === "publish" ? `${done.title} is live.` : verb === "draft" ? `${done.title} is a draft again; nobody can see it.` : `${done.title} was deleted.`);
}

export async function publishBlogPostNow(_prev: ActionState, fd: FormData) { return quick(fd, "publish"); }
export async function moveBlogPostToDraft(_prev: ActionState, fd: FormData) { return quick(fd, "draft"); }
export async function deleteBlogDraft(_prev: ActionState, fd: FormData) { return quick(fd, "delete"); }
