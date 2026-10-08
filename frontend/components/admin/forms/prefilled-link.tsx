"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { createPrefilledLinkAction } from "@/lib/forms/prefill-actions";
import { Actions, Field, Fields, Form, Hidden, Submit } from "@/components/admin/form";
import { Pick } from "@/components/admin/pick";

type KnownClient = { id: string; company: string; first: string; last: string; email: string; phone: string };

/**
 * "Send a pre-filled link": after a call, the studio types what it already
 * knows and gets a one time link to send. The client opens it with those
 * answers filled in, confirms and edits. No personal data is in the address.
 *
 * AN EXISTING CLIENT FIRST. Somebody who already works with us should not turn
 * into a second record. Choosing them (the list is searchable) fills their name,
 * email, phone and business in; leaving it empty is a new person.
 */
export function PrefilledLink({ formKey, service, clients = [] }: { formKey: string; service: string; clients?: KnownClient[] }) {
  const [clientId, setClientId] = useState("");
  const known = clients.find((c) => c.id === clientId);
  return (
    <section className="ad__panel adForms__card">
      <h2 className="adForms__h">A pre-filled link for one client</h2>
      <p className="ad__dim">
        The ordinary onboarding link stays blank, and the client picks the service. Use this after a call: type what you already know about the
        {" "}{service} job and send them the link yourself. It works for 14 days.
      </p>
      {clients.length ? (
        <div className="ad__f">
          <span className="ad__fl" id="prefill-client-l">Is this an existing client?</span>
          <Pick id="prefill-client" options={[{ value: "", label: "No, a new person" }, ...clients.map((c) => ({ value: c.id, label: c.company }))]}
            value={clientId} onChange={setClientId} search labelledBy="prefill-client-l" placeholder="Search your clients" />
          <small className="ad__dim">Existing clients keep one record and the same client portal.</small>
        </div>
      ) : null}
      <Form action={createPrefilledLinkAction} key={clientId}>
        <Hidden name="form" value={formKey} />
        <Fields>
          <Field name="first_name" label="First name" required half defaultValue={known?.first} />
          <Field name="last_name" label="Last name" half defaultValue={known?.last} />
          <Field name="email" label="Email" type="email" required half defaultValue={known?.email} hint="The saved form is tied to this address." />
          <Field name="phone" label="Phone or WhatsApp" half inputMode="tel" defaultValue={known?.phone} />
          <Field name="company" label="Business name" defaultValue={known?.company} />
          <Field name="about" label="A line about the job, from the call" hint="Shown to the client under Tell us about your company, and they can change it." />
        </Fields>
        <Actions><Submit icon={Link2}>Make the link</Submit></Actions>
      </Form>
    </section>
  );
}
