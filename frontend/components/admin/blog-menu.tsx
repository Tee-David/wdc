"use client";

import { ArrowRight, ExternalLink, FilePen, Globe, Trash2, Undo2 } from "lucide-react";
import { deleteBlogDraft, moveBlogPostToDraft, publishBlogPostNow } from "@/lib/admin/blog-actions";
import { Actions, Form, Hidden, Submit } from "./form";
import { RowMenu, type RowMenuItem } from "./row-menu";

type Row = { id: string; title: string; slug: string; state: "draft" | "scheduled" | "published" };

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
export function BlogPostMenu({ post }: { post: Row }) {
  const items: RowMenuItem[] = [
    { kind: "link", label: "Edit", href: `/admin/blog/${post.id}`, icon: FilePen },
  ];
  if (post.state === "published") {
    items.push({ kind: "link", label: "View on the site", href: `/blog/${post.slug}`, icon: ExternalLink, external: true });
  } else {
    items.push({ kind: "link", label: "Preview", href: `/api/blog/preview?slug=${encodeURIComponent(post.slug)}`, icon: ArrowRight, external: true });
  }
  if (post.state !== "published") {
    items.push({
      kind: "dialog", label: "Publish now", icon: Globe, title: `Publish ${post.title}`,
      render: (close) => (
        <Confirm id={post.id} action={publishBlogPostNow as never} verb="Publish it" close={close}>
          It goes live on /blog straight away, dated today unless it already carries an earlier date.
        </Confirm>
      ),
    });
  }
  if (post.state !== "draft") {
    items.push({
      kind: "dialog", label: "Move to draft", icon: Undo2, title: `Unpublish ${post.title}`,
      render: (close) => (
        <Confirm id={post.id} action={moveBlogPostToDraft as never} verb="Move to draft" close={close}>
          It leaves /blog, the sitemap and the feed. Its address stays reserved, so you can publish it again later.
        </Confirm>
      ),
    });
  }
  if (post.state === "draft") {
    items.push({
      kind: "dialog", label: "Delete the draft", icon: Trash2, tone: "danger", title: `Delete ${post.title}`,
      render: (close) => (
        <Confirm id={post.id} action={deleteBlogDraft as never} verb="Delete it" tone="danger" close={close}>
          The draft is removed for good. Nobody has seen it, so nothing links to it.
        </Confirm>
      ),
    });
  }
  return <RowMenu items={items} label={post.title} />;
}
