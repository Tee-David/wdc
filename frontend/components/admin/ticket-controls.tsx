"use client";

import { CheckCircle2, RotateCcw, Send, XCircle } from "lucide-react";
import { replyToTicketAsStudio, setTicketState } from "@/lib/admin/actions";
import { Area, Form, Hidden, Submit } from "./form";
import { ReplyingTo, useReply } from "./thread";

/** The studio's reply, and the status moves beside it. */
export function StudioReply({ ticketId }: { ticketId: string }) {
  const { setReply } = useReply();
  return (
    <Form className="adCmp" action={replyToTicketAsStudio} resetOnDone onDone={(st) => { if (st.ok) setReply(null); }}>
      <Hidden name="id" value={ticketId} />
      <ReplyingTo />
      <Area name="body" label="Your reply" required rows={1} placeholder="Reply to the client" hint="The client is emailed and sees it in their portal." />
      <Submit tone="primary" icon={Send}><span className="ad__btnTxt">Send reply</span></Submit>
    </Form>
  );
}

export function TicketStatusButtons({ ticketId, status }: { ticketId: string; status: "Open" | "Answered" | "Closed" }) {
  const move = (to: "Open" | "Answered" | "Closed", label: string, Icon: typeof Send) => (
    <Form action={setTicketState} confirm={to === "Closed" ? "Close this question? The client sees it as settled. It opens again if either of you writes." : undefined}>
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
