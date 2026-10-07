"use client";

import { Link2 } from "lucide-react";
import { createPrefilledLinkAction } from "@/lib/forms/prefill-actions";
import { Actions, Field, Fields, Form, Hidden, Submit } from "@/components/admin/form";

/**
 * "Send a pre-filled link": after a call, the studio types what it already
 * knows and gets a one time link to send. The client opens it with those
 * answers filled in, confirms and edits. No personal data is in the address.
 */
export function PrefilledLink({ formKey, service }: { formKey: string; service: string }) {
  return (
    <section className="ad__panel adForms__card">
      <h2 className="adForms__h">A pre-filled link for one client</h2>
      <p className="ad__dim">
        The ordinary onboarding link stays blank, and the client picks the service. Use this after a call: type what you already know about the
        {" "}{service} job and send them the link yourself. It works for 14 days.
      </p>
      <Form action={createPrefilledLinkAction}>
        <Hidden name="form" value={formKey} />
        <Fields>
          <Field name="first_name" label="First name" required half />
          <Field name="last_name" label="Last name" half />
          <Field name="email" label="Email" type="email" required half hint="The saved form is tied to this address." />
          <Field name="phone" label="Phone or WhatsApp" half inputMode="tel" />
          <Field name="company" label="Business name" />
          <Field name="about" label="A line about the job, from the call" hint="Shown to the client under Tell us about your company, and they can change it." />
        </Fields>
        <Actions><Submit icon={Link2}>Make the link</Submit></Actions>
      </Form>
    </section>
  );
}
