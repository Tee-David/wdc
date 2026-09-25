"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import { submitTicket } from "@/lib/portal/actions";
import { Area, Field, Form, Hidden, Submit } from "@/components/admin/form";

export function NewTicketForm({
  startOpen = false, subject, projectId, closeHref,
}: {
  startOpen?: boolean; subject?: string; projectId?: string;
  /** Where Cancel and a sent question go, when the form was opened by a link. */
  closeHref?: string;
}) {
  const [open, setOpen] = useState(startOpen);
  const router = useRouter();
  const close = () => { if (closeHref) router.push(closeHref, { scroll: false }); else setOpen(false); };

  if (!open) {
    return (
      <button type="button" className="ad__btn ad__btn--primary" onClick={() => setOpen(true)}>
        <Send aria-hidden="true" /> Ask a question
      </button>
    );
  }

  return (
    <section className="ad__panel" id="ask" style={{ padding: "1rem", marginBottom: ".9rem" }}>
      <Form action={submitTicket} resetOnDone onDone={() => { close(); router.refresh(); }}>
        {projectId ? <Hidden name="projectId" value={projectId} /> : null}
        <Field name="subject" label="Subject" required placeholder="What's this about?" defaultValue={subject} />
        <Area name="body" label="Message" required rows={4} placeholder="Tell us what you need -- the more specific, the faster we can help." />
        <div className="ad__row">
          <Submit tone="primary" icon={Send}>Send</Submit>
          <button type="button" className="ad__btn" onClick={close}>Cancel</button>
        </div>
      </Form>
    </section>
  );
}
