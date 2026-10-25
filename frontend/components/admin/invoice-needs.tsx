"use client";

import { AlarmClockOff, BellRing, CalendarCheck, Megaphone } from "lucide-react";
import { clearPromise, emailReminder, promisePayment, sendFinalNotice } from "@/lib/admin/actions";
import { Area, Field, Form, Hidden, Submit } from "./form";
import { DialogButton } from "./dialog";

/**
 * WHAT THIS INVOICE NEEDS, the deck idea on one document (the approved board).
 * The page decides the state from persisted truth; this draws the card and its
 * actions. Overdue: send the final notice or note the date they promised (which
 * pauses the automatic reminders). Promised: the date, and clear it. Final
 * notice sent: what is left. Due soon: a reminder. Anything calmer is one line.
 */
export type Need =
  | { kind: "late"; days: number; owed: string; finalAt?: string }
  | { kind: "promised"; until: string; note?: string; owed: string; late: boolean }
  | { kind: "soon"; days: number; owed: string }
  | { kind: "calm"; line: string };

export function InvoiceNeeds({ id, need, record }: { id: string; need: Need; record: React.ReactNode }) {
  if (need.kind === "calm") return <p className="adNeed adNeed--calm" role="status">{need.line}</p>;
  const promise = (
    <DialogButton label="Note a promised date" title="When did they promise to pay?" icon={CalendarCheck} tone="plain">
      {(close) => (
        <Form action={promisePayment} onDone={(s) => { if (s.ok) close(); }}>
          <Hidden name="id" value={id} />
          <Field name="until" label="Promised by" type="date" required hint="Automatic reminders wait until this date has passed." />
          <Area name="note" label="What was said" rows={2} placeholder="Called Adaeze. Paying after their board meets on Friday." />
          <Submit tone="primary" icon={CalendarCheck}>Save the promised date</Submit>
        </Form>
      )}
    </DialogButton>
  );
  const tone = need.kind === "late" ? "bad" : need.kind === "promised" ? (need.late ? "warn" : "brand") : "warn";
  return (
    <section className={`adNeed adNeed--${tone}`} aria-label="What this invoice needs">
      <div className="adNeed__tags">
        <span className={`ad__pill ad__pill--${tone === "brand" ? "flat" : tone}`}>
          {need.kind === "late" ? `${need.days} ${need.days === 1 ? "day" : "days"} late` : need.kind === "promised" ? "Promised" : `Due in ${need.days} ${need.days === 1 ? "day" : "days"}`}
        </span>
        {need.kind === "late" && need.finalAt ? <span className="ad__pill ad__pill--flat">Final notice sent {need.finalAt}</span> : null}
      </div>
      <h2 className="adNeed__t">
        {need.kind === "late" ? (need.finalAt ? `${need.owed} is still owed after the final notice` : `${need.owed} is late`)
          : need.kind === "promised" ? `They promised to pay ${need.owed} by ${need.until}`
          : `${need.owed} is due soon`}
      </h2>
      <p className="adNeed__b">
        {need.kind === "late" ? (need.finalAt ? "A call usually settles it now. Note the date they give you, or record the payment when it comes." : "Reminders have gone on their schedule. Send the final notice, or note the date they promise when you call.")
          : need.kind === "promised" ? (need.note ? `“${need.note}” ` : "") + (need.late ? "That date has passed. Call them, or clear the promise so reminders run again." : "Automatic reminders are paused until then.")
          : "A reminder now, with the pay link, saves a late payment later."}
      </p>
      <div className="adNeed__acts">
        {need.kind === "late" && !need.finalAt ? (
          <Form action={sendFinalNotice} className="ad__inline"><Hidden name="id" value={id} /><Submit tone="primary" icon={Megaphone}>Send the final notice</Submit></Form>
        ) : null}
        {need.kind === "soon" ? (
          <Form action={emailReminder} className="ad__inline"><Hidden name="id" value={id} /><Submit tone="primary" icon={BellRing}>Send a reminder</Submit></Form>
        ) : null}
        {record}
        {need.kind === "promised" ? (
          <Form action={clearPromise} className="ad__inline"><Hidden name="id" value={id} /><Submit tone="plain" icon={AlarmClockOff}>Clear the promise</Submit></Form>
        ) : need.kind === "late" ? promise : null}
      </div>
    </section>
  );
}
