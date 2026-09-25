"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Send, X } from "lucide-react";
import { submitTicket } from "@/lib/portal/actions";
import { Area, Field, Form, Hidden, Submit } from "@/components/admin/form";

/**
 * ASK A QUESTION (PNewTicket.dc.html): what it is about, a subject and the
 * message. "About" is the client's own projects plus "Something else", so a
 * question that is not about a project is never forced into one.
 */
export function NewTicketForm({
  startOpen = false, subject, projectId, closeHref, projects = [],
}: {
  startOpen?: boolean; subject?: string; projectId?: string;
  /** Where Cancel and a sent question go, when the form was opened by a link. */
  closeHref?: string;
  projects?: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState(startOpen);
  const [about, setAbout] = useState(projectId && projects.some((p) => p.id === projectId) ? projectId : "");
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
    <section className="ad__panel pAsk" id="ask" aria-labelledby="ask-title">
      <header className="pAsk__head">
        <div>
          <h2 id="ask-title">Ask a question</h2>
          <p>It goes to the team. You will see the reply here and by email.</p>
        </div>
        <button type="button" className="ad__topIcon" onClick={close} aria-label="Close"><X aria-hidden="true" /></button>
      </header>
      <Form action={submitTicket} resetOnDone onDone={() => { close(); router.refresh(); }}>
        {projects.length ? (
          <fieldset className="pAsk__about">
            <legend>About</legend>
            {[...projects, { id: "", title: "Something else" }].map((p) => (
              <label key={p.id || "other"} className={`pAsk__chip${about === p.id ? " is-on" : ""}`}>
                <input type="radio" name="about" value={p.id} checked={about === p.id} onChange={() => setAbout(p.id)} />
                {about === p.id ? <Check aria-hidden="true" /> : null}
                {p.title}
              </label>
            ))}
          </fieldset>
        ) : null}
        <Hidden name="projectId" value={about} />
        <Field name="subject" label="Subject" required placeholder="What's this about?" defaultValue={subject} />
        <Area name="body" label="Message" required rows={5} hint="Tell us what you need. The more specific, the faster we can help." />
        <div className="pAsk__foot">
          <button type="button" className="ad__btn" onClick={close}>Cancel</button>
          <Submit tone="primary" icon={Send}>Send</Submit>
        </div>
      </Form>
    </section>
  );
}
