"use client";

import { ArchiveRestore, ArrowRight, CornerUpLeft, ExternalLink, FilePen, Globe, Trash2, Undo2 } from "lucide-react";
import { deleteBlogPostForever, moveBlogPostToDraft, publishBlogPostNow, restoreBlogPost, returnBlogPost, trashBlogDraft } from "@/lib/admin/blog-actions";
import { Actions, Area, Fields, Form, Hidden, Submit } from "./form";
import { RowMenu, type RowMenuItem } from "./row-menu";

type Row = { id: string; title: string; slug: string; state: "draft" | "review" | "scheduled" | "published" };

/** One confirm step, the same shape every row dialog in the admin uses. */
function Confirm({ id, action, verb, tone, close, children }: {
  id: string; verb: string; tone?: "danger"; close: () => void; children: React.ReactNode;
  action: (prev: never, fd: FormData) => Promise<never>;
}) {
  return (
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- one shape for all three actions */
    <Form action={action as any} onDone={() => close()}>
      <Hidden name="id" value={id} />
      <div className="ad__sure"><p>{children}</p></div>
      <Actions>
        <button type="button" className="ad__btn" onClick={close}>Leave it</button>
        <Submit tone={tone === "danger" ? "danger" : "primary"}>{verb}</Submit>
      </Actions>
    </Form>
  );
}

/**
 * What a post's row can be asked to do. Only what is true for its state is
 * offered: a live post can be moved to draft but not deleted, because it is
 * already in search results and other people's links.
 */
/** The owner's "send it back": the post becomes a draft again, carrying the note. */
export function ReturnPostForm({ id, onDone }: { id: string; onDone?: () => void }) {
  return (
    <Form action={returnBlogPost} onDone={onDone ? () => onDone() : undefined}>
      <Hidden name="id" value={id} />
      <Fields><Area name="note" label="What to change" rows={3} required hint="The writer sees this at the top of the post." /></Fields>
      <Actions><Submit tone="plain" icon={CornerUpLeft}>Send it back</Submit></Actions>
    </Form>
  );
}

export function BlogPostMenu({ post, canPublish = true }: { post: Row; canPublish?: boolean }) {
  const items: RowMenuItem[] = [
    { kind: "link", label: "Edit", href: `/admin/blog/${post.id}`, icon: FilePen },
  ];
  if (post.state === "published") {
    items.push({ kind: "link", label: "View on the site", href: `/blog/${post.slug}`, icon: ExternalLink, external: true });
  } else {
    items.push({ kind: "link", label: "Preview", href: `/api/blog/preview?slug=${encodeURIComponent(post.slug)}`, icon: ArrowRight, external: true });
  }
  if (canPublish && post.state === "review") {
    items.push({
      kind: "dialog", label: "Send back with a note", icon: CornerUpLeft, title: `Send ${post.title} back`,
      render: (close) => <ReturnPostForm id={post.id} onDone={close} />,
    });
  }
  if (canPublish && post.state !== "published") {
    items.push({
      kind: "dialog", label: "Publish now", icon: Globe, title: `Publish ${post.title}`,
      render: (close) => (
        <Confirm id={post.id} action={publishBlogPostNow as never} verb="Publish it" close={close}>
          It goes live on /blog straight away, dated today unless it already carries an earlier date.
        </Confirm>
      ),
    });
  }
  if (canPublish && (post.state === "published" || post.state === "scheduled")) {
    items.push({
      kind: "dialog", label: "Move to draft", icon: Undo2, title: `Unpublish ${post.title}`,
      render: (close) => (
        <Confirm id={post.id} action={moveBlogPostToDraft as never} verb="Move to draft" close={close}>
          It leaves /blog, the sitemap and the feed. Its address stays reserved, so you can publish it again later.
        </Confirm>
      ),
    });
  }
  if (post.state === "draft" || post.state === "review") {
    items.push({
      kind: "dialog", label: "Move to the Trash", icon: Trash2, tone: "danger", title: `Move ${post.title} to the Trash`,
      render: (close) => (
        <Confirm id={post.id} action={trashBlogDraft as never} verb="Move to the Trash" tone="danger" close={close}>
          It can be restored from the Trash for 30 days, then it is removed for good. Its address stays reserved until then.
        </Confirm>
      ),
    });
  }
  return <RowMenu items={items} label={post.title} />;
}

/** A post in the Trash: back as a draft, or (the owner only) gone for good. */
export function TrashedPostMenu({ post, canDelete }: { post: { id: string; title: string }; canDelete: boolean }) {
  const items: RowMenuItem[] = [{
    kind: "dialog", label: "Restore", icon: ArchiveRestore, title: `Restore ${post.title}`,
    render: (close) => (
      <Confirm id={post.id} action={restoreBlogPost as never} verb="Restore it" close={close}>
        It comes back as a draft, exactly as it went in.
      </Confirm>
    ),
  }];
  if (canDelete) {
    items.push({
      kind: "dialog", label: "Delete for good", icon: Trash2, tone: "danger", title: `Delete ${post.title} for good`,
      render: (close) => (
        <Confirm id={post.id} action={deleteBlogPostForever as never} verb="Delete it for good" tone="danger" close={close}>
          This cannot be undone. It was never published, so nothing links to it.
        </Confirm>
      ),
    });
  }
  return <RowMenu items={items} label={post.title} />;
}
