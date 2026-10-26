"use client";

import { KeyRound, Star, Trash2, UserPlus } from "lucide-react";
import { DialogButton } from "./dialog";
import { RowMenu, type RowMenuItem } from "./row-menu";
import { Actions, Checks, Field, Fields, Form, Hidden, Submit } from "./form";
import { addContact, givePortalAccess, makeMainContact, removeContact } from "@/lib/admin/people-actions";

const GETS = [{ value: "review", label: "Approve work" }, { value: "billing", label: "See invoices and receipts" }];

/** "Add a person" on the People tab: a contact first; portal access is a separate, deliberate step. */
export function AddPerson({ clientId, company }: { clientId: string; company: string }) {
  return (
    <DialogButton label="Add a person" title={`Add a person at ${company}`} icon={UserPlus} tone="plain">
      {(close) => (
        <Form action={addContact} onDone={close}>
          <Fields>
            <Hidden name="clientId" value={clientId} />
            <Field name="name" label="Name" required half />
            <Field name="role" label="Role" half placeholder="Marketing lead" />
            <Field name="email" label="Email" type="email" half />
            <Field name="phone" label="Phone" half inputMode="tel" />
          </Fields>
          <Actions><Submit icon={UserPlus}>Add the person</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

function AccessForm({ clientId, name, email, close, again }: { clientId: string; name: string; email: string; close: () => void; again?: boolean }) {
  return (
    <Form action={givePortalAccess} onDone={() => close()}>
      <p className="ad__dim" style={{ margin: "0 0 1rem" }}>
        {again ? `A new invitation replaces the last one sent to ${email}.` : `${name} sees every live project of this client in the portal, signed in as ${email}. Updates and messages always; the rest only if you tick it.`}
      </p>
      <Fields>
        <Hidden name="clientId" value={clientId} /><Hidden name="name" value={name} /><Hidden name="email" value={email} />
        <Checks name="gets" label="They can also" options={GETS} defaultValue={["review"]} />
      </Fields>
      <Actions><Submit icon={KeyRound}>{again ? "Send a new invitation" : "Give portal access"}</Submit></Actions>
    </Form>
  );
}

/** The menu on a contact: make them the main contact, give them the portal, or take them off the list. */
export function PersonMenu({ clientId, at, name, email, access }: { clientId: string; at: number; name: string; email?: string; access: "none" | "invited" | "account" }) {
  const items: RowMenuItem[] = [
    { kind: "dialog", label: "Make main contact", icon: Star, title: `Make ${name} the main contact`, render: (close) => (
      <Form action={makeMainContact} onDone={() => close()}>
        <div className="ad__sure"><p>{email ? `The portal and every email follow the main contact. ${name} takes that place and the current main contact moves to the list. An invitation still waiting for the old address is withdrawn.` : `${name} has no email yet. Add one before they can be the main contact.`}</p></div>
        <Hidden name="clientId" value={clientId} /><Hidden name="at" value={String(at)} /><Hidden name="name" value={name} />
        <Actions><button type="button" className="ad__btn" onClick={close}>Leave it</button><Submit icon={Star}>Make main contact</Submit></Actions>
      </Form>
    ) },
    ...(email && access !== "account" ? [{ kind: "dialog" as const, label: access === "invited" ? "Send the invitation again" : "Give portal access", icon: KeyRound,
      title: access === "invited" ? `Invite ${name} again` : `Portal access for ${name}`,
      render: (close: () => void) => <AccessForm clientId={clientId} name={name} email={email} close={close} again={access === "invited"} /> }] : []),
    { kind: "dialog", label: "Remove from the list", icon: Trash2, tone: "danger", title: `Remove ${name}`, render: (close) => (
      <Form action={removeContact} onDone={() => close()}>
        <div className="ad__sure"><p>{name} comes off this client&apos;s people. Portal access already given is not taken away by this; withdraw it from the project&apos;s team if it should end.</p></div>
        <Hidden name="clientId" value={clientId} /><Hidden name="at" value={String(at)} /><Hidden name="name" value={name} />
        <Actions><button type="button" className="ad__btn" onClick={close}>Leave it</button><Submit tone="danger" icon={Trash2}>Remove</Submit></Actions>
      </Form>
    ) },
  ];
  return <RowMenu items={items} label={name} />;
}
