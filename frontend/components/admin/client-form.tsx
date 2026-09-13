"use client";

import { Plus, Save } from "lucide-react";
import { SERVICES } from "@/lib/services";
import type { Client } from "@/lib/admin/types";
import { createClient, updateClient } from "@/lib/admin/actions";
import { Actions, Area, Checks, Field, Fields, Form, Hidden, Submit } from "./form";
import { DialogButton } from "./dialog";

const SERVICE_OPTIONS = SERVICES.map((s) => ({ value: s.slug, label: s.short }));

/**
 * One form for adding and for editing.
 *
 * The two differ in exactly three things: which action they post to, what the
 * fields start as, and what the button says. Splitting them into two
 * components would mean two copies of a nine-field form, and the day somebody
 * adds a field to one of them is the day the other stops matching.
 */
export function ClientFields({ client }: { client?: Client }) {
  return (
    <Fields>
      {client ? <Hidden name="id" value={client.id} /> : null}
      <Field name="company" label="Company" required defaultValue={client?.company} half />
      <Field name="name" label="Who you deal with" required defaultValue={client?.name} half />
      <Field name="email" label="Email" type="email" inputMode="email" required defaultValue={client?.email} half />
      <Field name="phone" label="Phone" type="tel" inputMode="tel" defaultValue={client?.phone} half
             placeholder="+234 802 123 4567" />
      <Field name="sector" label="Sector" defaultValue={client?.sector} half
             hint="What business they are in, in your own words." />
      <Checks
        name="services" label="What they buy"
        hint="A client appears under each of these on the Clients screen."
        options={SERVICE_OPTIONS} defaultValue={client?.services ?? []}
      />
      <Area name="notes" label="Notes" defaultValue={client?.notes} rows={3}
            hint="Anything the next person opening this record should know." />
    </Fields>
  );
}

export function AddClient() {
  return (
    <DialogButton label="Add a client" title="A new client" icon={Plus} wide>
      {/* No onDone: createClient redirects to the new client, so the dialog
          goes with the page rather than being closed by hand. */}
      {() => (
        <Form action={createClient}>
          <ClientFields />
          <Actions>
            <Submit icon={Plus}>Add them</Submit>
          </Actions>
        </Form>
      )}
    </DialogButton>
  );
}

export function EditClient({ client }: { client: Client }) {
  return (
    <DialogButton label="Edit" title={`Edit ${client.company}`} tone="plain" wide>
      {(close) => (
        <Form action={updateClient} onDone={() => close()}>
          <ClientFields client={client} />
          <Actions>
            <Submit icon={Save}>Save</Submit>
          </Actions>
        </Form>
      )}
    </DialogButton>
  );
}
