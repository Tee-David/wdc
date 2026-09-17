"use client";

import { Send } from "lucide-react";
import { replyToTicket } from "@/lib/portal/actions";
import { Area, Form, Hidden, Submit } from "@/components/admin/form";

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  return (
    <Form action={replyToTicket} resetOnDone>
      <Hidden name="ticketId" value={ticketId} />
      <Area name="body" label="Reply" required rows={3} placeholder="Type your reply..." />
      <Submit tone="primary" icon={Send}>Send reply</Submit>
    </Form>
  );
}
