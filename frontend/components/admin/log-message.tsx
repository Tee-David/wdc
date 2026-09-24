"use client";

import { MessageCircle, NotebookPen } from "lucide-react";
import { logMessage } from "@/lib/admin/actions";
import { Actions, Area, Field, Fields, Form, Hidden, Radios, Select, Submit } from "./form";
import { DialogButton } from "./dialog";

/**
 * The two WhatsApp-shaped things the admin can honestly do.
 *
 * "Open WhatsApp" hands over to the app with the number and a draft filled in;
 * the person sends it themselves. "Log it" writes down that a message, a call
 * or a conversation happened, because the site cannot see any of them.
 */
export function MessageActions({ clientId, clientName, waHref }: {
  clientId: string; clientName: string; waHref: string | null;
}) {
  return (
    <div className="ad__row">
      {waHref ? (
        <a className="ad__btn" href={waHref} target="_blank" rel="noopener noreferrer">
          <MessageCircle aria-hidden="true" /> Open WhatsApp
        </a>
      ) : null}
      <DialogButton label="Log a call or message" title={`Write down a conversation with ${clientName}`} icon={NotebookPen}>
        {(close) => (
          <Form action={logMessage} onDone={() => close()} resetOnDone>
            <Hidden name="clientId" value={clientId} />
            <Fields>
              <Select name="channel" label="How" required half defaultValue="WhatsApp"
                      options={[{ value: "WhatsApp", label: "WhatsApp" }, { value: "Phone", label: "Phone call" }, { value: "In person", label: "In person" }]} />
              <Field name="to" label="With" half placeholder={clientName} hint="A person, or the project group." />
              <Radios name="direction" label="Who started it" defaultValue="Outbound" options={[
                { value: "Outbound", label: "We did" },
                { value: "Inbound", label: "They did" },
              ]} />
              <Field name="subject" label="About" required placeholder="Sent the three identity routes" />
              <Area name="summary" label="What was said" rows={3}
                    placeholder="Asked for a pick by Friday. Tobi prefers route two." />
            </Fields>
            <Actions>
              <Submit icon={NotebookPen}>Log it</Submit>
            </Actions>
          </Form>
        )}
      </DialogButton>
    </div>
  );
}
