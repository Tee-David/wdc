"use client";

import { BellRing, Check, Link2, Mail, RotateCw } from "lucide-react";
import type { Invoice, ProviderEvent } from "@/lib/admin/types";
import { naira } from "@/lib/admin/types";
import {
  emailInvoice, emailReminder, matchEventToInvoice, resendMessage, resolveEvent,
} from "@/lib/admin/actions";
import { Actions, Area, Field, Form, Hidden, Select, Submit } from "./form";
import { DialogButton } from "./dialog";

/**
 * The two things a person can do about an event that did not land cleanly.
 *
 * BOTH ARE DELIBERATELY SEPARATE. "Bank this against that invoice" moves real
 * money onto a client's account; "write down what happened" does not. Putting
 * them behind one button with a dropdown would make the consequential one a
 * default somebody reaches by accident.
 */

export function ResolveEvent({ event }: { event: ProviderEvent }) {
  return (
    <DialogButton label="Write it off" title={`How was ${event.reference} dealt with?`} icon={Check} tone="plain">
      {(close) => (
        <Form action={resolveEvent} onDone={close}>
          <Hidden name="id" value={event.id} />
          <Area
            name="note" label="What was done"
            placeholder="Refunded through Paystack on 14 September; the client had paid the wrong invoice."
            hint="This cannot be edited afterwards. Write it for whoever reads it next year."
            required
          />
          <Field name="by" label="Who dealt with it" placeholder="Babatope" />
          <Actions><Submit>Write it down</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

export function MatchEvent({
  event, invoices,
}: {
  event: ProviderEvent;
  invoices: Pick<Invoice, "id" | "number">[];
}) {
  return (
    <DialogButton label="Match to an invoice" title={`Bank ${event.reference}`} icon={Link2} tone="primary">
      {(close) => (
        <Form action={matchEventToInvoice} onDone={close}>
          <Hidden name="id" value={event.id} />
          <p className="ad__dim" style={{ margin: "0 0 .8rem" }}>
            {event.amount === null
              ? "This event carries no amount, so there is nothing to bank."
              : `${naira(event.amount)} arrived and nothing in the books claimed it. Picking an invoice records it as a payment against that invoice, with a receipt, exactly as if it had matched on its own.`}
          </p>
          <Select
            name="invoiceId" label="Against which invoice" required
            options={invoices.map((i) => ({ value: i.id, label: i.number }))}
          />
          <Field name="by" label="Who decided" placeholder="Babatope" />
          <Actions><Submit>Bank it</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

/** One button, for a message the mail server refused. */
export function ResendMessage({ id }: { id: string }) {
  return (
    <Form action={resendMessage} className="ad__inline">
      <Hidden name="id" value={id} />
      <Submit tone="plain" icon={RotateCw}>Try again</Submit>
    </Form>
  );
}

/**
 * Emailing an invoice, and nudging about it.
 *
 * TWO BUTTONS, NOT ONE WITH A MODE. Sending the invoice and chasing it are
 * different acts with different tones, and the second one is the one a client
 * can switch off.
 *
 * NO CONFIRMATION DIALOG. Both are safe to press twice: the dedupe key on the
 * message row means the second press sends nothing and says so.
 */
export function EmailInvoice({ id }: { id: string }) {
  return (
    <Form action={emailInvoice} className="ad__inline">
      <Hidden name="id" value={id} />
      <Submit tone="plain" icon={Mail}>Email it with the pay link</Submit>
    </Form>
  );
}

export function EmailReminder({ id }: { id: string }) {
  return (
    <Form action={emailReminder} className="ad__inline">
      <Hidden name="id" value={id} />
      <Submit tone="plain" icon={BellRing}>Send a reminder</Submit>
    </Form>
  );
}
