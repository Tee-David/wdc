"use client";

import { Send } from "lucide-react";
import { addWorkspaceTeamNote } from "@/lib/workspace/team-actions";
import { Area, Form, Hidden, Submit } from "./form";

/**
 * A NOTE IN A PROJECT CHANNEL. Team only by default; the project lead can
 * choose Client sees it, which publishes it to the client's portal and email.
 * The server checks the same rule again (addWorkspaceTeamNote).
 */
export function ProjectReply({ projectId, canPublish }: { projectId: string; canPublish: boolean }) {
  return (
    <Form action={addWorkspaceTeamNote} resetOnDone>
      <Hidden name="projectId" value={projectId} />
      {canPublish ? (
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
      <Area name="body" label="Your message" required rows={3} placeholder="Write the decision, question or next step." />
      <Submit tone="primary" icon={Send}>Send message</Submit>
    </Form>
  );
}
