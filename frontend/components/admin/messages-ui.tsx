"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "./toast";
import { Archive, ArchiveRestore, CheckCheck, Download, FileText, Info, Link2, Pencil, Pin, PinOff, Plus, Send, Video, Zap } from "lucide-react";
import { markAllRead, markThreadRead, postTeamMessage, saveSavedReplies, setThreadFlag, startTeamThread } from "@/lib/messages/actions";
import { DialogButton } from "./dialog";
import { Area, Field, Form, Hidden, Submit } from "./form";
import { RemoteChecks } from "./remote-pick";
import { ChatAttach, ReplyingTo, useSent, useUploading } from "./thread";

/** Remembers that this person has read the open conversation. Renders nothing. */
export function MarkRead({ threadKey }: { threadKey: string }) {
  useEffect(() => { void markThreadRead(threadKey); }, [threadKey]);
  return null;
}

/** Pin and archive, for the signed-in person only. */
export function ThreadFlags({ threadKey, pinned, archived }: { threadKey: string; pinned: boolean; archived: boolean }) {
  const flag = (name: "pinned" | "archived", on: boolean, label: string, Icon: typeof Pin) => (
    <Form action={setThreadFlag}>
      <Hidden name="key" value={threadKey} />
      <Hidden name="flag" value={name} />
      <Hidden name="on" value={on ? "1" : "0"} />
      <Submit tone="plain" icon={Icon}>{label}</Submit>
    </Form>
  );
  return (
    <>
      {pinned ? flag("pinned", false, "Unpin", PinOff) : flag("pinned", true, "Pin", Pin)}
      {archived ? flag("archived", false, "Move to inbox", ArchiveRestore) : flag("archived", true, "Archive", Archive)}
    </>
  );
}

/** Start a team chat: one person makes a direct chat, more make a named group. */
export function NewTeamThread() {
  return (
    <DialogButton label="New message" title="Message the team" icon={Plus} dataTour="messages-new">
      {() => (
        <Form action={startTeamThread}>
          <RemoteChecks name="people" label="Who is it for" kind="staff" placeholder="Search the team" hint="One person starts a direct chat. More than one starts a group." />
          <Field name="title" label="Group name" placeholder="Social team" hint="Only needed for a group." />
          <Area name="body" label="Message" required rows={4} placeholder="Write the question, the decision or the next step." />
          <Submit tone="primary" icon={Send}>Send message</Submit>
        </Form>
      )}
    </DialogButton>
  );
}

/** The reply box in a team chat. */
export function TeamReply({ threadId }: { threadId: string }) {
  const sent = useSent(), uploading = useUploading();
  return (
    <Form className="adCmp" action={postTeamMessage} resetOnDone onDone={(st) => { if (st.ok) sent(); }}>
      <Hidden name="threadId" value={threadId} />
      <ReplyingTo />
      <ChatAttach threadKey={`d-${threadId}`} />
      <Area name="body" label="Your message" rows={1} placeholder="Message" />
      <Submit tone="primary" icon={Send} disabled={uploading}><span className="ad__btnTxt">Send message</span></Submit>
    </Form>
  );
}

/** "Mark all read" above the list: every conversation shown, read up to now (this person only). */
export function MarkAllRead({ keys }: { keys: string[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" className="ad__btn" disabled={pending}
      onClick={() => start(async () => { const r = await markAllRead(keys); toast(r.message, r.ok ? "good" : "bad"); router.refresh(); })}>
      <CheckCheck aria-hidden="true" />Mark all read
    </button>
  );
}

type DetailFile = { key: string; name: string; kind: string; open: string; download: string; at: string };

/**
 * THE CONVERSATION'S DETAILS: who is in it, every picture and file sent in it and every link written in it, newest
 * first, plus a Google Meet started from here (Meet opens in its own tab; paste the link into the reply).
 */
export function ConvDetails({ name, people, files, links }: { name: string; people: string[]; files: DetailFile[]; links: { url: string; at: string }[] }) {
  return (
    <DialogButton label="Details" title={`About this conversation`} icon={Info} tone="plain" iconOnly>
      {() => (
        <div className="adMxD">
          <section><h3>{name}</h3><p className="ad__dim">{people.join(", ") || "Just you"}</p>
            <a className="ad__btn" href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer"><Video aria-hidden="true" />Start a Google Meet</a>
            <p className="ad__dim adMxD__hint">Meet opens in a new tab. Copy its link into your reply so everyone here can join.</p>
          </section>
          <section><h3>Media and files <span className="ad__dim">{files.length}</span></h3>
            {files.length ? <ul className="adMxD__list">{files.map((f) => (
              <li key={f.key}>{/* eslint-disable-next-line @next/next/no-img-element -- a signed, private link that next/image cannot optimise */}
                {f.kind === "image" ? <img src={f.open} alt="" width={44} height={44} loading="lazy" /> : <span className="adMxD__ic"><FileText aria-hidden="true" /></span>}
                <a href={f.open} target="_blank" rel="noopener noreferrer">{f.name}</a>
                <a className="ad__btn ad__btn--icon" href={f.download} aria-label={`Download ${f.name}`}><Download aria-hidden="true" /></a></li>
            ))}</ul> : <p className="ad__dim">Nothing has been sent here yet.</p>}
          </section>
          <section><h3>Links <span className="ad__dim">{links.length}</span></h3>
            {links.length ? <ul className="adMxD__list">{links.map((l, i) => (
              <li key={`${l.url}-${i}`}><span className="adMxD__ic"><Link2 aria-hidden="true" /></span><a href={l.url} target="_blank" rel="noopener noreferrer">{l.url.replace(/^https?:\/\//, "")}</a></li>
            ))}</ul> : <p className="ad__dim">No links in this conversation.</p>}
          </section>
        </div>
      )}
    </DialogButton>
  );
}

type Saved = { t: string; s: string };

/** Put text into the open conversation's reply box, the way typing would (React sees the change). */
function fillReply(text: string) {
  const box = document.querySelector<HTMLTextAreaElement>(".adMx__reply textarea[name=\"body\"]");
  if (!box) return;
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  set?.call(box, box.value ? `${box.value.replace(/\s+$/, "")}\n${text}` : text);
  box.dispatchEvent(new Event("input", { bubbles: true }));
  box.focus();
}

/** "Saved replies" beside the reply box: pick one and it is written in, {name} as their first name. Nothing is sent. */
export function SavedReplies({ replies, firstName, canEdit }: { replies: Saved[]; firstName: string; canEdit: boolean }) {
  if (!replies.length && !canEdit) return null;
  return (
    <DialogButton label="Saved replies" title="Saved replies" icon={Zap} tone="plain" iconOnly>
      {(close) => (
        <div className="adMxD">
          {replies.length ? <ul className="adMxD__list adMxS">{replies.map((r) => (
            <li key={r.t}><button type="button" className="adMxS__pick" onClick={() => { fillReply(r.s.replaceAll("{name}", firstName || "there")); close(); }}>
              <b>{r.t}</b><span>{r.s.replaceAll("{name}", firstName || "there")}</span></button></li>
          ))}</ul> : <p className="ad__dim">No saved replies yet. Add the answers you write most often.</p>}
          {canEdit ? <SavedRepliesEditor replies={replies} /> : null}
        </div>
      )}
    </DialogButton>
  );
}

function SavedRepliesEditor({ replies }: { replies: Saved[] }) {
  const rows = [...replies, { t: "", s: "" }, { t: "", s: "" }];
  return (
    <details className="adMxS__edit">
      <summary className="ad__btn"><Pencil aria-hidden="true" />Edit the list</summary>
      <Form action={saveSavedReplies}>
        {rows.map((r, i) => (
          <div key={i} className="adMxS__row">
            <Field name="t" label={`Name ${i + 1}`} defaultValue={r.t} placeholder="Payment reminder" />
            <Area name="s" label="The words" rows={3} defaultValue={r.s} placeholder="Hello {name}, ..." />
          </div>
        ))}
        <p className="ad__dim" style={{ margin: 0, fontSize: ".85rem" }}>{"{name}"} becomes the person&apos;s first name. Empty both fields to remove one.</p>
        <Submit>Save the replies</Submit>
      </Form>
    </details>
  );
}
