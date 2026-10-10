"use client";
import {money} from "@/lib/money/currency";

import { useId } from "react";
import { BellRing, Check, Link2, Mail, Receipt, RotateCw, Wallet } from "lucide-react";
import type { ProviderEvent } from "@/lib/admin/types";
import { naira } from "@/lib/admin/types";
import {
  emailInvoice, emailReminder, matchEventToInvoice, overpaymentToCredit, resendMessage, resolveEvent, sendReceipt,
} from "@/lib/admin/actions";
import { Actions, Area, Field, Form, Hidden, Submit } from "./form";
import { RemoteSelect } from "./remote-pick";
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

export function MatchEvent({ event }: { event: ProviderEvent }) {
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
          <RemoteSelect name="invoiceId" label="Against which invoice" required kind="invoices" scope={{ invoices: "issued" }} />
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

/**
 * A settled invoice has nothing to ask for, so "Email invoice" is not offered;
 * what a paid client is owed is a receipt. Sends the latest payment's receipt
 * (or, from a payment's own menu, that payment's), at most once a day.
 */
export function SendReceipt({ invoiceId }: { invoiceId: string }) {
  return (
    <Form action={sendReceipt} className="ad__inline">
      <Hidden name="invoiceId" value={invoiceId} />
      <Submit tone="plain" icon={Receipt}>Send a receipt</Submit>
    </Form>
  );
}

/**
 * The overpayment callout's own control, on the invoice page where the
 * callout is. Moves the excess onto the client's balance, so the invoice lands
 * exactly on its total and the money comes off their next one. (Sending it
 * back instead is a refund on the payment, in its own menu.)
 */
export function CreditExcess({ invoiceId, over, reason,currency="NGN" }: { invoiceId: string; over: number; reason?: string;currency?:string }) {
  return (
    <Form
      action={overpaymentToCredit}
      confirm={`Put ${money(over,currency)} on their balance? It leaves this invoice and is held for the client against their next invoice. To send it back to their bank instead, refund the payment.`}
    >
      <Hidden name="id" value={invoiceId} />
      <NoticeTick name="tellClient" label="Tell the client by email" reason={reason} />
      <Submit tone="plain" icon={Wallet}>Credit the difference ({money(over,currency)})</Submit>
    </Form>
  );
}

/**
 * A tick that says whether an email goes with the action, and when it cannot,
 * why -- beside the tick, disabled and flat, rather than a box that quietly
 * does nothing. The server re-checks everything; this only tells the truth
 * about what will happen before the button is pressed.
 */
export function NoticeTick({ name, label, reason, off = false, hint }: {
  name: string; label: string;
  /** Why it cannot go. Present means disabled. */
  reason?: string;
  /** Start unticked (the person decides each time). */
  off?: boolean;
  hint?: string;
}) {
  /* A row menu mounts every row's dialog at once, so a fixed id would repeat
     down the table and every label would point at the first tick. */
  const id = useId();
  return (
    <div className="ad__f">
      <label className="ad__check ad__check--long" htmlFor={id}>
        <input id={id} type="checkbox" name={name} value="1" defaultChecked={!reason && !off} disabled={Boolean(reason)} aria-describedby={`${id}-note`} />
        <span>{label}</span>
      </label>
      <small className="ad__fh" id={`${id}-note`}>{reason ?? hint ?? "Sent behind the scenes. The log shows whether it arrived."}</small>
    </div>
  );
}

export const ReceiptTick = ({ reason }: { reason?: string }) => (
  <NoticeTick name="emailReceipt" label="Email the client a receipt" reason={reason} />
);
