"use client";

import { useRef, useState } from "react";
import { Link2 } from "lucide-react";
import { clientForPrefill, createPrefilledLinkAction } from "@/lib/forms/prefill-actions";
import { Actions, Field, Fields, Form, Hidden, Submit } from "@/components/admin/form";
import { RemotePick } from "@/components/admin/remote-pick";

type Known = { first: string; last: string; email: string; phone: string; company: string };

/**
 * "Send a pre-filled link": after a call, the studio types what it already
 * knows and gets a one time link to send. The client opens it with those
 * answers filled in, confirms and edits. No personal data is in the address.
 *
 * AN EXISTING CLIENT FIRST. Somebody who already works with us should not turn
 * into a second record. Choosing them (the list is searchable) fills their name,
 * email, phone and business in; leaving it empty is a new person. The clients
 * are searched on the server and only the chosen one's details are fetched, so
 * the page never carries the client base's email and phone.
 */
export function PrefilledLink({ formKey, service }: { formKey: string; service: string }) {
  const [clientId, setClientId] = useState("");
  const [known, setKnown] = useState<Known | null>(null);
  const [pending, setPending] = useState(false);
  const asked = useRef(0);
  const choose = (id: string) => {
    const mine = ++asked.current;
    setClientId(id);
    setKnown(null);
    setPending(Boolean(id));
    if (!id) return;
    /* Only the newest choice's answer is used; an earlier, slower one is dropped. */
    clientForPrefill(id)
      .then((k) => { if (mine === asked.current) setKnown(k); })
      .catch(() => {})
      .finally(() => { if (mine === asked.current) setPending(false); });
  };
  return (
    <section className="ad__panel adForms__card">
      <h2 className="adForms__h">A pre-filled link for one client</h2>
      <p className="ad__dim">
        The ordinary onboarding link stays blank, and the client picks the service. Use this after a call: type what you already know about the
        {" "}{service} job and send them the link yourself. It works for 14 days.
      </p>
      <div className="ad__f">
        <span className="ad__fl" id="prefill-client-l">Is this an existing client?</span>
        <RemotePick id="prefill-client" kind="clients" value={clientId} onChange={choose} labelledBy="prefill-client-l" placeholder="No, a new person" />
        <small className="ad__dim" role="status">{pending ? "Getting their details…" : "Existing clients keep one record and the same client portal. Search by name, email or phone."}</small>
      </div>
      <Form action={createPrefilledLinkAction} key={`${clientId}:${known ? 1 : 0}`}>
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
