"use client";

import { Send } from "lucide-react";
import { addWorkspaceTeamNote } from "@/lib/workspace/team-actions";
import { Area, Form, Hidden, Submit } from "./form";
import { ReplyingTo, useReply } from "./thread";

/**
 * A NOTE IN A PROJECT CHANNEL. Team only by default; the project lead can
 * choose Client sees it, which publishes it to the client's portal and email.
 * The server checks the same rule again (addWorkspaceTeamNote).
 */
export function ProjectReply({ projectId, canPublish }: { projectId: string; canPublish: boolean }) {
  const { reply, setReply } = useReply();
  /* A reply keeps the visibility of the note it answers; the server refuses anything else. */
  const fixed = reply?.visibility;
  return (
    <Form className="adCmp" action={addWorkspaceTeamNote} resetOnDone onDone={(st) => { if (st.ok) setReply(null); }}>
      <Hidden name="projectId" value={projectId} />
      <ReplyingTo />
      {fixed ? (
        <>
          <Hidden name="visibility" value={fixed} />
          <p className="adMx__hint">{fixed === "client" ? "The client sees this reply, like the note it answers." : "Stays with the team, like the note it answers."}</p>
        </>
      ) : canPublish ? (
        <fieldset className="adMx__seg">
          <legend>Who sees it</legend>
          <label><input type="radio" name="visibility" value="internal" defaultChecked /><span>Team only</span></label>
          <label><input type="radio" name="visibility" value="client" /><span>Client sees it</span></label>
        </fieldset>
      ) : (
        <>
          <Hidden name="visibility" value="internal" />
          <p className="adMx__hint">Stays with the team. Only the project lead can publish to the client.</p>
        </>
      )}
      <Area name="body" label="Your message" required rows={1} placeholder="Message the channel" />
      <Submit tone="primary" icon={Send}><span className="ad__btnTxt">Send message</span></Submit>
    </Form>
  );
}
