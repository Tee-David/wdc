"use client";

import { useEffect } from "react";
import { Archive, ArchiveRestore, Pin, PinOff, Plus, Send } from "lucide-react";
import { markThreadRead, postTeamMessage, setThreadFlag, startTeamThread } from "@/lib/messages/actions";
import { DialogButton } from "./dialog";
import { Area, Field, Form, Hidden, Submit } from "./form";
import { RemoteChecks } from "./remote-pick";

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
  return (
    <Form action={postTeamMessage} resetOnDone>
      <Hidden name="threadId" value={threadId} />
      <Area name="body" label="Your message" required rows={3} placeholder="Write to the team." />
      <Submit tone="primary" icon={Send}>Send message</Submit>
    </Form>
  );
}
