"use client";

import { Send } from "lucide-react";
import { postClientProjectMessage } from "@/lib/messages/actions";
import { Area, Form, Hidden, Submit } from "@/components/admin/form";

/** The client's message box in their project channel. */
export function ClientProjectReply({ projectId }: { projectId: string }) {
  return (
    <Form className="adCmp" action={postClientProjectMessage} resetOnDone>
      <Hidden name="projectId" value={projectId} />
      <Area name="body" label="Message your team" required rows={1} placeholder="Message your team" />
      <Submit tone="primary" icon={Send}><span className="ad__btnTxt">Send message</span></Submit>
    </Form>
  );
}
