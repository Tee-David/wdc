"use server";

import { r2PublicBase } from "@/lib/r2";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteTrashedPost, movePostToDraft, postForAdmin, publishPostNow, restorePost, returnPost, savePost, trashDraftPost } from "@/lib/blog-db";
import { parsePost } from "@/lib/blog-validate";
import { audit } from "./store";
import { actorName, adminRole, owner, allow } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";

/**
 * The blog editor's one write.
 *
 * Checked first, parsed as hostile, written in one statement, audited, and
 * then the public pages that show it are revalidated so a published change is
 * live on the next request rather than at the next deploy.
 */
export async function saveBlogPost(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("content");
  if (refused) return refused;

  const raw: Record<string, unknown> = {};
  for (const key of ["slug", "title", "seoTitle", "description", "excerpt", "topic", "tags", "cover",
                     "canonical", "socialImage", "body", "status", "publishedAt", "revised"]) {
    const v = fd.get(key);
    if (typeof v === "string") raw[key] = v;
  }
  /* Images in a post come from this site or our own media bucket, nowhere else. */
  const bucket = r2PublicBase();
  const parsed = parsePost(raw, { imageHosts: bucket ? [bucket] : [] });
  if (!parsed.ok) return FAIL(parsed.errors, "Some fields need attention before this can be saved.");

  const id = String(fd.get("id") ?? "").trim() || null;
  /* STAFF WRITE, THE OWNER PUBLISHES. Staff can draft and submit for review;
     putting a post live, scheduling it, or changing one that already is,
     is the owner's. Checked here, not only by the options the editor shows. */
  if ((await adminRole()) !== "owner") {
    if (parsed.post.status === "published" || parsed.post.status === "scheduled") {
      return FAIL({ status: "Publishing is the owner's. Choose Submit for review and they will see it." });
    }
    if (id) {
      const current = await postForAdmin(id).catch(() => null);
      if (current?.status === "published") return FAIL({}, "This post is live or scheduled, so changes to it are the owner's.");
    }
  }
  /* The saved_at this editor opened, "" for a post never saved in the
     editor. Absent altogether means a caller that is not the editor. */
  const openedRaw = fd.get("opened");
  const opened = typeof openedRaw === "string" ? (openedRaw.trim() || null) : undefined;
  if (opened && Number.isNaN(Date.parse(opened))) return FAIL({}, "Reload the post, then save again.");
  const by = await actorName();
  let saved;
  try {
    saved = await savePost(id, parsed.post, by, opened);
  } catch (error) {
    console.error("Blog save failed", error instanceof Error ? error.message : "unknown error");
    return FAIL({}, "The post could not be saved just now. Nothing was changed; try again.");
  }
  if (!saved.ok && saved.reason === "stale") {
    const at = saved.savedAt
      ? new Date(saved.savedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })
      : "a moment ago";
    return FAIL({}, `${saved.savedBy ?? "Somebody"} saved this post at ${at}, after you opened it, so nothing was saved. Reload to see their version; yours is kept in this browser and offered back, so you can choose.`);
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
  const label = p.status === "draft" ? "saved as a draft" : p.status === "review" ? "submitted for review" : p.status === "scheduled" ? "scheduled" : "published";
  audit({ actor: by, kind: "content", subjectId: saved.id, subject: p.title, action: id ? `edited and ${label}` : label,
          note: `/blog/${p.slug}` });

  revalidatePath("/blog");
  revalidatePath(`/blog/${p.slug}`);
  if (saved.previousSlug) revalidatePath(`/blog/${saved.previousSlug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/blog/rss.xml");
  revalidatePath("/admin/blog");

  if (!id) redirect(`/admin/blog/${saved.id}?saved=1`);
  return {
    ...OK(p.status === "draft" ? "Saved. It is a draft, so nobody can see it yet."
      : p.status === "review" ? "Submitted for review. The owner sees it on the dashboard and on Blog."
      : p.status === "scheduled" ? "Saved. It goes live on its date without anybody pressing anything."
      : id ? "Updated. The live post shows your changes." : "Saved and live."),
    stamp: saved.savedAt,
  };
}

function refreshBlog(slug: string) {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/blog/rss.xml");
  revalidatePath("/admin/blog");
}

type Verb = "publish" | "draft" | "trash" | "restore" | "delete";

const DONE: Record<Verb, string> = {
  publish: "published", draft: "moved to draft", trash: "moved to the Trash", restore: "restored from the Trash", delete: "deleted for good from the Trash",
};

/** The list's quick actions: same checks, same audit, same refresh. */
async function quick(fd: FormData, verb: Verb): Promise<ActionState> {
  /* The Trash is content work, because it can be undone. Publishing and
     unpublishing are the owner's (staff submit for review), and so is
     deleting for good, which cannot be undone. */
  const refused = verb === "trash" || verb === "restore" ? await allow("content") : await owner();
  if (refused) return refused;
  const id = String(fd.get("id") ?? "").trim();
  const by = await actorName();
  let done;
  try {
    done = verb === "publish" ? await publishPostNow(id, by)
      : verb === "draft" ? await movePostToDraft(id, by)
      : verb === "trash" ? await trashDraftPost(id, by)
      : verb === "restore" ? await restorePost(id, by)
      : await deleteTrashedPost(id);
  } catch {
    return FAIL({}, "That could not be saved just now. Nothing changed; try again.");
  }
  if (!done) {
    return FAIL({}, verb === "trash" ? "Only a draft can go in the Trash. Move a live post to draft first."
      : verb === "delete" ? "Only a post in the Trash can be deleted for good."
      : "That post is no longer there.");
  }
  audit({ actor: by, kind: "content", subjectId: id, subject: done.title, action: DONE[verb], note: `/blog/${done.slug}` });
  refreshBlog(done.slug);
  return OK(verb === "publish" ? `${done.title} is live.`
    : verb === "draft" ? `${done.title} is a draft again; nobody can see it.`
    : verb === "trash" ? `${done.title} is in the Trash for 30 days.`
    : verb === "restore" ? `${done.title} is back, as a draft.`
    : `${done.title} was deleted for good.`);
}

export async function publishBlogPostNow(_prev: ActionState, fd: FormData) { return quick(fd, "publish"); }
export async function moveBlogPostToDraft(_prev: ActionState, fd: FormData) { return quick(fd, "draft"); }
export async function trashBlogDraft(_prev: ActionState, fd: FormData) { return quick(fd, "trash"); }
export async function restoreBlogPost(_prev: ActionState, fd: FormData) { return quick(fd, "restore"); }
export async function deleteBlogPostForever(_prev: ActionState, fd: FormData) { return quick(fd, "delete"); }

/** The owner sends a post in review back to its writer, with what to change. */
export async function returnBlogPost(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;
  const id = String(fd.get("id") ?? "").trim();
  const note = String(fd.get("note") ?? "").trim();
  if (note.length < 5) return FAIL({ note: "Say what to change, so the writer knows where to start." });
  const by = await actorName();
  let done;
  try { done = await returnPost(id, note, by); } catch { return FAIL({}, "That could not be saved just now. Nothing changed; try again."); }
  if (!done) return FAIL({}, "That post is not waiting for review any more.");
  audit({ actor: by, kind: "content", subjectId: id, subject: done.title, action: "sent back to its writer", note: note.slice(0, 300) });
  refreshBlog(done.slug);
  revalidatePath(`/admin/blog/${id}`);
  return OK(`${done.title} is back with ${done.to ?? "its writer"} as a draft, with your note.`);
}

/**
 * Put an earlier version of a live post back: its words, not its address,
 * status or dates. The owner's, like every change to a live post. The version
 * it replaces is kept first, so a Restore can be undone with another.
 */
export async function restoreBlogRevision(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;
  const id = String(fd.get("id") ?? "");
  const revision = String(fd.get("revision") ?? "");
  const by = await actorName();
  let done: { slug: string; title: string } | null;
  try {
    const { transaction } = await import("@/lib/db/transaction");
    const { restorePostRevision } = await import("@/lib/revisions");
    done = await transaction((c) => restorePostRevision(c, id, revision, by));
  } catch {
    return FAIL({}, "That version could not be restored just now. Nothing changed.");
  }
  if (!done) return FAIL({}, "That version is no longer kept. Only the last 25 are.");
  audit({ actor: by, kind: "content", subjectId: id, subject: done.title, action: "restored an earlier version" });
  refreshBlog(done.slug);
  revalidatePath(`/admin/blog/${id}`);
  return OK("Restored. The live post shows that version; the one it replaced is at the top of the list.");
}
