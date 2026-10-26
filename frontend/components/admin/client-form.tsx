"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Combine, Plus, Save } from "lucide-react";
import { findClientMatch } from "@/lib/admin/client-deck-actions";
import { SERVICES } from "@/lib/services";
import type { Client } from "@/lib/admin/types";
import { createClient, mergeClient, updateClient } from "@/lib/admin/actions";
import { Actions, Area, Checks, Field, Fields, Form, Hidden, Submit } from "./form";
import { RemoteSelect } from "./remote-pick";
import { DialogButton } from "./dialog";
import { useAdminRole } from "./shell";
import { can } from "@/lib/admin/permissions";

const SERVICE_OPTIONS = SERVICES.map((s) => ({ value: s.slug, label: s.short }));

/**
 * One form for adding and for editing.
 *
 * The two differ in exactly three things: which action they post to, what the
 * fields start as, and what the button says. Splitting them into two
 * components would mean two copies of a nine-field form, and the day somebody
 * adds a field to one of them is the day the other stops matching.
 */
export function ClientFields({ client, email, onEmail, phone, onPhone }: {
  client?: Client;
  /** Controlled email and phone, for the sheet that checks for a duplicate as they are typed. */
  email?: string; onEmail?: (v: string) => void; phone?: string; onPhone?: (v: string) => void;
}) {
  return (
    <Fields>
      {client ? <Hidden name="id" value={client.id} /> : null}
      <Field name="company" label="Company" required defaultValue={client?.company} half />
      <Field name="name" label="Who you deal with" required defaultValue={client?.name} half />
      <Field name="email" label="Email" type="email" inputMode="email" required defaultValue={client?.email} half
             {...(onEmail ? { value: email ?? "", onChange: (e) => onEmail(e.target.value) } : {})} />
      <Field name="phone" label="Phone" type="tel" inputMode="tel" defaultValue={client?.phone} half
             placeholder="+234 802 123 4567"
             {...(onPhone ? { value: phone ?? "", onChange: (e) => onPhone(e.target.value) } : {})} />
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

export function AddClient({ dataTour, startOpen, label = "Add a client" }: { dataTour?: string; startOpen?: boolean; label?: string } = {}) {
  /* Adding a client is Admin's call (the "intake" area). */
  if (!can(useAdminRole(), "intake")) return null;
  return (
    <DialogButton label={label} title="Add a client" icon={Plus} wide dataTour={dataTour} startOpen={startOpen}>
      {/* No onDone: createClient redirects to the new client, so the sheet
          goes with the page rather than being closed by hand. */}
      {() => <AddClientBody />}
    </DialogButton>
  );
}

/**
 * One record per person. The email and phone are checked against every client,
 * archived ones included, as they are typed: a match is shown with a link to
 * its record and Save is held back with the reason beside it. The server
 * refuses a duplicate again on save, so this is a courtesy, never the lock.
 */
function AddClientBody() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [match, setMatch] = useState<Awaited<ReturnType<typeof findClientMatch>>>(null);
  useEffect(() => {
    let live = true;
    const t = window.setTimeout(() => {
      findClientMatch(email, phone).then((m) => { if (live) setMatch(m); }, () => { if (live) setMatch(null); });
    }, 350);
    return () => { live = false; window.clearTimeout(t); };
  }, [email, phone]);
  return (
    <Form action={createClient}>
      <p className="ad__dim" style={{ margin: "0 0 .75rem" }}>
        We check the email and phone first. A returning client keeps one record and one portal, so their history stays in one place.
      </p>
      <ClientFields email={email} onEmail={setEmail} phone={phone} onPhone={setPhone} />
      {match ? (
        <div className="adNote" role="status" style={{ marginTop: ".75rem" }}>
          <span className="adNote__ic" aria-hidden="true"><AlertTriangle /></span>
          <div>
            <b>{match.company} already uses these details</b>
            <p>{match.name}{match.archived ? ", archived. Restore them from the Archived tab." : ". Open their record and start a new project there."}</p>
            <Link href={`/admin/clients/${match.id}`}>Open {match.company}</Link>
          </div>
        </div>
      ) : null}
      <Actions>
        <Submit icon={Plus} disabled={Boolean(match)}>Save the client</Submit>
        {match ? <p className="adWhy">This client already exists. Open their record instead.</p> : null}
      </Actions>
    </Form>
  );
}

/** The edit form on its own, for a menu or a sheet that opens it. */
export function EditClientBody({ client, close }: { client: Client; close: () => void }) {
  return (
    <Form action={updateClient} onDone={() => close()}>
      <ClientFields client={client} />
      <Actions>
        <Submit icon={Save}>Save changes</Submit>
      </Actions>
    </Form>
  );
}

export function EditClient({ client }: { client: Client }) {
  return (
    <DialogButton label="Edit" title={`Edit ${client.company}`} tone="plain" wide>
      {(close) => <EditClientBody client={client} close={close} />}
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
export function MergeBody({ keepId, keepName, likely, close }: {
  keepId: string; keepName: string; likely: { id: string; company: string }[]; close: () => void;
}) {
  return (
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
  );
}

export function MergeClient({ keepId, keepName, likely, hasOthers }: {
  keepId: string; keepName: string;
  /** The records that share this one's email or phone, offered first. Every other client is found by search. */
  likely: { id: string; company: string }[];
  hasOthers: boolean;
}) {
  if (!hasOthers) return null;
  return (
    <DialogButton label="Merge a duplicate" title={`Fold a duplicate into ${keepName}`} icon={Combine} tone="plain">
      {(close) => <MergeBody keepId={keepId} keepName={keepName} likely={likely} close={close} />}
    </DialogButton>
  );
}
