"use client";

import { CheckCircle2, Send } from "lucide-react";
import { closeMyTicket, replyToTicket } from "@/lib/portal/actions";
import { Area, Form, Hidden, Submit } from "@/components/admin/form";

export function TicketReplyForm({ ticketId, closed }: { ticketId: string; closed?: boolean }) {
  return (
    <Form action={replyToTicket} resetOnDone>
      <Hidden name="ticketId" value={ticketId} />
      <Area name="body" label="Reply" required rows={3}
        placeholder={closed ? "Write here to reopen this conversation..." : "Type your reply..."} />
      <Submit tone="primary" icon={Send}>{closed ? "Reopen and send" : "Send reply"}</Submit>
    </Form>
  );
}

/** Settle the question from the client's side. Writing again reopens it. */
export function CloseTicketButton({ ticketId }: { ticketId: string }) {
  return (
    <Form action={closeMyTicket} className="pConv__close">
      <Hidden name="ticketId" value={ticketId} />
      <Submit tone="plain" icon={CheckCircle2}>Close conversation</Submit>
    </Form>
  );
}
