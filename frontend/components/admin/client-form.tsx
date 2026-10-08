"use client";

import { Combine, Plus, Save } from "lucide-react";
import { SERVICES } from "@/lib/services";
import type { Client } from "@/lib/admin/types";
import { createClient, mergeClient, updateClient } from "@/lib/admin/actions";
import { Actions, Area, Checks, Field, Fields, Form, Hidden, Submit } from "./form";
import { RemoteSelect } from "./remote-pick";
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
      <Field name="tags" label="Tags" defaultValue={client?.tags?.join(", ")} half
             placeholder="retainer, referral" hint="Your own labels, comma separated. Searchable on the Clients screen." />
      <Area name="contacts" label="Other contacts" rows={3}
            defaultValue={client?.contacts?.map((x) => [x.name, x.role, x.email, x.phone].map((v) => v ?? "").join(", ").replace(/(, )+$/, "")).join("\n")}
            placeholder={"Ada Obi, marketing lead, ada@company.ng, +234 803 000 0000"}
            hint="One person per line: name, role, email, phone. Only the name is needed." />
      <Area name="notes" label="Notes" defaultValue={client?.notes} rows={3}
            hint="Anything the next person opening this record should know." />
    </Fields>
  );
}

export function AddClient({ dataTour, startOpen }: { dataTour?: string; startOpen?: boolean } = {}) {
  return (
    <DialogButton label="Add a client" title="A new client" icon={Plus} wide dataTour={dataTour} startOpen={startOpen}>
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

/**
 * Fold a duplicate into this client.
 *
 * The likely duplicates (same email or phone) are listed first and marked,
 * but any client can be chosen, because the commonest duplicate is the same
 * business entered twice under two different addresses.
 */
export function MergeClient({ keepId, keepName, likely, hasOthers }: {
  keepId: string; keepName: string;
  /** The records that share this one's email or phone, offered first. Every other client is found by search. */
  likely: { id: string; company: string }[];
  hasOthers: boolean;
}) {
  if (!hasOthers) return null;
  return (
    <DialogButton label="Merge a duplicate" title={`Fold a duplicate into ${keepName}`} icon={Combine} tone="plain">
      {(close) => (
        <Form action={mergeClient} onDone={() => close()}
              confirm={`Move everything from the chosen record into ${keepName} and archive the duplicate? This cannot be undone from here.`}>
          <Hidden name="keepId" value={keepId} />
          <Fields>
            <RemoteSelect name="dupeId" label="The duplicate" required kind="clients" scope={{ exclude: keepId }}
                          placeholder="Pick the record to fold in" hint="Search by name, email or phone."
                          lead={likely.map((x) => ({ value: x.id, label: `${x.company} (same email or phone)` }))} />
          </Fields>
          <p className="ad__dim" style={{ fontSize: ".86rem", lineHeight: 1.6 }}>
            Its projects, invoices, estimates, credit, messages, tickets and forms move here. Its services,
            tags and notes are added; its contact joins the other contacts. {keepName}&apos;s own name,
            email and phone stay as they are. The duplicate is archived with a note saying where it went.
          </p>
          <Actions>
            <Submit icon={Combine}>Merge it</Submit>
          </Actions>
        </Form>
      )}
    </DialogButton>
  );
}
