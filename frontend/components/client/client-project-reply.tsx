"use client";

import { Send } from "lucide-react";
import { postClientProjectMessage } from "@/lib/messages/actions";
import { Area, Form, Hidden, Submit } from "@/components/admin/form";

/** The client's message box in their project channel. */
export function ClientProjectReply({ projectId }: { projectId: string }) {
  return (
    <Form action={postClientProjectMessage} resetOnDone>
      <Hidden name="projectId" value={projectId} />
      <Area name="body" label="Message your team" required rows={3} placeholder="Ask, answer or share what you need." />
      <Submit tone="primary" icon={Send}>Send message</Submit>
    </Form>
  );
}
