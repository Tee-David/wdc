"use client";

import { Send } from "lucide-react";
import { addWorkspaceTeamNote } from "@/lib/workspace/team-actions";
import { Area, Form, Hidden, Submit } from "./form";
import { ChatAttach, ReplyingTo, useReply, useSent, useUploading } from "./thread";

/**
 * A NOTE IN A PROJECT CHANNEL. To the client by default (owner, 2026-11-01:
 * a message typed here and sent was landing as Team only, so the client never
 * saw it); Team only is one tap away. The server checks the same rule again
 * (addWorkspaceTeamNote).
 * The server checks the same rule again (addWorkspaceTeamNote).
 */
export function ProjectReply({ projectId, canPublish }: { projectId: string; canPublish: boolean }) {
  const { reply } = useReply();
  const sent = useSent(), uploading = useUploading();
  /* A reply keeps the visibility of the note it answers; the server refuses anything else. */
  const fixed = reply?.visibility;
  return (
    <Form className="adCmp" action={addWorkspaceTeamNote} resetOnDone onDone={(st) => { if (st.ok) sent(); }}>
      <Hidden name="projectId" value={projectId} />
      <ReplyingTo />
      <ChatAttach threadKey={`p-${projectId}`} />
      {fixed ? (
        <>
          <Hidden name="visibility" value={fixed} />
          <p className="adMx__hint">{fixed === "client" ? "The client sees this reply, like the note it answers." : "Stays with the team, like the note it answers."}</p>
        </>
      ) : canPublish ? (
        <fieldset className="adMx__seg">
          <legend>Who sees it</legend>
          <label><input type="radio" name="visibility" value="client" defaultChecked /><span>To the client</span></label>
          <label><input type="radio" name="visibility" value="internal" /><span>Team only</span></label>
        </fieldset>
      ) : (
        <>
          <Hidden name="visibility" value="internal" />
          <p className="adMx__hint">Stays with the team. Only the project lead can publish to the client.</p>
        </>
      )}
      <Area name="body" label="Your message" rows={1} placeholder={canPublish && !fixed ? "Write to the client" : "Message the team"} />
      <Submit tone="primary" icon={Send} disabled={uploading}><span className="ad__btnTxt">Send message</span></Submit>
    </Form>
  );
}
