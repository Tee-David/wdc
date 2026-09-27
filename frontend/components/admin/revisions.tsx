"use client";

import { History } from "lucide-react";
import { restoreBlogRevision } from "@/lib/admin/blog-actions";
import { restoreFaqVersion } from "@/lib/admin/content-actions";
import { Empty, Panel } from "@/components/admin/bits";
import { Form, Hidden, Submit } from "@/components/admin/form";

const stamp = (iso: string) => new Date(iso).toLocaleString("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos",
});

/**
 * Earlier versions, newest first, each with who wrote it and Restore. A
 * restore keeps the version it replaces, so it is undone the same way; the
 * confirmation says so rather than asking for "I understand".
 */
export function PostRevisions({ postId, items }: { postId: string; items: { id: string; by: string; at: string; title: string }[] }) {
  return (
    <Panel title="Earlier versions" dataTour="post-revisions" action={<span className="ad__dim adSet__aside">The last 25 are kept</span>}>
      {items.length ? (
        <ol className="adRevs">
          {items.map((r) => (
            <li key={r.id}>
              <span className="adRevs__who"><b>{r.title}</b><small className="ad__dim">{r.by} · {stamp(r.at)}</small></span>
              <Form action={restoreBlogRevision} className="adSys__check"
                confirm={`Put this version back on the live post? Its words replace what readers see now; the address and date stay. The version it replaces is kept here, so you can switch back.`}>
                <Hidden name="id" value={postId} />
                <Hidden name="revision" value={r.id} />
                <Submit tone="plain" icon={History}>Restore</Submit>
              </Form>
            </li>
          ))}
        </ol>
      ) : (
        <Empty title="No earlier versions yet">Each time this live post is updated, the version readers saw until then is kept here.</Empty>
      )}
    </Panel>
  );
}

export function FaqHistory({ items }: { items: { id: string; by: string; at: string; shipped: boolean; count: number }[] }) {
  return (
    <Panel title="Earlier versions" action={<span className="ad__dim adSet__aside">The last 10 are kept</span>}>
      {items.length ? (
        <ol className="adRevs">
          {items.map((r) => (
            <li key={r.id}>
              <span className="adRevs__who">
                <b>{r.shipped ? "The questions that shipped" : `${r.count} questions`}</b>
                <small className="ad__dim">{r.shipped ? "Before the first edit" : `${r.by} · ${stamp(r.at)}`}</small>
              </span>
              <Form action={restoreFaqVersion} className="adSys__check"
                confirm="Put this list back on the homepage, /contact and the service pages? The list it replaces is kept here, so you can switch back.">
                <Hidden name="version" value={r.id} />
                <Submit tone="plain" icon={History}>Restore</Submit>
              </Form>
            </li>
          ))}
        </ol>
      ) : (
        <Empty title="No earlier versions yet">Each save keeps the list it replaced here, so an edit can be undone.</Empty>
      )}
    </Panel>
  );
}
