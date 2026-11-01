"use client";

import { CheckCircle2, Send } from "lucide-react";
import { closeMyTicket, replyToTicket } from "@/lib/portal/actions";
import { Area, Form, Hidden, Submit } from "@/components/admin/form";

export function TicketReplyForm({ ticketId, closed }: { ticketId: string; closed?: boolean }) {
  return (
    <Form className="adCmp" action={replyToTicket} resetOnDone>
      <Hidden name="ticketId" value={ticketId} />
      <Area name="body" label="Reply" required rows={1}
        placeholder={closed ? "Write to reopen this conversation" : "Type your reply"} />
      <Submit tone="primary" icon={Send}><span className="ad__btnTxt">{closed ? "Reopen and send" : "Send reply"}</span></Submit>
    </Form>
  );
}

/** Settle the question from the client's side. Writing again reopens it. */
export function CloseTicketButton({ ticketId }: { ticketId: string }) {
  return (
    <Form action={closeMyTicket} className="pConv__close" confirm="Close this conversation? We will take it that you have what you needed. Writing again opens it back up.">
      <Hidden name="ticketId" value={ticketId} />
      <Submit tone="plain" icon={CheckCircle2}>Close conversation</Submit>
    </Form>
  );
}
