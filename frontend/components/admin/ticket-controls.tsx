"use client";

import { CheckCircle2, RotateCcw, Send, XCircle } from "lucide-react";
import { replyToTicketAsStudio, setTicketState } from "@/lib/admin/actions";
import { Area, Form, Hidden, Submit } from "./form";

/** The studio's reply, and the status moves beside it. */
export function StudioReply({ ticketId }: { ticketId: string }) {
  return (
    <Form action={replyToTicketAsStudio} resetOnDone>
      <Hidden name="id" value={ticketId} />
      <Area name="body" label="Your reply" required rows={4} placeholder="Answer the question. The client is emailed and sees it in their portal." />
      <Submit tone="primary" icon={Send}>Send reply</Submit>
    </Form>
  );
}

export function TicketStatusButtons({ ticketId, status }: { ticketId: string; status: "Open" | "Answered" | "Closed" }) {
  const move = (to: "Open" | "Answered" | "Closed", label: string, Icon: typeof Send) => (
    <Form action={setTicketState}>
      <Hidden name="id" value={ticketId} />
      <Hidden name="status" value={to} />
      <Submit tone="plain" icon={Icon}>{label}</Submit>
    </Form>
  );
  return (
    <>
      {status === "Open" ? move("Answered", "Mark answered", CheckCircle2) : null}
      {status !== "Closed" ? move("Closed", "Close", XCircle) : move("Open", "Reopen", RotateCcw)}
    </>
  );
}
