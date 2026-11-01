"use client";

import { Send } from "lucide-react";
import { postClientProjectMessage } from "@/lib/messages/actions";
import { Area, Form, Hidden, Submit } from "@/components/admin/form";
import { ChatAttach, ThreadProvider, useSent, useUploading } from "@/components/admin/thread";

/** The client's message box in their project channel: attach (+), the message, send. The same composer the studio uses. */
export function ClientProjectReply({ projectId }: { projectId: string }) {
  return <ThreadProvider><Composer projectId={projectId} /></ThreadProvider>;
}

function Composer({ projectId }: { projectId: string }) {
  const sent = useSent(), uploading = useUploading();
  return (
    <Form className="adCmp" action={postClientProjectMessage} resetOnDone onDone={(st) => { if (st.ok) sent(); }}>
      <Hidden name="projectId" value={projectId} />
      <ChatAttach threadKey={`p-${projectId}`} />
      <Area name="body" label="Message your team" rows={1} placeholder="Message your team" />
      <Submit tone="primary" icon={Send} disabled={uploading}><span className="ad__btnTxt">Send message</span></Submit>
    </Form>
  );
}
